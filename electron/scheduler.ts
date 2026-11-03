import type { Job, Weekday } from "./types";
import type { Store } from "./store";
import type { Runner } from "./runner";

/** Track fired calendar slots as `jobId|YYYY-MM-DD|HH:MM`. */
export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private fired = new Set<string>();
  /** Last interval fire epoch ms per job id. */
  private lastIntervalFire = new Map<string, number>();

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
    const nowMs = now.getTime();
    const hhmm = formatHHMM(now);
    const day = now.getDay() as Weekday;
    const dateKey = formatDate(now);

    for (const job of this.store.listJobs()) {
      if (!job.enabled) continue;

      const interval = job.schedule.intervalMinutes;
      if (interval != null && interval > 0) {
        this.tickInterval(job, nowMs, interval);
        continue;
      }

      if (!isDueToday(job, day)) continue;
      if (!job.schedule.times.includes(hhmm)) continue;

      const key = `${job.id}|${dateKey}|${hhmm}`;
      if (this.fired.has(key)) continue;
      this.fired.add(key);
      void this.runner.run(job.id, "schedule");
    }

    this.pruneFired(dateKey);
  }

  private tickInterval(job: Job, nowMs: number, intervalMinutes: number): void {
    const gapMs = intervalMinutes * 60_000;
    let last = this.lastIntervalFire.get(job.id);
    if (last === undefined) {
      last = job.lastRunAt ? Date.parse(job.lastRunAt) : 0;
      if (Number.isNaN(last)) last = 0;
      this.lastIntervalFire.set(job.id, last);
    }
    if (nowMs - last < gapMs) return;
    this.lastIntervalFire.set(job.id, nowMs);
    void this.runner.run(job.id, "schedule");
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
