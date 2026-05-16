/** Client mirror of server job types (keep in sync with server/core/types/jobSchemas.ts). */

export type AiJobService =
  | "alphafold3"
  | "msa_search"
  | "msa_search_paired"
  | "evo2_40b"
  | "boltz2"
  | "genmol"
  | "local_echo";

export type AiJobStatus = "pending" | "running" | "completed" | "failed";

export interface AiJob {
  id: string;
  service: AiJobService;
  status: AiJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  logs: string[];
  error?: string;
  input?: Record<string, unknown>;
  result?: unknown;
}

export interface CreateAiJobBody {
  service: AiJobService;
  input?: Record<string, unknown>;
  dryRun?: boolean;
}

export async function postAiJob(body: CreateAiJobBody): Promise<{ job: AiJob }> {
  const res = await fetch("/api/ai/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `AI job failed (${res.status})`);
  }
  return res.json() as Promise<{ job: AiJob }>;
}

export async function getAiJob(id: string): Promise<{ job: AiJob }> {
  const res = await fetch(`/api/ai/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Job ${id} not found`);
  return res.json() as Promise<{ job: AiJob }>;
}

export interface AiHealthRouting {
  specReference: string;
  baseUrl: string;
  paths: Record<AiJobService, string | undefined> | Record<string, string>;
  endpointAliases: Record<string, string>;
  envOverrides: Record<string, boolean | undefined>;
  /** Full POST URLs for curl debugging (no secrets). */
  resolvedPostUrls?: Partial<Record<AiJobService, string>>;
  asyncPoll?: { templateConfigured: boolean; templateEnv: string };
}

export async function fetchAiHealth(): Promise<{
  ok: boolean;
  apiKeyConfigured: boolean;
  routing?: AiHealthRouting;
  keyHint?: string | null;
}> {
  const res = await fetch("/api/ai/health");
  if (!res.ok) return { ok: false, apiKeyConfigured: false };
  return res.json() as Promise<{
    ok: boolean;
    apiKeyConfigured: boolean;
    routing?: AiHealthRouting;
    keyHint?: string | null;
  }>;
}

export async function fetchAiPipelines(): Promise<{ pipelines: readonly unknown[] }> {
  const res = await fetch("/api/ai/pipelines");
  if (!res.ok) return { pipelines: [] };
  return res.json() as Promise<{ pipelines: readonly unknown[] }>;
}

/** Server: preset-specific body (`sequence` for monomer MSA→AF3; `sequences` for paired MSA→Boltz). */
export async function postAiPipelineRun(
  presetId: string,
  body: { sequence?: string; sequences?: Record<string, string>; dryRun?: boolean },
): Promise<
  | { ok: true; presetId: string; msaJob: AiJob; foldJob: AiJob }
  | { ok: false; presetId: string; error: string; msaJob?: AiJob; foldJob?: AiJob }
> {
  const res = await fetch(`/api/ai/pipelines/${encodeURIComponent(presetId)}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      presetId: (data.presetId as string) ?? presetId,
      error: (data.error as string) || `Pipeline failed (${res.status})`,
    };
  }
  if (data.ok === false) {
    return data as { ok: false; presetId: string; error: string; msaJob?: AiJob; foldJob?: AiJob };
  }
  return data as { ok: true; presetId: string; msaJob: AiJob; foldJob: AiJob };
}
