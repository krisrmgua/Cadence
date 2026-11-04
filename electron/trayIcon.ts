import { nativeImage } from "electron";
import { join } from "node:path";
import type { Job } from "./types";

export type TrayHealth = "ok" | "fail";

/** Only enabled jobs contribute to the menu-bar failure indicator. */
export function trayHealthFromJobs(jobs: Job[]): TrayHealth {
  return jobs.some(job => job.enabled && job.lastStatus === "fail") ? "fail" : "ok";
}

/** Generated Timeflow artwork, rasterized at 1x and 2x for an 18pt menu-bar slot. */
export function createTrayIcon(health: TrayHealth): Electron.NativeImage {
  const name = health === "fail" ? "failure" : "healthy";
  const artwork = nativeImage.createFromPath(join(__dirname, "../assets/tray", `timeflow-${name}.png`));
  if (artwork.isEmpty()) throw new Error(`Missing Timeflow tray artwork: ${name}`);
  const icon = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const size = 18 * scaleFactor;
    icon.addRepresentation({ scaleFactor, buffer: artwork.resize({ width: size, height: size, quality: "best" }).toPNG() });
  }
  icon.setTemplateImage(false);
  return icon;
}
