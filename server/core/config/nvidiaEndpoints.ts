/**
 * Central NVIDIA NIM “Healthcare / Biology” routing (no scattered path literals elsewhere).
 *
 * ## Spec source (verify when upgrading)
 * - Catalog: https://docs.api.nvidia.com/nim/reference/healthcare-apis
 * - Hosted base (official curl/python samples): `https://health.api.nvidia.com/v1`
 *   + path suffixes below (OpenAPI `paths` keys, e.g. `/biology/openfold/openfold3/predict`).
 * - Legacy `/v1/healthcare/...` style routes are **not** listed in the current Healthcare APIs table;
 *   prefer `/biology/<org>/<model>/...` from the OpenAPI references linked on that page.
 *
 * ## Auth & headers (cloud inference)
 * - `Authorization: Bearer <key>` — key from NVIDIA Build / product docs (`NVIDIA_HEALTHCARE_API_KEY` in this repo).
 * - `Content-Type: application/json` + `Accept: application/json` on JSON POST/GET.
 * - Many `*.api.nvidia.com` samples add **`NVCF-POLL-SECONDS`** for long-running NVCF calls (see `client.ts`).
 *
 * ## Request body schemas
 * - Per-model OpenAPI: links from the healthcare-apis table (infer operation on each model).
 * - Biolabs request builders: `server/core/providers/nvidia/buildRequest.ts` (UI strip + validation) → those schemas.
 *
 * ## Async / NVCF
 * - Some gateways return **202** or a **queued** body with a provider `job_id`. Without `NVIDIA_JOB_STATUS_PATH_TEMPLATE`,
 *   `asyncPoll` returns the submit response as-is (`pending: true`) — set the template to a GET path that resolves
 *   `{jobId}` (and optionally `{service}`) for your tenant. Synchronous 200 responses need no poll.
 *
 * Model naming here follows NIM catalog slugs (`openfold3`, `msa-search`, `evo2-40b`, `boltz2`, `genmol`).
 */

/** Path suffixes only — prepend `NVIDIA_HEALTHCARE_BASE_URL` (default includes `/v1`). */
export const NVIDIA_ENDPOINTS = {
  af3: "/biology/openfold/openfold3/predict",
  msa: "/biology/colabfold/msa-search/predict",
  msaPaired: "/biology/colabfold/msa-search/paired/predict",
  evo2: "/biology/arc/evo2-40b/generate",
  boltz: "/biology/mit/boltz2/predict",
  genmol: "/biology/nvidia/genmol/generate",
} as const;

export type NvidiaEndpointAlias = keyof typeof NVIDIA_ENDPOINTS;

/** Maps Biolabs job `service` ids → `NVIDIA_ENDPOINTS` keys. */
export const JOB_SERVICE_TO_ENDPOINT_KEY = {
  alphafold3: "af3",
  msa_search: "msa",
  msa_search_paired: "msaPaired",
  evo2_40b: "evo2",
  boltz2: "boltz",
  genmol: "genmol",
} as const;

export type NvidiaPathsMapKey = keyof typeof JOB_SERVICE_TO_ENDPOINT_KEY;

export type NvidiaPathsMap = Record<NvidiaPathsMapKey, string>;

/**
 * Effective paths after env overrides (`NVIDIA_AF3_PATH`, `NVIDIA_MSA_PATH`, ...).
 * This is the single source of truth consumed by `loadAiEnv()` and debug endpoints.
 */
export function resolveNvidiaPathsFromEnv(): NvidiaPathsMap {
  const d = NVIDIA_ENDPOINTS;
  return {
    alphafold3: process.env.NVIDIA_AF3_PATH ?? d.af3,
    msa_search: process.env.NVIDIA_MSA_PATH ?? d.msa,
    msa_search_paired: process.env.NVIDIA_MSA_PAIRED_PATH ?? d.msaPaired,
    evo2_40b: process.env.NVIDIA_EVO2_PATH ?? d.evo2,
    boltz2: process.env.NVIDIA_BOLTZ2_PATH ?? d.boltz,
    genmol: process.env.NVIDIA_GENMOL_PATH ?? d.genmol,
  };
}

function joinBasePath(baseUrl: string, subPath: string): string {
  const b = baseUrl.replace(/\/+$/, "");
  const p = subPath.startsWith("/") ? subPath : `/${subPath}`;
  return `${b}${p}`;
}

/** Resolved POST URLs for curl debugging (same shape as job services — no secrets). */
export function nvidiaResolvedPostUrls(baseUrl: string, paths: NvidiaPathsMap): Record<NvidiaPathsMapKey, string> {
  return {
    alphafold3: joinBasePath(baseUrl, paths.alphafold3),
    msa_search: joinBasePath(baseUrl, paths.msa_search),
    msa_search_paired: joinBasePath(baseUrl, paths.msa_search_paired),
    evo2_40b: joinBasePath(baseUrl, paths.evo2_40b),
    boltz2: joinBasePath(baseUrl, paths.boltz2),
    genmol: joinBasePath(baseUrl, paths.genmol),
  };
}

/** Human-readable routing summary for `/api/ai/health` (no secrets). */
export function nvidiaRoutingDebugInfo(baseUrl: string, paths: NvidiaPathsMap): {
  specReference: string;
  baseUrl: string;
  paths: NvidiaPathsMap;
  endpointAliases: typeof NVIDIA_ENDPOINTS;
  envOverrides: Partial<Record<NvidiaPathsMapKey, boolean>>;
  resolvedPostUrls: Record<NvidiaPathsMapKey, string>;
  asyncPoll: { templateConfigured: boolean; templateEnv: string };
} {
  return {
    specReference: "https://docs.api.nvidia.com/nim/reference/healthcare-apis",
    baseUrl,
    paths,
    endpointAliases: { ...NVIDIA_ENDPOINTS },
    envOverrides: {
      alphafold3: Boolean(process.env.NVIDIA_AF3_PATH),
      msa_search: Boolean(process.env.NVIDIA_MSA_PATH),
      msa_search_paired: Boolean(process.env.NVIDIA_MSA_PAIRED_PATH),
      evo2_40b: Boolean(process.env.NVIDIA_EVO2_PATH),
      boltz2: Boolean(process.env.NVIDIA_BOLTZ2_PATH),
      genmol: Boolean(process.env.NVIDIA_GENMOL_PATH),
    },
    resolvedPostUrls: nvidiaResolvedPostUrls(baseUrl, paths),
    asyncPoll: {
      templateConfigured: Boolean(process.env.NVIDIA_JOB_STATUS_PATH_TEMPLATE?.trim()),
      templateEnv: "NVIDIA_JOB_STATUS_PATH_TEMPLATE",
    },
  };
}
