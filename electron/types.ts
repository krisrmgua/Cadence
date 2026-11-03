export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

export interface JobSchedule {
  /** Local wall-clock HH:MM (24h). */
  times: string[];
  /** Days of week; empty means every day. */
  days: Weekday[];
  timezone?: string;
}

export interface Job {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  enabled: boolean;
  schedule: JobSchedule;
  createdAt: string;
  updatedAt: string;
  createdBy: "ui" | "api";
  lastRunAt?: string;
  lastStatus?: "ok" | "fail" | "running";
}

export interface JobRun {
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

export interface CadenceStoreData {
  version: 1;
  apiPort: number;
  jobs: Job[];
  runs: JobRun[];
}

export interface CreateJobInput {
  name: string;
  command: string;
  cwd?: string;
  enabled?: boolean;
  schedule: JobSchedule;
  createdBy?: "ui" | "api";
}

export interface UpdateJobInput {
  name?: string;
  command?: string;
  cwd?: string | null;
  enabled?: boolean;
  schedule?: JobSchedule;
}
