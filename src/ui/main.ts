type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface JobSchedule {
  times: string[];
  days: Weekday[];
  intervalMinutes?: number;
}

interface Job {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  enabled: boolean;
  schedule: JobSchedule;
  createdBy: "ui" | "api";
  lastRunAt?: string;
  lastStatus?: "ok" | "fail" | "running";
}

interface JobRun {
  id: string;
  jobId: string;
  jobName: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  status: "running" | "ok" | "fail" | "killed";
  stdout: string;
  stderr: string;
  triggeredBy: "schedule" | "ui" | "api";
}

interface State {
  jobs: Job[];
  runs: JobRun[];
  apiPort: number;
  platform: string;
  version: string;
}

declare global {
  interface Window {
    cadence: {
      getState: () => Promise<State>;
      createJob: (input: unknown) => Promise<{ job: Job }>;
      updateJob: (
        id: string,
        input: unknown,
      ) => Promise<{ job: Job } | { error: string }>;
      deleteJob: (id: string) => Promise<{ ok: boolean }>;
      runJob: (id: string) => Promise<JobRun | { error: string }>;
      onChanged: (cb: () => void) => () => void;
      hide: () => Promise<void>;
      fitHeight: (height: number) => Promise<void>;
    };
  }
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let state: State = { jobs: [], runs: [], apiPort: 0, platform: "", version: "" };
/** Job ids the user has expanded; cards start collapsed. */
const expandedJobs = new Set<string>();

const jobsView = document.getElementById("view-jobs")!;
const historyView = document.getElementById("view-history")!;
const apiLine = document.getElementById("api-line")!;
const form = document.getElementById("job-form") as HTMLFormElement;
const formHint = document.getElementById("form-hint")!;

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.tab}`)?.classList.add("active");
    requestFit();
  });
});

function requestFit(): void {
  requestAnimationFrame(() => {
    const app = document.getElementById("app");
    if (!app) return;
    const height = Math.ceil(app.getBoundingClientRect().height);
    void window.cadence.fitHeight(height);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formHint.textContent = "";
  const name = (document.getElementById("f-name") as HTMLInputElement).value;
  const command = (document.getElementById("f-command") as HTMLTextAreaElement)
    .value;
  const cwd = (document.getElementById("f-cwd") as HTMLInputElement).value;
  const timesRaw = (document.getElementById("f-times") as HTMLInputElement)
    .value;
  const intervalRaw = (
    document.getElementById("f-interval") as HTMLInputElement
  ).value.trim();
  const enabled = (document.getElementById("f-enabled") as HTMLInputElement)
    .checked;
  const times = timesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const days = [
    ...document.querySelectorAll<HTMLInputElement>(".days input:checked"),
  ].map((el) => Number(el.value) as Weekday);
  const intervalMinutes = intervalRaw ? Number(intervalRaw) : undefined;
  if (intervalMinutes == null && times.length === 0) {
    formHint.textContent = "Set times or an interval.";
    return;
  }

  try {
    await window.cadence.createJob({
      name,
      command,
      cwd: cwd || undefined,
      enabled,
      schedule: {
        times,
        days,
        ...(intervalMinutes != null ? { intervalMinutes } : {}),
      },
    });
    form.reset();
    (document.getElementById("f-enabled") as HTMLInputElement).checked = true;
    document
      .querySelectorAll<HTMLInputElement>(".days input")
      .forEach((el) => {
        el.checked = ["1", "2", "3", "4", "5"].includes(el.value);
      });
    formHint.textContent = "Saved.";
    document.querySelector<HTMLButtonElement>('.tab[data-tab="jobs"]')?.click();
    await refresh();
  } catch (err) {
    formHint.textContent = err instanceof Error ? err.message : String(err);
  }
});

function scheduleLabel(job: Job): string {
  if (job.schedule.intervalMinutes != null) {
    return `every ${job.schedule.intervalMinutes} min`;
  }
  const days =
    job.schedule.days.length === 0
      ? "every day"
      : job.schedule.days.map((d) => DAY_NAMES[d]).join(" ");
  return `${job.schedule.times.join(", ")} · ${days}`;
}

function renderJobs(): void {
  if (!state.jobs.length) {
    jobsView.innerHTML = `<div class="empty">No jobs yet. Use New, or POST to the local API.</div>`;
    return;
  }
  // Drop expansion for jobs that no longer exist.
  for (const id of [...expandedJobs]) {
    if (!state.jobs.some((j) => j.id === id)) expandedJobs.delete(id);
  }

  jobsView.innerHTML = state.jobs
    .map((job) => {
      const status = job.lastStatus
        ? `<span class="badge ${job.lastStatus}">${job.lastStatus}</span>`
        : `<span class="badge">${job.enabled ? "armed" : "paused"}</span>`;
      const open = expandedJobs.has(job.id);
      const sched = escapeHtml(scheduleLabel(job));
      return `<article class="card job-card${open ? " open" : " collapsed"}" data-id="${job.id}">
        <button type="button" class="card-head job-toggle" aria-expanded="${open ? "true" : "false"}">
          <span class="chev" aria-hidden="true"></span>
          <span class="job-head-main">
            <span class="job-title">${escapeHtml(job.name)}</span>
            <span class="job-sched">${sched}</span>
          </span>
          ${status}
        </button>
        <div class="job-body">
          <div class="meta">
            <div class="mono">${escapeHtml(job.command)}</div>
            <div>${job.cwd ? escapeHtml(job.cwd) : "cwd: home"} · via ${job.createdBy}</div>
          </div>
          <div class="row-actions">
            <button class="ghost" data-act="toggle">${job.enabled ? "Disable" : "Enable"}</button>
            <button class="primary" data-act="run">Run now</button>
            <button class="danger" data-act="delete">Delete</button>
          </div>
        </div>
      </article>`;
    })
    .join("");

  jobsView.querySelectorAll<HTMLElement>(".job-card").forEach((card) => {
    const id = card.dataset.id!;
    const job = state.jobs.find((j) => j.id === id);
    card.querySelector(".job-toggle")?.addEventListener("click", () => {
      if (expandedJobs.has(id)) expandedJobs.delete(id);
      else expandedJobs.add(id);
      renderJobs();
      requestFit();
    });
    card.querySelectorAll<HTMLButtonElement>(".row-actions button").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!job) return;
        const act = btn.getAttribute("data-act");
        if (act === "run") {
          const ok = await askConfirm({
            title: "Run now?",
            message: `Run “${job.name}” immediately?`,
            confirmLabel: "Run now",
            danger: false,
          });
          if (!ok) return;
          await window.cadence.runJob(id);
        }
        if (act === "delete") {
          const ok = await askConfirm({
            title: "Delete job?",
            message: `Delete “${job.name}”? This cannot be undone. Past runs stay in History.`,
            confirmLabel: "Delete",
            danger: true,
          });
          if (!ok) return;
          await window.cadence.deleteJob(id);
        }
        if (act === "toggle") {
          const enabling = !job.enabled;
          const ok = await askConfirm({
            title: enabling ? "Enable job?" : "Disable job?",
            message: enabling
              ? `Enable “${job.name}” so Cadence can fire it on schedule?`
              : `Disable “${job.name}”? It will stay in the list but will not run on schedule.`,
            confirmLabel: enabling ? "Enable" : "Disable",
            danger: false,
          });
          if (!ok) return;
          await window.cadence.updateJob(id, { enabled: enabling });
        }
        await refresh();
      });
    });
  });
}

function askConfirm(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
}): Promise<boolean> {
  const root = document.getElementById("confirm")!;
  const title = document.getElementById("confirm-title")!;
  const message = document.getElementById("confirm-message")!;
  const cancel = document.getElementById("confirm-cancel") as HTMLButtonElement;
  const ok = document.getElementById("confirm-ok") as HTMLButtonElement;

  title.textContent = opts.title;
  message.textContent = opts.message;
  ok.textContent = opts.confirmLabel;
  ok.className = opts.danger ? "danger" : "primary";
  root.classList.remove("hidden");
  ok.focus();

  return new Promise((resolve) => {
    const finish = (value: boolean) => {
      root.classList.add("hidden");
      cancel.removeEventListener("click", onCancel);
      ok.removeEventListener("click", onOk);
      root.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onCancel = () => finish(false);
    const onOk = () => finish(true);
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === root) finish(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    };
    cancel.addEventListener("click", onCancel);
    ok.addEventListener("click", onOk);
    root.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

function renderHistory(): void {
  if (!state.runs.length) {
    historyView.innerHTML = `<div class="empty">No runs yet.</div>`;
    return;
  }
  historyView.innerHTML = state.runs
    .map((run) => {
      const when = new Date(run.startedAt).toLocaleString();
      const body = [run.stdout, run.stderr].filter(Boolean).join("\n---\n");
      return `<article class="card">
        <div class="card-head">
          <h3>${escapeHtml(run.jobName)}</h3>
          <span class="badge ${run.status}">${run.status}${
            run.exitCode != null ? ` · ${run.exitCode}` : ""
          }</span>
        </div>
        <div class="meta">${escapeHtml(when)} · ${run.triggeredBy}</div>
        ${body ? `<pre class="mono">${escapeHtml(body)}</pre>` : ""}
      </article>`;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function refresh(): Promise<void> {
  state = await window.cadence.getState();
  apiLine.textContent = `v${state.version} · API http://127.0.0.1:${state.apiPort} · ${state.platform}`;
  renderJobs();
  renderHistory();
  requestFit();
}

void refresh();
window.cadence.onChanged(() => {
  void refresh();
});
window.addEventListener("load", () => requestFit());
