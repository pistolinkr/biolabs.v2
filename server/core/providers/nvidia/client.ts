import type { AiEnvConfig, NvidiaServiceId } from "../../config/env.js";
import { assertApiKeyConfigured } from "../../config/env.js";

export interface NvidiaFetchResult {
  ok: boolean;
  status: number;
  data: unknown;
  text?: string;
  /** Resolved POST URL (debugging; never log the API key). */
  requestUrl?: string;
}

/** NVIDIA Cloud Functions long-poll hint — required by many `*.api.nvidia.com` examples. */
function attachNvidiaCloudHeaders(cfg: AiEnvConfig, headers: Record<string, string>): void {
  if (!/\bapi\.nvidia\.com\b/i.test(cfg.baseUrl)) return;
  const poll = process.env.NVIDIA_NVCF_POLL_SECONDS ?? "300";
  if (poll && poll !== "0" && poll.toLowerCase() !== "false") {
    headers["NVCF-POLL-SECONDS"] = poll;
  }
}

/**
 * Generic JSON POST to NVIDIA Healthcare-style REST. Paths come from env (`loadAiEnv`).
 */
export async function nvidiaPostJson(
  cfg: AiEnvConfig,
  service: NvidiaServiceId,
  body: unknown,
): Promise<NvidiaFetchResult> {
  assertApiKeyConfigured(cfg);
  const subPath = cfg.paths[service];
  const url = `${cfg.baseUrl}${subPath.startsWith("/") ? subPath : `/${subPath}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
    Accept: "application/json",
  };
  attachNvidiaCloudHeaders(cfg, headers);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data, text, requestUrl: url };
}

/**
 * GET JSON from NVIDIA Healthcare (absolute URL or path relative to baseUrl).
 */
export async function nvidiaGetJson(cfg: AiEnvConfig, urlOrPath: string): Promise<NvidiaFetchResult> {
  assertApiKeyConfigured(cfg);
  const url =
    urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")
      ? urlOrPath
      : `${cfg.baseUrl}${urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    Accept: "application/json",
  };
  attachNvidiaCloudHeaders(cfg, headers);
  const res = await fetch(url, {
    method: "GET",
    headers,
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data, text, requestUrl: url };
}
