import type { Job, Weekday } from "./types";
import type { Store } from "./store";
import type { Runner } from "./runner";

/** Track fired slots as `jobId|YYYY-MM-DD|HH:MM` so each slot runs once. */
export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private fired = new Set<string>();

  constructor(
    private store: Store,
    private runner: Runner,
  ) {}

  start(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 15_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const now = new Date();
    const hhmm = formatHHMM(now);
    const day = now.getDay() as Weekday;
    const dateKey = formatDate(now);

    for (const job of this.store.listJobs()) {
      if (!job.enabled) continue;
      if (!isDueToday(job, day)) continue;
      if (!job.schedule.times.includes(hhmm)) continue;

      const key = `${job.id}|${dateKey}|${hhmm}`;
      if (this.fired.has(key)) continue;
      this.fired.add(key);
      void this.runner.run(job.id, "schedule");
    }

    this.pruneFired(dateKey);
  }

  private pruneFired(today: string): void {
    for (const key of [...this.fired]) {
      if (!key.includes(`|${today}|`)) this.fired.delete(key);
    }
  }
}

function isDueToday(job: Job, day: Weekday): boolean {
  const days = job.schedule.days;
  if (!days.length) return true;
  return days.includes(day);
}

function formatHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
