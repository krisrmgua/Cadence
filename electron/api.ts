import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Store } from "./store";
import type { Runner } from "./runner";
import type { CreateJobInput, UpdateJobInput, Weekday } from "./types";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class LocalApi {
  private server: http.Server | null = null;
  private port = 0;

  constructor(
    private store: Store,
    private runner: Runner,
  ) {}

  getPort(): number {
    return this.port;
  }

  async start(preferredPort: number): Promise<number> {
    const tryPorts = [preferredPort, preferredPort + 1, preferredPort + 2, 0];
    for (const candidate of tryPorts) {
      try {
        this.port = await this.listen(candidate);
        if (this.port !== preferredPort) {
          this.store.setApiPort(this.port);
        }
        return this.port;
      } catch {
        // try next
      }
    }
    throw new Error("could not bind local API port");
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private listen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        void this.handle(req, res);
      });
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => {
        this.server = server;
        const addr = server.address();
        if (addr && typeof addr === "object") resolve(addr.port);
        else reject(new Error("no address"));
      });
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const method = (req.method || "GET").toUpperCase();
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (method === "GET" && path === "/health") {
        return json(res, 200, {
          ok: true,
          service: "cadence",
          port: this.port,
          platform: process.platform,
        });
      }

      if (method === "GET" && path === "/jobs") {
        return json(res, 200, { jobs: this.store.listJobs() });
      }

      if (method === "POST" && path === "/jobs") {
        const body = await readJson(req);
        const input = parseCreateJob(body);
        if ("error" in input) return json(res, 400, input);
        const job = this.store.createJob({ ...input, createdBy: "api" });
        return json(res, 201, { job });
      }

      const jobMatch = path.match(/^\/jobs\/([^/]+)$/);
      if (jobMatch) {
        const id = decodeURIComponent(jobMatch[1]);
        if (method === "GET") {
          const job = this.store.getJob(id);
          if (!job) return json(res, 404, { error: "not found" });
          return json(res, 200, { job });
        }
        if (method === "PATCH") {
          const body = await readJson(req);
          const input = parseUpdateJob(body);
          if ("error" in input) return json(res, 400, input);
          const job = this.store.updateJob(id, input);
          if (!job) return json(res, 404, { error: "not found" });
          return json(res, 200, { job });
        }
        if (method === "DELETE") {
          const ok = this.store.deleteJob(id);
          if (!ok) return json(res, 404, { error: "not found" });
          return json(res, 200, { ok: true });
        }
      }

      const runJobMatch = path.match(/^\/jobs\/([^/]+)\/run$/);
      if (method === "POST" && runJobMatch) {
        const id = decodeURIComponent(runJobMatch[1]);
        const result = await this.runner.run(id, "api");
        if ("error" in result) return json(res, 404, result);
        return json(res, 200, { run: result });
      }

      if (method === "GET" && path === "/runs") {
        const limit = Number(url.searchParams.get("limit") || 50);
        return json(res, 200, { runs: this.store.listRuns(limit) });
      }

      const runMatch = path.match(/^\/runs\/([^/]+)$/);
      if (method === "GET" && runMatch) {
        const run = this.store.getRun(decodeURIComponent(runMatch[1]));
        if (!run) return json(res, 404, { error: "not found" });
        return json(res, 200, { run });
      }

      json(res, 404, { error: "not found" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    }
  }
}

function json(res: ServerResponse, status: number, body: Json): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseCreateJob(
  body: unknown,
): CreateJobInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "body required" };
  const o = body as Record<string, unknown>;
  const name = String(o.name || "").trim();
  const command = String(o.command || "").trim();
  if (!name) return { error: "name required" };
  if (!command) return { error: "command required" };

  const scheduleRaw = o.schedule;
  if (!scheduleRaw || typeof scheduleRaw !== "object") {
    return { error: "schedule required" };
  }
  const parsed = parseSchedule(scheduleRaw as Record<string, unknown>);
  if ("error" in parsed) return parsed;

  return {
    name,
    command,
    cwd: o.cwd != null ? String(o.cwd) : undefined,
    enabled: o.enabled !== false,
    schedule: parsed,
  };
}

function parseUpdateJob(
  body: unknown,
): UpdateJobInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "body required" };
  const o = body as Record<string, unknown>;
  const out: UpdateJobInput = {};
  if (o.name !== undefined) out.name = String(o.name);
  if (o.command !== undefined) out.command = String(o.command);
  if (o.cwd !== undefined) {
    out.cwd = o.cwd === null ? null : String(o.cwd);
  }
  if (o.enabled !== undefined) out.enabled = Boolean(o.enabled);
  if (o.schedule !== undefined) {
    if (!o.schedule || typeof o.schedule !== "object") {
      return { error: "invalid schedule" };
    }
    const parsed = parseSchedule(o.schedule as Record<string, unknown>);
    if ("error" in parsed) return parsed;
    out.schedule = parsed;
  }
  return out;
}

function parseSchedule(
  schedule: Record<string, unknown>,
): import("./types").JobSchedule | { error: string } {
  const intervalRaw = schedule.intervalMinutes;
  let intervalMinutes: number | undefined;
  if (intervalRaw !== undefined && intervalRaw !== null) {
    const n = Number(intervalRaw);
    if (!Number.isInteger(n) || n < 1) {
      return { error: "schedule.intervalMinutes must be an integer >= 1" };
    }
    intervalMinutes = n;
  }

  const days = normalizeDays(schedule.days);
  if ("error" in days) return days;

  if (intervalMinutes != null) {
    const times =
      schedule.times === undefined || schedule.times === null
        ? { times: [] as string[] }
        : normalizeTimes(schedule.times, { allowEmpty: true });
    if ("error" in times) return times;
    return {
      times: times.times,
      days: days.days,
      intervalMinutes,
    };
  }

  const times = normalizeTimes(schedule.times, { allowEmpty: false });
  if ("error" in times) return times;
  return { times: times.times, days: days.days };
}

function normalizeTimes(
  value: unknown,
  opts: { allowEmpty: boolean },
): { times: string[] } | { error: string } {
  if (!Array.isArray(value)) {
    return { error: "schedule.times must be an array of HH:MM" };
  }
  if (!opts.allowEmpty && value.length === 0) {
    return { error: "schedule.times must be a non-empty array of HH:MM" };
  }
  const times: string[] = [];
  for (const t of value) {
    const s = String(t).trim();
    if (!/^\d{2}:\d{2}$/.test(s)) {
      return { error: `invalid time ${s}` };
    }
    const [h, m] = s.split(":").map(Number);
    if (h > 23 || m > 59) return { error: `invalid time ${s}` };
    times.push(s);
  }
  return { times };
}

function normalizeDays(
  value: unknown,
): { days: Weekday[] } | { error: string } {
  if (value === undefined || value === null) return { days: [] };
  if (!Array.isArray(value)) return { error: "schedule.days must be an array" };
  const days: Weekday[] = [];
  for (const d of value) {
    const n = Number(d);
    if (!Number.isInteger(n) || n < 0 || n > 6) {
      return { error: "schedule.days values must be 0-6 (Sun-Sat)" };
    }
    days.push(n as Weekday);
  }
  return { days };
}
