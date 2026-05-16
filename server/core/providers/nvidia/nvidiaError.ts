/**
 * Human-readable errors for NVIDIA NIM / FastAPI responses (422 detail arrays, empty bodies).
 */

import type { NvidiaFetchResult } from "./client.js";

const MAX_LEN = 2000;

/** FastAPI / Pydantic validation: `detail` may be string | {loc,msg}[] | object. */
export function formatFastApiDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") return detail.trim().slice(0, MAX_LEN) || null;
  if (Array.isArray(detail)) {
    const parts: string[] = [];
    for (const item of detail) {
      if (item && typeof item === "object" && "msg" in item) {
        const locRaw = (item as { loc?: unknown }).loc;
        const loc = Array.isArray(locRaw) ? locRaw.map(String).join(".") : "";
        const msg = String((item as { msg: unknown }).msg);
        parts.push(loc ? `${loc}: ${msg}` : msg);
      } else {
        parts.push(JSON.stringify(item));
      }
    }
    const s = parts.join("; ");
    return s.slice(0, MAX_LEN) || null;
  }
  try {
    return JSON.stringify(detail).slice(0, MAX_LEN);
  } catch {
    return String(detail).slice(0, MAX_LEN);
  }
}

export function capMessage(s: string): string {
  if (s.length <= MAX_LEN) return s;
  return `${s.slice(0, MAX_LEN)}…`;
}

/** Provider job object after async poll — reuse FastAPI detail formatting. */
export function formatNvidiaProviderJobError(data: unknown, fallback = "provider job failed"): string {
  if (!data || typeof data !== "object") return fallback;
  const o = data as Record<string, unknown>;
  const msg = typeof o.message === "string" && o.message.trim() ? o.message.trim() : "";
  const d = formatFastApiDetail(o.detail);
  const parts = [msg, d].filter(Boolean);
  return parts.length ? capMessage(parts.join(" · ")) : fallback;
}

/**
 * Single string for `job.error` and logs. Always includes HTTP status; never drops to URL-only.
 */
export function formatNvidiaFetchError(r: NvidiaFetchResult): string {
  const chunks: string[] = [`HTTP ${r.status}`];

  if (typeof r.data === "object" && r.data) {
    const o = r.data as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) {
      chunks.push(o.message.trim());
    }
    const d = formatFastApiDetail(o.detail);
    if (d) chunks.push(d);
    if (typeof o.error === "string" && o.error.trim() && !chunks.includes(o.error.trim())) {
      chunks.push(o.error.trim());
    }
  }

  const txt = (r.text ?? "").trim();
  if (txt) chunks.push(txt.slice(0, 1500));

  let core = chunks.filter(Boolean).join(" · ");
  core = capMessage(core);
  return r.requestUrl ? `${core} — ${r.requestUrl}` : core;
}
