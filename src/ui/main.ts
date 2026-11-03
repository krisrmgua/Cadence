type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface JobSchedule {
  times: string[];
  days: Weekday[];
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
    };
  }
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let state: State = { jobs: [], runs: [], apiPort: 0, platform: "" };

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
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formHint.textContent = "";
  const name = (document.getElementById("f-name") as HTMLInputElement).value;
  const command = (document.getElementById("f-command") as HTMLTextAreaElement)
    .value;
  const cwd = (document.getElementById("f-cwd") as HTMLInputElement).value;
  const timesRaw = (document.getElementById("f-times") as HTMLInputElement)
    .value;
  const enabled = (document.getElementById("f-enabled") as HTMLInputElement)
    .checked;
  const times = timesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const days = [
    ...document.querySelectorAll<HTMLInputElement>(".days input:checked"),
  ].map((el) => Number(el.value) as Weekday);

  try {
    await window.cadence.createJob({
      name,
      command,
      cwd: cwd || undefined,
      enabled,
      schedule: { times, days },
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
  jobsView.innerHTML = state.jobs
    .map((job) => {
      const status = job.lastStatus
        ? `<span class="badge ${job.lastStatus}">${job.lastStatus}</span>`
        : `<span class="badge">${job.enabled ? "armed" : "paused"}</span>`;
      return `<article class="card" data-id="${job.id}">
        <div class="card-head">
          <h3>${escapeHtml(job.name)}</h3>
          ${status}
        </div>
        <div class="meta">
          <div class="mono">${escapeHtml(job.command)}</div>
          <div>${escapeHtml(scheduleLabel(job))}</div>
          <div>${job.cwd ? escapeHtml(job.cwd) : "cwd: home"} · via ${job.createdBy}</div>
        </div>
        <div class="row-actions">
          <button class="ghost" data-act="toggle">${job.enabled ? "Disable" : "Enable"}</button>
          <button class="primary" data-act="run">Run now</button>
          <button class="danger" data-act="delete">Delete</button>
        </div>
      </article>`;
    })
    .join("");

  jobsView.querySelectorAll<HTMLElement>(".card").forEach((card) => {
    const id = card.dataset.id!;
    card.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-act");
        if (act === "run") await window.cadence.runJob(id);
        if (act === "delete") await window.cadence.deleteJob(id);
        if (act === "toggle") {
          const job = state.jobs.find((j) => j.id === id);
          if (job) {
            await window.cadence.updateJob(id, { enabled: !job.enabled });
          }
        }
        await refresh();
      });
    });
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
  apiLine.textContent = `API http://127.0.0.1:${state.apiPort} · ${state.platform}`;
  renderJobs();
  renderHistory();
}

void refresh();
window.cadence.onChanged(() => {
  void refresh();
});
