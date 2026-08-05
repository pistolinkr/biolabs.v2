import type { AiProviderId } from "@shared/ai/types";

export const AI_SETTINGS_STORAGE_KEY = "biolabs.workspace.aiSettings.v1";

export type AiResponseLanguage = "auto" | "en" | "ko" | "ja" | "zh" | "de" | "fr" | "es";

export interface AiClientSettings {
  preferredProvider: AiProviderId;
  responseLanguage: AiResponseLanguage;
  temperature: number;
  maxOutputTokens: number;
  includeFullSequences: boolean;
  compactContext: boolean;
  autoOpenChatOnExplain: boolean;
  showResidueExplainPopup: boolean;
}

export const DEFAULT_AI_CLIENT_SETTINGS: AiClientSettings = {
  preferredProvider: "auto",
  responseLanguage: "auto",
  temperature: 0.35,
  maxOutputTokens: 2048,
  includeFullSequences: true,
  compactContext: false,
  autoOpenChatOnExplain: false,
  showResidueExplainPopup: false,
};

export function loadAiClientSettings(): AiClientSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AI_CLIENT_SETTINGS };
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CLIENT_SETTINGS };
    const o = JSON.parse(raw) as Partial<AiClientSettings>;
    return {
      preferredProvider: isProvider(o.preferredProvider) ? o.preferredProvider : "auto",
      responseLanguage: isLang(o.responseLanguage) ? o.responseLanguage : "auto",
      temperature: clampNum(o.temperature, 0, 1, DEFAULT_AI_CLIENT_SETTINGS.temperature),
      maxOutputTokens: clampNum(o.maxOutputTokens, 256, 4096, DEFAULT_AI_CLIENT_SETTINGS.maxOutputTokens),
      includeFullSequences: o.includeFullSequences !== false,
      compactContext: o.compactContext === true,
      autoOpenChatOnExplain: o.autoOpenChatOnExplain === true,
      showResidueExplainPopup: o.showResidueExplainPopup !== false,
    };
  } catch {
    return { ...DEFAULT_AI_CLIENT_SETTINGS };
  }
}

export function saveAiClientSettings(settings: AiClientSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota */
  }
}

function isProvider(v: unknown): v is AiProviderId {
  return (
    v === "auto" ||
    v === "openai" ||
    v === "anthropic" ||
    v === "gemini" ||
    v === "openrouter" ||
    v === "huggingface"
  );
}

function isLang(v: unknown): v is AiResponseLanguage {
  return (
    v === "auto" ||
    v === "en" ||
    v === "ko" ||
    v === "ja" ||
    v === "zh" ||
    v === "de" ||
    v === "fr" ||
    v === "es"
  );
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}
