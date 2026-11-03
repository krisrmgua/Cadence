import { spawn } from "node:child_process";
import path from "node:path";
import { defaultShell, homeDir } from "./paths";
import type { Store } from "./store";
import type { JobRun } from "./types";

const active = new Map<string, ReturnType<typeof spawn>>();

export class Runner {
  constructor(private store: Store) {}

  async run(
    jobId: string,
    triggeredBy: JobRun["triggeredBy"],
  ): Promise<JobRun | { error: string }> {
    const job = this.store.getJob(jobId);
    if (!job) return { error: "job not found" };

    const run = this.store.startRun(job, triggeredBy);
    const cwd = job.cwd?.trim() || homeDir();
    const shell = defaultShell();

    let stdout = "";
    let stderr = "";

    return await new Promise((resolve) => {
      const child =
        process.platform === "win32"
          ? spawn(shell, ["/d", "/s", "/c", job.command], {
              cwd,
              env: process.env,
              windowsHide: true,
            })
          : spawn(shell, ["-lc", job.command], {
              cwd,
              env: process.env,
            });

      active.set(run.id, child);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (err) => {
        active.delete(run.id);
        const finished = this.store.finishRun(run.id, {
          exitCode: null,
          stdout,
          stderr: `${stderr}${stderr ? "\n" : ""}${err.message}`.trim(),
          status: "fail",
        });
        resolve(finished ?? { error: "run missing" });
      });

      child.on("close", (code) => {
        active.delete(run.id);
        const finished = this.store.finishRun(run.id, {
          exitCode: code,
          stdout,
          stderr,
          status: code === 0 ? "ok" : "fail",
        });
        resolve(finished ?? { error: "run missing" });
      });
    });
  }

  kill(runId: string): boolean {
    const child = active.get(runId);
    if (!child) return false;
    child.kill();
    active.delete(runId);
    this.store.finishRun(runId, {
      exitCode: null,
      stdout: "",
      stderr: "killed",
      status: "killed",
    });
    return true;
  }

  resolveCwd(cwd?: string): string {
    if (!cwd) return homeDir();
    return path.resolve(cwd);
  }
}
