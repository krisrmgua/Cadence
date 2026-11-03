import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  shell,
  screen,
} from "electron";
import path from "node:path";
import { Store } from "./store";
import { Runner } from "./runner";
import { Scheduler } from "./scheduler";
import { LocalApi } from "./api";
import {
  createTrayIcon,
  trayHealthFromJobs,
  type TrayHealth,
} from "./trayIcon";
import type { CreateJobInput, UpdateJobInput } from "./types";

let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
let store: Store;
let runner: Runner;
let scheduler: Scheduler;
let api: LocalApi;
let apiPort = 3927;
let trayHealth: TrayHealth = "ok";

const isDev = process.env.CADENCE_DEV === "1";

function panelUrl(): string {
  if (isDev) return "http://127.0.0.1:5173";
  return `file://${path.join(app.getAppPath(), "dist", "index.html")}`;
}

const PANEL_WIDTH = 420;
const PANEL_MIN_HEIGHT = 140;
const PANEL_PAD = 8;

function createPanel(): BrowserWindow {
  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_MIN_HEIGHT,
    show: false,
    frame: false,
    resizable: true,
    useContentSize: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: "#0b1220",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  void win.loadURL(panelUrl());

  win.on("blur", () => {
    if (!isDev) win.hide();
  });

  return win;
}

function fitPanelToContent(contentHeight: number): void {
  if (!panel) return;
  const display = screen.getDisplayNearestPoint(
    tray ? { x: tray.getBounds().x, y: tray.getBounds().y } : screen.getCursorScreenPoint(),
  );
  const maxH = Math.floor(display.workArea.height * 0.85);
  const height = Math.min(
    Math.max(Math.ceil(contentHeight) + PANEL_PAD, PANEL_MIN_HEIGHT),
    maxH,
  );
  panel.setContentSize(PANEL_WIDTH, height);
  if (panel.isVisible()) positionPanel(panel);
}

function positionPanel(win: BrowserWindow): void {
  if (!tray) return;
  const trayBounds = tray.getBounds();
  const winBounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y =
    process.platform === "darwin"
      ? Math.round(trayBounds.y + trayBounds.height + 4)
      : Math.round(trayBounds.y - winBounds.height - 4);

  const wa = display.workArea;
  x = Math.min(Math.max(x, wa.x + 8), wa.x + wa.width - winBounds.width - 8);
  y = Math.min(Math.max(y, wa.y + 8), wa.y + wa.height - winBounds.height - 8);
  win.setPosition(x, y, false);
}

function togglePanel(): void {
  if (!panel) panel = createPanel();
  if (panel.isVisible()) {
    panel.hide();
    return;
  }
  positionPanel(panel);
  panel.show();
  panel.focus();
}

function broadcast(): void {
  refreshTray();
  panel?.webContents.send("cadence:changed");
}

function refreshTray(): void {
  if (!tray || !store) return;
  const next = trayHealthFromJobs(store.listJobs());
  if (next !== trayHealth) {
    trayHealth = next;
    tray.setImage(createTrayIcon(trayHealth));
  }
  const status = trayHealth === "fail" ? "failures" : "ok";
  tray.setToolTip(`Cadence · ${status} · API :${apiPort}`);
}

function wireIpc(): void {
  ipcMain.handle("cadence:getState", () => ({
    jobs: store.listJobs(),
    runs: store.listRuns(80),
    apiPort,
    platform: process.platform,
    version: app.getVersion(),
  }));

  ipcMain.handle("cadence:createJob", (_e, input: CreateJobInput) => {
    const job = store.createJob({ ...input, createdBy: "ui" });
    broadcast();
    return { job };
  });

  ipcMain.handle(
    "cadence:updateJob",
    (_e, id: string, input: UpdateJobInput) => {
      const job = store.updateJob(id, input);
      broadcast();
      return job ? { job } : { error: "not found" };
    },
  );

  ipcMain.handle("cadence:deleteJob", (_e, id: string) => {
    const ok = store.deleteJob(id);
    broadcast();
    return { ok };
  });

  ipcMain.handle("cadence:runJob", async (_e, id: string) => {
    const result = await runner.run(id, "ui");
    broadcast();
    return result;
  });

  ipcMain.handle("cadence:hide", () => {
    panel?.hide();
  });

  ipcMain.handle("cadence:openExternal", (_e, url: string) => {
    void shell.openExternal(url);
  });

  ipcMain.handle("cadence:fitHeight", (_e, height: number) => {
    if (typeof height === "number" && Number.isFinite(height)) {
      fitPanelToContent(height);
    }
  });
}

async function boot(): Promise<void> {
  store = new Store();
  runner = new Runner(store);
  scheduler = new Scheduler(store, runner);
  api = new LocalApi(store, runner);

  store.onChange(() => broadcast());

  apiPort = await api.start(store.getApiPort());
  scheduler.start();

  trayHealth = trayHealthFromJobs(store.listJobs());
  tray = new Tray(createTrayIcon(trayHealth));
  refreshTray();
  tray.on("click", () => togglePanel());
  tray.on("right-click", () => {
    const menu = Menu.buildFromTemplate([
      { label: "Open Cadence", click: () => togglePanel() },
      {
        label:
          trayHealth === "fail"
            ? "Status: failures"
            : "Status: ok",
        enabled: false,
      },
      { label: `API http://127.0.0.1:${apiPort}`, enabled: false },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray?.popUpContextMenu(menu);
  });

  panel = createPanel();
  wireIpc();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    void boot();
  });

  app.on("second-instance", () => {
    togglePanel();
  });

  app.on("before-quit", () => {
    scheduler?.stop();
    api?.stop();
  });

  // Tray app: stay alive with no windows.
  app.on("window-all-closed", () => {});
}
