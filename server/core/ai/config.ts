import type { AiProviderId } from "@shared/ai/types";

const DEFAULT_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
/** Prefer the Free Models Router, then specific :free IDs (catalog rotates often). */
const DEFAULT_OPENROUTER_MODELS = [
  "openrouter/free",
  "openai/gpt-oss-20b:free",
  "google/gemma-3-27b-it:free",
];
const DEFAULT_HF_MODELS = ["HuggingFaceH4/zephyr-7b-beta", "mistralai/Mistral-7B-Instruct-v0.3"];

/** Strip inline comments and invalid example text from .env values. */
function cleanEnvValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutComment = trimmed.split("#")[0]?.trim() ?? "";
  return withoutComment || null;
}

/**
 * Parse a comma-separated model list from env (e.g. "modelA, modelB").
 * A legacy single-model env var is honored as the first entry, then the list,
 * then the built-in defaults — de-duplicated, order preserved.
 */
function parseModelList(
  listRaw: string | undefined,
  legacyRaw: string | undefined,
  defaults: string[],
): string[] {
  const fromList = (cleanEnvValue(listRaw) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacy = cleanEnvValue(legacyRaw);
  const merged = [...(legacy ? [legacy] : []), ...fromList];
  const out = merged.length ? merged : defaults;
  return Array.from(new Set(out));
}

function readNonNegativeInt(raw: string | undefined, fallback: number): number {
  const cleaned = cleanEnvValue(raw);
  if (cleaned === null) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(cleanEnvValue(raw));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readProvider(): AiProviderId {
  const raw = cleanEnvValue(process.env.AI_PROVIDER)?.toLowerCase() ?? "auto";
  if (raw === "gemini" || raw === "openrouter" || raw === "huggingface" || raw === "auto") {
    return raw;
  }
  return "auto";
}

export interface AiServerConfig {
  provider: AiProviderId;
  geminiApiKey: string | null;
  /** Primary model (first of geminiModels) — kept for status display. */
  geminiModel: string;
  /** Ordered fallback chain of models for this provider. */
  geminiModels: string[];
  openRouterApiKey: string | null;
  openRouterModel: string;
  openRouterModels: string[];
  huggingFaceApiKey: string | null;
  huggingFaceModel: string;
  huggingFaceModels: string[];
  maxContextChars: number;
  maxOutputTokens: number;
  retryPerModel: number;
  cooldownBaseMs: number;
  cooldownMaxMs: number;
}

export function loadAiConfig(): AiServerConfig {
  const geminiModels = parseModelList(
    process.env.GEMINI_MODELS,
    process.env.GEMINI_MODEL,
    DEFAULT_GEMINI_MODELS,
  );
  const openRouterModels = parseModelList(
    process.env.OPENROUTER_MODELS,
    process.env.OPENROUTER_MODEL,
    DEFAULT_OPENROUTER_MODELS,
  );
  const huggingFaceModels = parseModelList(
    process.env.HUGGINGFACE_MODELS,
    process.env.HUGGINGFACE_MODEL,
    DEFAULT_HF_MODELS,
  );

  return {
    provider: readProvider(),
    geminiApiKey: cleanEnvValue(process.env.GEMINI_API_KEY),
    geminiModel: geminiModels[0] ?? DEFAULT_GEMINI_MODELS[0],
    geminiModels,
    openRouterApiKey: cleanEnvValue(process.env.OPENROUTER_API_KEY),
    openRouterModel: openRouterModels[0] ?? DEFAULT_OPENROUTER_MODELS[0],
    openRouterModels,
    huggingFaceApiKey: cleanEnvValue(process.env.HUGGINGFACE_API_KEY),
    huggingFaceModel: huggingFaceModels[0] ?? DEFAULT_HF_MODELS[0],
    huggingFaceModels,
    maxContextChars: Number(process.env.AI_MAX_CONTEXT_CHARS ?? 24_000),
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 2048),
    retryPerModel: readNonNegativeInt(process.env.AI_RETRY_PER_MODEL, 1),
    cooldownBaseMs: readPositiveInt(process.env.AI_COOLDOWN_BASE_MS, 60_000),
    cooldownMaxMs: readPositiveInt(process.env.AI_COOLDOWN_MAX_MS, 600_000),
  };
}

/** Ordered model fallback chain for a given provider id. */
export function modelsForProvider(config: AiServerConfig, id: AiProviderId): string[] {
  switch (id) {
    case "gemini":
      return config.geminiModels;
    case "openrouter":
      return config.openRouterModels;
    case "huggingface":
      return config.huggingFaceModels;
    default:
      return [];
  }
}

export function listAvailableProviders(config: AiServerConfig): AiProviderId[] {
  const out: AiProviderId[] = [];
  if (config.geminiApiKey) out.push("gemini");
  if (config.openRouterApiKey) out.push("openrouter");
  if (config.huggingFaceApiKey) out.push("huggingface");
  return out;
}

export function resolveActiveProvider(config: AiServerConfig): AiProviderId | null {
  const available = listAvailableProviders(config);
  if (available.length === 0) return null;
  if (config.provider === "auto") return available[0] ?? null;
  return available.includes(config.provider) ? config.provider : null;
}
