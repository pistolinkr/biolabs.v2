import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { AiEnvConfig } from "../config/env.js";
import type { JobRecord, JobService, JobStatus } from "../types/jobSchemas.js";
import { jobRecordSchema } from "../types/jobSchemas.js";

export class JobStore {
  private dir: string;

  constructor(cfg: AiEnvConfig) {
    this.dir = path.resolve(cfg.jobDataDir);
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async create(
    service: JobService,
    input?: Record<string, unknown>,
  ): Promise<JobRecord> {
    await this.ensureDir();
    const id = nanoid();
    const now = new Date().toISOString();
    const rec: JobRecord = {
      id,
      service,
      status: "pending",
      progress: 0,
      createdAt: now,
      updatedAt: now,
      logs: [],
      input,
    };
    await fs.writeFile(this.filePath(id), JSON.stringify(rec, null, 2), "utf-8");
    return rec;
  }

  async get(id: string): Promise<JobRecord | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      return jobRecordSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  async update(id: string, patch: Partial<JobRecord>): Promise<JobRecord | null> {
    const cur = await this.get(id);
    if (!cur) return null;
    const next = jobRecordSchema.parse({
      ...cur,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    await fs.writeFile(this.filePath(id), JSON.stringify(next, null, 2), "utf-8");
    return next;
  }

  async appendLog(id: string, line: string): Promise<void> {
    const cur = await this.get(id);
    if (!cur) return;
    const logs = [...cur.logs, `[${new Date().toISOString()}] ${line}`];
    await this.update(id, { logs });
  }

  async setStatus(id: string, status: JobStatus, extra?: Partial<JobRecord>): Promise<void> {
    await this.update(id, { status, ...extra });
  }
}
