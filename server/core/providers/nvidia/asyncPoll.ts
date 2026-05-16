import type { AiEnvConfig, NvidiaServiceId } from "../../config/env.js";
import { nvidiaGetJson } from "./client.js";
import { formatNvidiaFetchError, formatNvidiaProviderJobError } from "./nvidiaError.js";

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export function extractProviderJobId(data: unknown): string | undefined {
  const o = asRecord(data);
  if (!o) return undefined;
  const keys = ["id", "job_id", "jobId", "request_id", "inference_id", "task_id"];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length) return v;
  }
  const nested = o.data;
  if (nested) return extractProviderJobId(nested);
  return undefined;
}

function getStatusString(data: unknown): string | undefined {
  const o = asRecord(data);
  if (!o) return undefined;
  const s = o.status ?? o.state ?? o.phase;
  return typeof s === "string" ? s.toLowerCase() : undefined;
}

export function responseLooksAsync(status: number, data: unknown): boolean {
  if (status === 202) return true;
  const s = getStatusString(data);
  if (s === "queued" || s === "pending" || s === "running" || s === "in_progress" || s === "submitted") {
    return extractProviderJobId(data) != null;
  }
  return false;
}

function isTerminalSuccess(data: unknown): boolean {
  const s = getStatusString(data);
  return s === "completed" || s === "succeeded" || s === "success" || s === "done";
}

function isTerminalFailure(data: unknown): boolean {
  const s = getStatusString(data);
  return s === "failed" || s === "error" || s === "cancelled" || s === "canceled";
}

export function extractResultPayload(data: unknown): unknown {
  const o = asRecord(data);
  if (!o) return data;
  if (isTerminalSuccess(data) && o.result != null) return o.result;
  if (o.output != null) return o.output;
  return data;
}

function buildPollUrl(cfg: AiEnvConfig, service: NvidiaServiceId, jobId: string): string | null {
  const template = process.env.NVIDIA_JOB_STATUS_PATH_TEMPLATE?.trim();
  if (!template) return null;
  const path = template.replaceAll("{service}", service).replaceAll("{jobId}", encodeURIComponent(jobId));
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${trimSlash(cfg.baseUrl)}${p}`;
}

export async function pollNvidiaJobUntilComplete(
  cfg: AiEnvConfig,
  service: NvidiaServiceId,
  providerJobId: string,
  log?: (line: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const url = buildPollUrl(cfg, service, providerJobId);
  if (!url) {
    await log?.("poll: NVIDIA_JOB_STATUS_PATH_TEMPLATE not set — returning async submit body");
    return { result: { providerJobId, pending: true } };
  }

  const maxAttempts = Math.max(1, Number(process.env.NVIDIA_POLL_MAX_ATTEMPTS ?? 80));
  const delayMs = Math.max(500, Number(process.env.NVIDIA_POLL_INTERVAL_MS ?? 2500));

  await log?.(`poll: job ${providerJobId} (${maxAttempts}× / ${delayMs}ms)`);

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await sleep(delayMs);
    const r = await nvidiaGetJson(cfg, url);
    if (!r.ok) {
      await log?.(`poll: HTTP ${r.status}`);
      if (i === maxAttempts - 1) {
        return { error: formatNvidiaFetchError(r) };
      }
      continue;
    }
    if (isTerminalFailure(r.data)) {
      return { error: formatNvidiaProviderJobError(r.data) };
    }
    if (isTerminalSuccess(r.data)) {
      await log?.("poll: completed");
      return { result: extractResultPayload(r.data) };
    }
    const st = getStatusString(r.data) ?? "running";
    await log?.(`poll: ${st} (${i + 1}/${maxAttempts})`);
  }
  return { error: "NVIDIA job poll timed out" };
}
