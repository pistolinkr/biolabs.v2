/**
 * Server-only NVIDIA / Healthcare API configuration. Never import from client.
 */
import { resolveNvidiaPathsFromEnv, type NvidiaPathsMap, type NvidiaPathsMapKey } from "./nvidiaEndpoints.js";

export type NvidiaServiceId = NvidiaPathsMapKey;

export interface AiEnvConfig {
  apiKey: string;
  baseUrl: string;
  paths: NvidiaPathsMap;
  jobDataDir: string;
  logUsage: boolean;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export function loadAiEnv(): AiEnvConfig {
  const apiKey = process.env.NVIDIA_HEALTHCARE_API_KEY ?? "";
  /** Official NIM cloud samples: `https://health.api.nvidia.com/v1` + paths from `nvidiaEndpoints.ts`. */
  const baseUrl = trimSlash(process.env.NVIDIA_HEALTHCARE_BASE_URL ?? "https://health.api.nvidia.com/v1");
  const jobDataDir = process.env.BIOLABS_JOB_DATA_DIR ?? "data/jobs";
  return {
    apiKey,
    baseUrl,
    logUsage: process.env.BIOLABS_LOG_AI_USAGE === "1",
    jobDataDir,
    paths: resolveNvidiaPathsFromEnv(),
  };
}

export function assertApiKeyConfigured(cfg: AiEnvConfig): void {
  if (!cfg.apiKey) {
    throw new Error("NVIDIA_HEALTHCARE_API_KEY is not set on the server");
  }
}
