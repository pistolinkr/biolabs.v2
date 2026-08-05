import type {
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderId,
  AiStatusResponse,
  AiUserErrorPayload,
} from "@shared/ai/types";
import { buildPromptMessages } from "@shared/ai/promptBuilder";
import { hasAnyClientKey, type AiClientApiKeys } from "@/lib/ai/aiKeysStorage";
import { prefersPlatformAi } from "@/lib/ai/aiOnboardingStorage";
import {
  CLIENT_MAX_CONTEXT_CHARS,
  CLIENT_MAX_OUTPUT_TOKENS,
  ClientProviderError,
  completeWithClientKeys,
} from "@/lib/ai/clientProviders";
import { AiRequestError } from "@/lib/ai/userErrors";

const CHAT_URL = "/api/ai/chat";
const STATUS_URL = "/api/ai/status";

async function readAiJson<T>(res: Response): Promise<T | AiUserErrorPayload> {
  const text = await res.text();
  if (!text.trim()) {
    throw new AiRequestError("AI_NETWORK_ERROR", "Empty response from AI endpoint.");
  }
  try {
    return JSON.parse(text) as T | AiUserErrorPayload;
  } catch {
    throw new AiRequestError(
      "AI_NETWORK_ERROR",
      res.ok
        ? "Invalid response from AI endpoint."
        : "AI endpoint unavailable. Add your API keys in Settings → AI, or use platform AI on a host with server keys.",
    );
  }
}

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  const data = await readAiJson<AiStatusResponse>(res);
  if (!res.ok || !("configured" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(payload.code ?? "AI_UNKNOWN", payload.error ?? "AI status unavailable.");
  }
  return data;
}

async function sendAiChatServer(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
}): Promise<AiChatResponse> {
  const body: AiChatRequest = {
    messages: params.messages,
    context: params.context,
    intent: params.intent,
    provider: params.provider,
    generation: params.generation,
  };

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await readAiJson<AiChatResponse>(res);

  if (!res.ok || !("message" in data)) {
    const payload = data as AiUserErrorPayload;
    throw new AiRequestError(payload.code ?? "AI_UNKNOWN", payload.error ?? "AI request failed.");
  }

  return data;
}

async function sendAiChatClient(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
  clientKeys: AiClientApiKeys;
}): Promise<AiChatResponse> {
  if (!hasAnyClientKey(params.clientKeys)) {
    throw new AiRequestError(
      "AI_NOT_CONFIGURED",
      "Add at least one provider API key in Settings → AI Assistant.",
    );
  }

  const intent = params.intent ?? "general";
  const temperature =
    typeof params.generation?.temperature === "number"
      ? Math.min(1, Math.max(0, params.generation.temperature))
      : 0.35;
  const maxOutputTokens =
    typeof params.generation?.maxOutputTokens === "number"
      ? Math.min(CLIENT_MAX_OUTPUT_TOKENS, Math.max(128, Math.floor(params.generation.maxOutputTokens)))
      : CLIENT_MAX_OUTPUT_TOKENS;

  const promptMessages = buildPromptMessages(
    params.context,
    params.messages,
    intent,
    CLIENT_MAX_CONTEXT_CHARS,
    params.generation,
  );

  try {
    const result = await completeWithClientKeys({
      messages: promptMessages,
      keys: params.clientKeys,
      preferred: params.provider,
      maxOutputTokens,
      temperature,
    });
    return {
      message: result.text,
      provider: result.provider,
      model: result.model,
      context_fingerprint: params.context.context_fingerprint,
      fell_back: result.fellBack,
    };
  } catch (e) {
    if (e instanceof ClientProviderError) {
      throw new AiRequestError(e.code, e.message);
    }
    throw new AiRequestError("AI_UNKNOWN", e instanceof Error ? e.message : "AI request failed.");
  }
}

/**
 * Chat via platform server keys (/api/ai from .env) or the user's browser API keys.
 * Default is platform /.env unless the user explicitly chose BYOK (useOwnApiKeys).
 */
export async function sendAiChat(params: {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  provider?: AiProviderId;
  generation?: AiChatRequest["generation"];
  clientKeys: AiClientApiKeys;
  /** When true, force browser-direct keys. When false, force platform server /.env. */
  useOwnApiKeys?: boolean;
}): Promise<AiChatResponse> {
  const useByok =
    params.useOwnApiKeys === true || (params.useOwnApiKeys !== false && !prefersPlatformAi());

  if (!useByok) {
    return sendAiChatServer(params);
  }

  if (hasAnyClientKey(params.clientKeys)) {
    return sendAiChatClient(params);
  }

  // BYOK selected but no browser keys — fall back to platform /.env when available.
  try {
    return await sendAiChatServer(params);
  } catch (e) {
    if (e instanceof AiRequestError && e.code === "AI_NOT_CONFIGURED") {
      throw new AiRequestError(
        "AI_NOT_CONFIGURED",
        "Add at least one provider API key in Settings → AI, or use platform AI with server .env keys.",
      );
    }
    throw e;
  }
}
