import type { AiEnvConfig, NvidiaServiceId } from "../../config/env.js";
import type { JobRecord } from "../../types/jobSchemas.js";
import { nvidiaPostJson, type NvidiaFetchResult } from "./client.js";
import {
  extractProviderJobId,
  pollNvidiaJobUntilComplete,
  responseLooksAsync,
} from "./asyncPoll.js";
import { formatNvidiaFetchError } from "./nvidiaError.js";
import {
  buildBoltz2Request,
  buildEvo2Request,
  buildGenmolRequest,
  buildMsaRequest,
  buildOpenFold3Request,
  buildPairedMsaRequest,
} from "./buildRequest.js";

export type NvidiaLogFn = (line: string) => void | Promise<void>;

async function finalizeNvidiaFetch(
  cfg: AiEnvConfig,
  service: NvidiaServiceId,
  r: NvidiaFetchResult,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  if (!r.ok) {
    return { error: formatNvidiaFetchError(r) };
  }

  let data: unknown = r.data;
  if (responseLooksAsync(r.status, data)) {
    const pid = extractProviderJobId(data);
    if (pid) {
      await onProviderJobId?.(pid);
      await log?.(`async: provider job ${pid}`);
      const polled = await pollNvidiaJobUntilComplete(cfg, service, pid, log);
      if ("error" in polled) return polled;
      data = polled.result;
    } else {
      await log?.("async: response looks pending but no job id — returning raw body");
    }
  }

  return { result: data };
}

/**
 * NVIDIA Healthcare HTTP adapters — base URL and paths from env (`loadAiEnv`).
 * Request/response shapes follow the current NVIDIA API docs for each service.
 */
export async function runAlphafold3(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildOpenFold3Request(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "alphafold3", built.body);
  return finalizeNvidiaFetch(cfg, "alphafold3", r, log, onProviderJobId);
}

export async function runMsaSearch(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildMsaRequest(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "msa_search", built.body);
  return finalizeNvidiaFetch(cfg, "msa_search", r, log, onProviderJobId);
}

export async function runMsaSearchPaired(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildPairedMsaRequest(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "msa_search_paired", built.body);
  return finalizeNvidiaFetch(cfg, "msa_search_paired", r, log, onProviderJobId);
}

export async function runEvo2(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildEvo2Request(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "evo2_40b", built.body);
  return finalizeNvidiaFetch(cfg, "evo2_40b", r, log, onProviderJobId);
}

export async function runBoltz2(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildBoltz2Request(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "boltz2", built.body);
  return finalizeNvidiaFetch(cfg, "boltz2", r, log, onProviderJobId);
}

export async function runGenmol(
  cfg: AiEnvConfig,
  input: Record<string, unknown>,
  log?: NvidiaLogFn,
  onProviderJobId?: (id: string) => void | Promise<void>,
): Promise<{ result: unknown } | { error: string }> {
  const built = buildGenmolRequest(input);
  if (!built.ok) return { error: built.error };
  const r = await nvidiaPostJson(cfg, "genmol", built.body);
  return finalizeNvidiaFetch(cfg, "genmol", r, log, onProviderJobId);
}

export function dryRunLocalEcho(job: JobRecord): { result: unknown } {
  return {
    result: {
      echo: true,
      service: job.service,
      received: job.input ?? {},
    },
  };
}
