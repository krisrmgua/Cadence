type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface JobSchedule {
  times: string[];
  days: Weekday[];
  intervalMinutes?: number;
  timezone?: string;
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

const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday-first, so the sentence reads in calendar order. */
const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

let state: State = { jobs: [], runs: [], apiPort: 0, platform: "", version: "" };
/** Job ids the user has expanded; cards start collapsed. */
const expandedJobs = new Set<string>();

const jobsView = document.getElementById("view-jobs")!;
const historyView = document.getElementById("view-history")!;
const apiLine = document.getElementById("api-line")!;
const form = document.getElementById("job-form") as HTMLFormElement;
const formHint = document.getElementById("form-hint")!;
const formSave = document.getElementById("form-save") as HTMLButtonElement;
const formCancel = document.getElementById("form-cancel") as HTMLButtonElement;
const scheduleBlurb = document.getElementById("schedule-blurb")!;
const tabNew = document.getElementById("tab-new")!;
/** Set while the New form is editing an existing job. */
let editingId: string | null = null;

function showTab(tab: string): void {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", (t as HTMLElement).dataset.tab === tab);
  });
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${tab}`)?.classList.add("active");
  requestFit();
}

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab!));
});

function requestFit(): void {
  requestAnimationFrame(() => {
    const app = document.getElementById("app");
    if (!app) return;
    const height = Math.ceil(document.querySelector("header")!.getBoundingClientRect().height + document.querySelector("main")!.scrollHeight);
    void window.cadence.fitHeight(height);
  });
}

function weekdayInputs(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(".days input")];
}

let editorStep = 0;
let scheduleMode: "interval" | "times" = "interval";
let customInterval = false;
let saving = false;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const intervalUnit = document.getElementById("f-interval-unit") as HTMLSelectElement;
const timeList = document.getElementById("time-list")!;
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function setTimes(times: string[]): void {
  timeList.replaceChildren();
  (times.length ? times : ["09:00"]).forEach(addTime);
}

function addTime(value = "09:00"): void {
  const row = document.createElement("div");
  row.className = "time-row";
  const time = document.createElement("input");
  time.type = "time";
  time.value = value;
  time.setAttribute("aria-label", "Run time");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost remove-time";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove run time ${value}`);
  remove.addEventListener("click", () => {
    if (timeList.children.length === 1) { time.value = ""; time.focus(); }
    else row.remove();
    refreshScheduleBlurb();
  });
  row.append(time, remove);
  timeList.append(row);
  refreshScheduleBlurb();
}

function readTimes(): string[] {
  return [...new Set([...timeList.querySelectorAll<HTMLInputElement>("input")].map(el => el.value))].sort();
}

function selectedDays(): Weekday[] {
  return weekdayInputs().filter(el => el.checked).map(el => Number(el.value) as Weekday);
}

function intervalMinutes(): number {
  const raw = input("f-interval").valueAsNumber;
  if (!Number.isSafeInteger(raw) || raw < 1) return NaN;
  const minutes = raw * (intervalUnit.value === "hours" ? 60 : 1);
  return Number.isSafeInteger(minutes) ? minutes : NaN;
}

function setIntervalMinutes(minutes: number): void {
  intervalUnit.value = minutes % 60 === 0 ? "hours" : "minutes";
  input("f-interval").value = String(minutes % 60 === 0 ? minutes / 60 : minutes);
}

function resetFormForNew(): void {
  editingId = null;
  form.reset();
  scheduleMode = "interval";
  customInterval = false;
  setIntervalMinutes(60);
  setTimes(["09:00"]);
  tabNew.textContent = "New";
  formHint.textContent = "";
  showEditorStep(0);
}

function openEditor(job: Job): void {
  editingId = job.id;
  input("f-name").value = job.name;
  (document.getElementById("f-command") as HTMLTextAreaElement).value = job.command;
  input("f-cwd").value = job.cwd ?? "";
  scheduleMode = job.schedule.intervalMinutes != null ? "interval" : "times";
  setIntervalMinutes(job.schedule.intervalMinutes ?? 60);
  customInterval = ![5, 15, 30, 60, 360].includes(job.schedule.intervalMinutes ?? 60);
  setTimes(job.schedule.times);
  weekdayInputs().forEach(el => { el.checked = !job.schedule.days.length || job.schedule.days.includes(Number(el.value) as Weekday); });
  input("f-enabled").checked = job.enabled;
  tabNew.textContent = "Edit";
  formHint.textContent = "";
  showTab("new");
  showEditorStep(1);
}

function setError(message: string, target?: HTMLElement): false {
  formHint.textContent = message;
  target?.focus();
  requestFit();
  return false;
}

function validateJob(): boolean {
  if (!input("f-name").value.trim()) return setError("Give the job a name.", input("f-name"));
  const command = document.getElementById("f-command") as HTMLTextAreaElement;
  if (!command.value.trim()) return setError("Enter the command to run.", command);
  return true;
}

function validateSchedule(): boolean {
  if (scheduleMode === "interval") {
    if (!Number.isSafeInteger(intervalMinutes()) || intervalMinutes() < 1) return setError("Use a positive whole number of minutes or hours.", input("f-interval"));
  } else {
    if (!selectedDays().length) return setError("Choose at least one day, or select Every day.", weekdayInputs()[0]);
    if (!readTimes().length || readTimes().some(t => !validTime(t))) return setError("Choose a valid time for each run.", timeList.querySelector("input")!);
  }
  return true;
}

function currentSchedule(): JobSchedule {
  // Submit only the chosen mode: a hidden interval must never override chosen clock times.
  const schedule: JobSchedule = scheduleMode === "interval"
    ? { times: [], days: [], intervalMinutes: intervalMinutes() }
    : { times: readTimes(), days: selectedDays().length === 7 ? [] : selectedDays() };
  const existing = state.jobs.find(j => j.id === editingId);
  if (existing?.schedule.timezone) schedule.timezone = existing.schedule.timezone;
  return schedule;
}

function scheduleSentence(): string {
  if (scheduleMode === "interval") {
    const minutes = intervalMinutes();
    if (!Number.isSafeInteger(minutes) || minutes < 1) return "Choose a repeat interval.";
    return `${minutes === 60 ? "Every hour" : intervalPhrase(minutes).replace(/^e/, "E")}, every day.`;
  }
  if (!selectedDays().length) return "Choose the days to run.";
  const times = readTimes();
  if (times.some(t => !validTime(t))) return "Choose the run times.";
  return describeWhen(times, selectedDays(), undefined).line.replace(/^Will run /, "").replace(/^./, c => c.toUpperCase());
}

function refreshScheduleBlurb(): void {
  scheduleBlurb.textContent = scheduleSentence();
  document.getElementById("interval-controls")!.hidden = scheduleMode !== "interval";
  document.getElementById("times-controls")!.hidden = scheduleMode !== "times";
  for (const mode of ["interval", "times"]) {
    document.getElementById(`${mode}-choice`)!.classList.toggle("selected", scheduleMode === mode);
    const radio = form.querySelector<HTMLInputElement>(`[name="schedule-mode"][value="${mode}"]`)!;
    radio.checked = scheduleMode === mode;
  }
  document.querySelectorAll<HTMLButtonElement>("[data-interval]").forEach(button => {
    const selected = button.dataset.interval === "custom" ? customInterval : !customInterval && Number(button.dataset.interval) === intervalMinutes();
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  for (const option of intervalUnit.options) option.text = option.value === "hours" ? (input("f-interval").value === "1" ? "hour" : "hours") : (input("f-interval").value === "1" ? "minute" : "minutes");
  const days = selectedDays();
  document.querySelectorAll<HTMLButtonElement>("[data-days]").forEach(button => {
    const expected = button.dataset.days === "all" ? [0,1,2,3,4,5,6] : button.dataset.days === "weekdays" ? [1,2,3,4,5] : [0,6];
    const selected = days.length === expected.length && expected.every(d => days.includes(d as Weekday));
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("review-schedule")!.textContent = scheduleSentence();
  document.getElementById("review-enabled")!.textContent = input("f-enabled").checked ? "Enabled" : "Paused — will not run until enabled";
  requestFit();
}

function showEditorStep(step: number, focus = false): void {
  editorStep = step;
  ["job", "schedule", "review"].forEach((name, i) => { document.getElementById(`step-${name}`)!.hidden = i !== step; });
  document.getElementById("job-summary")!.hidden = step === 0;
  document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(button => {
    const index = Number(button.dataset.step);
    button.classList.toggle("active", index === step);
    button.classList.toggle("complete", index < step);
    if (index === step) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("summary-name")!.textContent = input("f-name").value || "Untitled job";
  const command = (document.getElementById("f-command") as HTMLTextAreaElement).value;
  document.getElementById("summary-command")!.textContent = command;
  document.getElementById("summary-cwd")!.textContent = input("f-cwd").value || "Working directory: home";
  document.getElementById("review-command")!.textContent = command;
  document.getElementById("review-cwd")!.textContent = input("f-cwd").value || "Home directory";
  document.getElementById("review-timezone")!.textContent = scheduleMode === "interval" ? "Continuous interval; not tied to clock times" : `${localZone} · system local time`;
  formSave.textContent = step === 0 ? "Continue to schedule" : step === 1 ? "Continue to review" : editingId ? "Save changes" : "Save job";
  formHint.textContent = "";
  refreshScheduleBlurb();
  document.querySelector("main")!.scrollTop = 0;
  if (focus) document.getElementById(`${["job", "schedule", "review"][step]}-heading`)?.focus();
}

function goToStep(step: number): void {
  if (step > 0 && !validateJob()) { showEditorStep(0); validateJob(); return; }
  if (step > 1 && !validateSchedule()) { showEditorStep(1); validateSchedule(); return; }
  showEditorStep(step, true);
}

document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(button => button.addEventListener("click", () => goToStep(Number(button.dataset.step))));
document.getElementById("edit-details")!.addEventListener("click", () => showEditorStep(0, true));
document.getElementById("edit-schedule")!.addEventListener("click", () => showEditorStep(1, true));
formCancel.addEventListener("click", () => { resetFormForNew(); showTab("jobs"); });
document.getElementById("add-time")!.addEventListener("click", () => { addTime("17:30"); timeList.querySelector<HTMLInputElement>(".time-row:last-child input")?.focus(); });
form.querySelectorAll<HTMLInputElement>("[name='schedule-mode']").forEach(radio => radio.addEventListener("change", () => {
  scheduleMode = radio.value as "interval" | "times";
  formHint.textContent = "";
  refreshScheduleBlurb();
}));
document.querySelectorAll<HTMLButtonElement>("[data-interval]").forEach(button => button.addEventListener("click", () => {
  customInterval = button.dataset.interval === "custom";
  if (!customInterval) setIntervalMinutes(Number(button.dataset.interval));
  refreshScheduleBlurb();
  if (customInterval) input("f-interval").focus();
}));
document.querySelectorAll<HTMLButtonElement>("[data-days]").forEach(button => button.addEventListener("click", () => {
  const days = button.dataset.days === "all" ? [0,1,2,3,4,5,6] : button.dataset.days === "weekdays" ? [1,2,3,4,5] : [0,6];
  weekdayInputs().forEach(el => { el.checked = days.includes(Number(el.value)); });
  refreshScheduleBlurb();
}));
form.addEventListener("input", event => {
  if ((event.target as HTMLElement).id === "f-interval") customInterval = ![5,15,30,60,360].includes(intervalMinutes());
  refreshScheduleBlurb();
});
intervalUnit.addEventListener("change", () => {
  customInterval = ![5,15,30,60,360].includes(intervalMinutes());
  refreshScheduleBlurb();
});
document.getElementById("timezone-note")!.textContent = `Local time · ${localZone}`;
const clock = document.querySelector(".brand-logo")?.cloneNode(true) as SVGElement | undefined;
if (clock) document.getElementById("schedule-icon")!.append(clock);

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (saving) return;
  if (editorStep < 2) { goToStep(editorStep + 1); return; }
  if (!validateJob() || !validateSchedule()) return;
  const cwd = input("f-cwd").value.trim();
  const payload = {
    name: input("f-name").value.trim(),
    command: (document.getElementById("f-command") as HTMLTextAreaElement).value,
    cwd: cwd || (editingId ? null : undefined),
    enabled: input("f-enabled").checked,
    schedule: currentSchedule(),
  };
  saving = true;
  form.querySelectorAll<HTMLButtonElement>("button").forEach(button => { button.disabled = true; });
  formSave.textContent = "Saving…";
  try {
    const result = editingId ? await window.cadence.updateJob(editingId, payload) : await window.cadence.createJob(payload);
    if ("error" in result) { setError(String(result.error)); return; }
    resetFormForNew();
    showTab("jobs");
    await refresh();
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
  } finally {
    saving = false;
    form.querySelectorAll<HTMLButtonElement>("button").forEach(button => { button.disabled = false; });
    formSave.textContent = editorStep === 0 ? "Continue to schedule" : editingId ? "Save changes" : "Save job";
  }
});

function dayPhrase(days: Weekday[]): string {
  const set = new Set(days);
  if (set.size === 0 || set.size === 7) return "every day";
  const ordered = DAY_ORDER.filter((d) => set.has(d));
  const weekdays: Weekday[] = [1, 2, 3, 4, 5];
  if (ordered.length === 5 && weekdays.every((d) => set.has(d))) return "weekdays";
  if (ordered.length === 2 && set.has(0) && set.has(6)) return "weekends";
  const names = ordered.map((d) => DAY_LONG[d]);
  if (names.length === 1) return `every ${names[0]}`;
  const plural = names.map((name) => `${name}s`);
  if (plural.length === 2) return `${plural[0]} and ${plural[1]}`;
  return `${plural.slice(0, -1).join(", ")}, and ${plural[plural.length - 1]}`;
}

function clockPhrase(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function timesPhrase(times: string[]): string {
  const labels = times.map(clockPhrase);
  if (labels.length === 1) return `at ${labels[0]}`;
  if (labels.length === 2) return `at ${labels[0]} and ${labels[1]}`;
  return `at ${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function intervalPhrase(minutes: number): string {
  if (minutes === 1) return "every minute";
  if (minutes === 60) return "once an hour";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `every ${hours} hours`;
  }
  return `every ${minutes} minutes`;
}

function validTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h <= 23 && m <= 59;
}

/** Plain-language schedule. An interval runs every day and ignores days and clock times. */
function describeWhen(
  times: string[],
  days: Weekday[],
  interval: number | undefined,
): { line: string; note: string } {
  if (interval != null) {
    if (!Number.isInteger(interval) || interval < 1) {
      return { line: "Interval has to be a whole number of minutes.", note: "" };
    }
    const partialDays = days.length > 0 && days.length < 7;
    const note =
      partialDays || times.length > 0 ? "An interval ignores the days and clock times." : "";
    return { line: `Will run every day, ${intervalPhrase(interval)}.`, note };
  }
  if (times.length === 0) {
    return { line: "Add an interval or at least one time.", note: "" };
  }
  if (times.some((t) => !validTime(t))) {
    return { line: "Times have to look like 09:00.", note: "" };
  }
  return { line: `Will run ${dayPhrase(days)} ${timesPhrase(times)}.`, note: "" };
}

function scheduleLabel(job: Job): string {
  const described = describeWhen(job.schedule.times, job.schedule.days, job.schedule.intervalMinutes);
  return described.line.replace(/^Will run /, "").replace(/\.$/, "");
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
            <button class="ghost" data-act="edit">Edit</button>
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
        if (act === "edit") {
          openEditor(job);
          return;
        }
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
resetFormForNew();

export {};
