import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { storePath } from "./paths";
import type {
  CadenceStoreData,
  CreateJobInput,
  Job,
  JobRun,
  JobSchedule,
  UpdateJobInput,
} from "./types";

const MAX_RUNS = 200;
const DEFAULT_PORT = 3927;

function emptyStore(): CadenceStoreData {
  return {
    version: 1,
    apiPort: DEFAULT_PORT,
    jobs: [],
    runs: [],
  };
}

export class Store {
  private data: CadenceStoreData;
  private listeners = new Set<() => void>();

  constructor() {
    this.data = this.load();
  }

  private load(): CadenceStoreData {
    try {
      const raw = fs.readFileSync(storePath(), "utf8");
      const parsed = JSON.parse(raw) as CadenceStoreData;
      if (parsed.version !== 1 || !Array.isArray(parsed.jobs)) {
        return emptyStore();
      }
      return {
        ...emptyStore(),
        ...parsed,
        jobs: parsed.jobs ?? [],
        runs: parsed.runs ?? [],
        apiPort: parsed.apiPort || DEFAULT_PORT,
      };
    } catch {
      return emptyStore();
    }
  }

  private persist(): void {
    fs.writeFileSync(storePath(), JSON.stringify(this.data, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    for (const listener of this.listeners) listener();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): CadenceStoreData {
    return structuredClone(this.data);
  }

  getApiPort(): number {
    return this.data.apiPort;
  }

  setApiPort(port: number): void {
    this.data.apiPort = port;
    this.persist();
  }

  listJobs(): Job[] {
    return structuredClone(this.data.jobs);
  }

  getJob(id: string): Job | undefined {
    const job = this.data.jobs.find((j) => j.id === id);
    return job ? structuredClone(job) : undefined;
  }

  createJob(input: CreateJobInput): Job {
    const now = new Date().toISOString();
    const job: Job = {
      id: randomUUID(),
      name: input.name.trim(),
      command: input.command,
      cwd: input.cwd?.trim() || undefined,
      enabled: input.enabled !== false,
      schedule: cloneSchedule(input.schedule),
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? "ui",
    };
    this.data.jobs.unshift(job);
    this.persist();
    return structuredClone(job);
  }

  updateJob(id: string, input: UpdateJobInput): Job | undefined {
    const idx = this.data.jobs.findIndex((j) => j.id === id);
    if (idx < 0) return undefined;
    const job = this.data.jobs[idx];
    if (input.name !== undefined) job.name = input.name.trim();
    if (input.command !== undefined) job.command = input.command;
    if (input.cwd !== undefined) {
      job.cwd = input.cwd?.trim() || undefined;
    }
    if (input.enabled !== undefined) job.enabled = input.enabled;
    if (input.schedule !== undefined) {
      job.schedule = cloneSchedule(input.schedule);
    }
    job.updatedAt = new Date().toISOString();
    this.persist();
    return structuredClone(job);
  }

  deleteJob(id: string): boolean {
    const before = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter((j) => j.id !== id);
    if (this.data.jobs.length === before) return false;
    this.persist();
    return true;
  }

  markJobStatus(
    id: string,
    status: Job["lastStatus"],
    at = new Date().toISOString(),
  ): void {
    const job = this.data.jobs.find((j) => j.id === id);
    if (!job) return;
    job.lastStatus = status;
    job.lastRunAt = at;
    job.updatedAt = at;
    this.persist();
  }

  listRuns(limit = 50): JobRun[] {
    return structuredClone(this.data.runs.slice(0, limit));
  }

  getRun(id: string): JobRun | undefined {
    const run = this.data.runs.find((r) => r.id === id);
    return run ? structuredClone(run) : undefined;
  }

  startRun(
    job: Job,
    triggeredBy: JobRun["triggeredBy"],
  ): JobRun {
    const run: JobRun = {
      id: randomUUID(),
      jobId: job.id,
      jobName: job.name,
      startedAt: new Date().toISOString(),
      status: "running",
      stdout: "",
      stderr: "",
      triggeredBy,
    };
    this.data.runs.unshift(run);
    this.trimRuns();
    this.markJobStatus(job.id, "running", run.startedAt);
    this.persist();
    return structuredClone(run);
  }

  finishRun(
    runId: string,
    result: {
      exitCode: number | null;
      stdout: string;
      stderr: string;
      status: Exclude<JobRun["status"], "running">;
    },
  ): JobRun | undefined {
    const run = this.data.runs.find((r) => r.id === runId);
    if (!run) return undefined;
    run.finishedAt = new Date().toISOString();
    run.exitCode = result.exitCode;
    run.stdout = truncate(result.stdout);
    run.stderr = truncate(result.stderr);
    run.status = result.status;
    this.markJobStatus(
      run.jobId,
      result.status === "ok" ? "ok" : "fail",
      run.finishedAt,
    );
    this.persist();
    return structuredClone(run);
  }

  private trimRuns(): void {
    if (this.data.runs.length > MAX_RUNS) {
      this.data.runs = this.data.runs.slice(0, MAX_RUNS);
    }
  }
}

function truncate(text: string, max = 200_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated]`;
}

function cloneSchedule(schedule: JobSchedule): JobSchedule {
  const out: JobSchedule = {
    times: [...schedule.times],
    days: [...schedule.days],
    timezone: schedule.timezone,
  };
  if (schedule.intervalMinutes != null) {
    out.intervalMinutes = schedule.intervalMinutes;
  }
  return out;
}
