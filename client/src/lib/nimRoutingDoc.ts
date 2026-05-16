/**
 * Client-side documentation mirror of default NIM path suffixes (see server `nvidiaEndpoints.ts`).
 * Effective paths on server may differ via env overrides listed here.
 */

import type { AiJobService } from "./aiApi";

export const HEALTHCARE_SPEC_URL = "https://docs.api.nvidia.com/nim/reference/healthcare-apis";

export const NIM_SERVICE_ROWS: {
  jobService: AiJobService;
  label: string;
  defaultPath: string;
  envOverride: string;
}[] = [
  {
    jobService: "alphafold3",
    label: "OpenFold3 predict",
    defaultPath: "/biology/openfold/openfold3/predict",
    envOverride: "NVIDIA_AF3_PATH",
  },
  {
    jobService: "msa_search",
    label: "ColabFold MSA search",
    defaultPath: "/biology/colabfold/msa-search/predict",
    envOverride: "NVIDIA_MSA_PATH",
  },
  {
    jobService: "evo2_40b",
    label: "Arc Evo2-40b generate",
    defaultPath: "/biology/arc/evo2-40b/generate",
    envOverride: "NVIDIA_EVO2_PATH",
  },
  {
    jobService: "boltz2",
    label: "MIT Boltz2 predict",
    defaultPath: "/biology/mit/boltz2/predict",
    envOverride: "NVIDIA_BOLTZ2_PATH",
  },
  {
    jobService: "genmol",
    label: "NVIDIA GenMol generate",
    defaultPath: "/biology/nvidia/genmol/generate",
    envOverride: "NVIDIA_GENMOL_PATH",
  },
];

/** Operator-facing env vars (see repo `.env.example`). */
export const ENV_DOC_LINES = [
  "NVIDIA_HEALTHCARE_API_KEY — Bearer token for NIM (server only; never VITE_*)",
  "NVIDIA_HEALTHCARE_BASE_URL — e.g. https://health.api.nvidia.com/v1 (paths stay /biology/...)",
  "NVIDIA_NVCF_POLL_SECONDS — NVCF long-poll header (0 disables)",
  "NVIDIA_AF3_PATH, NVIDIA_MSA_PATH, NVIDIA_EVO2_PATH, NVIDIA_BOLTZ2_PATH, NVIDIA_GENMOL_PATH — path overrides",
  "NVIDIA_JOB_STATUS_PATH_TEMPLATE — async GET template with {jobId} / {service}",
  "NVIDIA_POLL_MAX_ATTEMPTS, NVIDIA_POLL_INTERVAL_MS — poll loop",
  "BIOLABS_JOB_DATA_DIR, BIOLABS_LOG_AI_USAGE, BIOLABS_API_PORT",
] as const;
