import type { AiProviderId } from "@shared/ai/types";

export const AI_KEYS_STORAGE_KEY = "biolabs.workspace.aiKeys.v1";

/** Browser-direct provider keys (BYOK). */
export interface AiClientApiKeys {
  openai: string;
  anthropic: string;
  gemini: string;
  openrouter: string;
  huggingface: string;
}

export type ByokProviderId = "openai" | "anthropic" | "gemini";

export interface AiKeysSettings {
  /** When true, calls go directly from the browser with keys below. */
  useOwnApiKeys: boolean;
  keys: AiClientApiKeys;
}

export const DEFAULT_AI_KEYS: AiKeysSettings = {
  useOwnApiKeys: false,
  keys: { openai: "", anthropic: "", gemini: "", openrouter: "", huggingface: "" },
};

function cleanKey(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function loadAiKeysSettings(): AiKeysSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AI_KEYS, keys: { ...DEFAULT_AI_KEYS.keys } };
  try {
    const raw = localStorage.getItem(AI_KEYS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_KEYS, keys: { ...DEFAULT_AI_KEYS.keys } };
    const o = JSON.parse(raw) as Partial<AiKeysSettings & AiClientApiKeys>;
    const keys: AiClientApiKeys = {
      openai: cleanKey(o.keys?.openai ?? (o as { openai?: string }).openai),
      anthropic: cleanKey(o.keys?.anthropic ?? (o as { anthropic?: string }).anthropic),
      gemini: cleanKey(o.keys?.gemini ?? o.gemini),
      openrouter: cleanKey(o.keys?.openrouter ?? o.openrouter),
      huggingface: cleanKey(o.keys?.huggingface ?? o.huggingface),
    };
    return {
      useOwnApiKeys: o.useOwnApiKeys === true,
      keys,
    };
  } catch {
    return { ...DEFAULT_AI_KEYS, keys: { ...DEFAULT_AI_KEYS.keys } };
  }
}

export function saveAiKeysSettings(settings: AiKeysSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_KEYS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota */
  }
}

export function providersWithKeys(keys: AiClientApiKeys): AiProviderId[] {
  const out: AiProviderId[] = [];
  if (keys.openai) out.push("openai");
  if (keys.anthropic) out.push("anthropic");
  if (keys.gemini) out.push("gemini");
  if (keys.openrouter) out.push("openrouter");
  if (keys.huggingface) out.push("huggingface");
  return out;
}

export function hasAnyClientKey(keys: AiClientApiKeys): boolean {
  return providersWithKeys(keys).length > 0;
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
