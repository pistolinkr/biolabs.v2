import type { AiErrorCode, AiProviderId, AiStatusResponse } from "@shared/ai/types";
import type { AiClientApiKeys } from "@/lib/ai/aiKeysStorage";

export const CLIENT_DEFAULT_MODELS: Record<Exclude<AiProviderId, "auto">, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  openrouter: "openrouter/free",
  huggingface: "HuggingFaceH4/zephyr-7b-beta",
};

const CLIENT_MODEL_CHAINS: Record<Exclude<AiProviderId, "auto">, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-flash"],
  openrouter: [
    "openrouter/free",
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
  huggingface: ["HuggingFaceH4/zephyr-7b-beta", "mistralai/Mistral-7B-Instruct-v0.3"],
};

export const CLIENT_MAX_CONTEXT_CHARS = 24_000;
export const CLIENT_MAX_OUTPUT_TOKENS = 2048;

const PREFERRED_ORDER: Exclude<AiProviderId, "auto">[] = [
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
  "huggingface",
];

export class ClientProviderError extends Error {
  readonly provider: AiProviderId;
  readonly statusCode?: number;
  readonly code: AiErrorCode;

  constructor(message: string, provider: AiProviderId, code: AiErrorCode, statusCode?: number) {
    super(message);
    this.name = "ClientProviderError";
    this.provider = provider;
    this.code = code;
    this.statusCode = statusCode;
  }
}

function classifyStatus(status: number, message: string): AiErrorCode {
  const lower = message.toLowerCase();
  if (status === 429 || lower.includes("quota")) return "AI_QUOTA_EXCEEDED";
  if (status === 404 || lower.includes("not found") || lower.includes("no endpoints")) {
    return "AI_MODEL_UNAVAILABLE";
  }
  if (status === 401 || status === 403) return "AI_NOT_CONFIGURED";
  if (status >= 500 || lower.includes("network") || lower.includes("failed to fetch")) {
    return "AI_NETWORK_ERROR";
  }
  return "AI_UNKNOWN";
}

function resolveOrder(
  preferred: AiProviderId | undefined,
  available: Exclude<AiProviderId, "auto">[],
): Exclude<AiProviderId, "auto">[] {
  if (preferred && preferred !== "auto" && available.includes(preferred)) {
    return [preferred, ...PREFERRED_ORDER.filter((id) => id !== preferred && available.includes(id))];
  }
  return PREFERRED_ORDER.filter((id) => available.includes(id));
}

function listAvailable(keys: AiClientApiKeys): Exclude<AiProviderId, "auto">[] {
  return PREFERRED_ORDER.filter((id) => Boolean(keys[id as keyof AiClientApiKeys]));
}

function shouldTryNextModel(code: AiErrorCode): boolean {
  return (
    code === "AI_MODEL_UNAVAILABLE" ||
    code === "AI_QUOTA_EXCEEDED" ||
    code === "AI_NOT_CONFIGURED" ||
    code === "AI_NETWORK_ERROR" ||
    code === "AI_EMPTY_RESPONSE" ||
    code === "AI_UNKNOWN"
  );
}

async function completeOpenAI(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxOutputTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ClientProviderError(
      errText || "OpenAI request failed",
      "openai",
      classifyStatus(res.status, errText),
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new ClientProviderError(data.error.message, "openai", "AI_UNKNOWN");
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new ClientProviderError("empty response", "openai", "AI_EMPTY_RESPONSE");
  return text;
}

async function completeAnthropic(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const convo = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      temperature,
      system: system || undefined,
      messages: convo,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ClientProviderError(
      errText || "Anthropic request failed",
      "anthropic",
      classifyStatus(res.status, errText),
      res.status,
    );
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new ClientProviderError(data.error.message, "anthropic", "AI_UNKNOWN");
  }
  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) throw new ClientProviderError("empty response", "anthropic", "AI_EMPTY_RESPONSE");
  return text;
}

async function completeGemini(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<string> {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const convo = messages.filter((m) => m.role !== "system");
  const contents = convo.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemParts.length ? { parts: [{ text: systemParts.join("\n\n") }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens, temperature },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ClientProviderError(
      errText || "Gemini request failed",
      "gemini",
      classifyStatus(res.status, errText),
      res.status,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new ClientProviderError(data.error.message, "gemini", "AI_UNKNOWN");
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim() ?? "";
  if (!text) throw new ClientProviderError("empty response", "gemini", "AI_EMPTY_RESPONSE");
  return text;
}

async function completeOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://biolabs.world",
      "X-Title": "Biolabs Protein Workstation",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxOutputTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ClientProviderError(
      errText || "OpenRouter request failed",
      "openrouter",
      classifyStatus(res.status, errText),
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new ClientProviderError(data.error.message, "openrouter", "AI_UNKNOWN");
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new ClientProviderError("empty response", "openrouter", "AI_EMPTY_RESPONSE");
  return text;
}

async function completeHuggingFace(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<string> {
  const prompt = messages
    .map((m) => {
      const label = m.role === "assistant" ? "Assistant" : m.role === "system" ? "System" : "User";
      return `${label}:\n${m.content}`;
    })
    .join("\n\n");

  const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 45_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `${prompt}\n\nAssistant:`,
        parameters: {
          max_new_tokens: Math.min(maxOutputTokens, 1024),
          temperature,
          return_full_text: false,
        },
      }),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new ClientProviderError("network error", "huggingface", "AI_NETWORK_ERROR");
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ClientProviderError(
      errText || "Hugging Face request failed",
      "huggingface",
      classifyStatus(res.status, errText),
      res.status,
    );
  }

  const data = (await res.json()) as Array<{ generated_text?: string }> | { error?: string };
  if (!Array.isArray(data)) {
    throw new ClientProviderError("invalid response", "huggingface", "AI_UNKNOWN");
  }
  const text = data[0]?.generated_text?.trim() ?? "";
  if (!text) throw new ClientProviderError("empty response", "huggingface", "AI_EMPTY_RESPONSE");
  return text;
}

async function completeProviderModel(
  id: Exclude<AiProviderId, "auto">,
  model: string,
  params: {
    messages: { role: string; content: string }[];
    keys: AiClientApiKeys;
    maxOutputTokens: number;
    temperature: number;
  },
): Promise<string> {
  if (id === "openai") {
    return completeOpenAI(params.messages, params.keys.openai, model, params.maxOutputTokens, params.temperature);
  }
  if (id === "anthropic") {
    return completeAnthropic(
      params.messages,
      params.keys.anthropic,
      model,
      params.maxOutputTokens,
      params.temperature,
    );
  }
  if (id === "gemini") {
    return completeGemini(params.messages, params.keys.gemini, model, params.maxOutputTokens, params.temperature);
  }
  if (id === "openrouter") {
    return completeOpenRouter(
      params.messages,
      params.keys.openrouter,
      model,
      params.maxOutputTokens,
      params.temperature,
    );
  }
  return completeHuggingFace(
    params.messages,
    params.keys.huggingface,
    model,
    params.maxOutputTokens,
    params.temperature,
  );
}

export async function completeWithClientKeys(params: {
  messages: { role: string; content: string }[];
  keys: AiClientApiKeys;
  preferred?: AiProviderId;
  maxOutputTokens: number;
  temperature: number;
}): Promise<{ text: string; provider: AiProviderId; model: string; fellBack: boolean }> {
  const available = listAvailable(params.keys);
  if (available.length === 0) {
    throw new ClientProviderError("no API keys configured", "auto", "AI_NOT_CONFIGURED");
  }

  const order = resolveOrder(params.preferred, available);
  let lastError: ClientProviderError | null = null;
  let attemptIndex = 0;

  for (let i = 0; i < order.length; i += 1) {
    const id = order[i];
    const models = CLIENT_MODEL_CHAINS[id];

    for (const model of models) {
      try {
        const text = await completeProviderModel(id, model, params);
        return { text, provider: id, model, fellBack: attemptIndex > 0 };
      } catch (e) {
        lastError = e instanceof ClientProviderError ? e : new ClientProviderError(String(e), id, "AI_UNKNOWN");
        attemptIndex += 1;
        if (!shouldTryNextModel(lastError.code)) break;
      }
    }
  }

  throw lastError ?? new ClientProviderError("all providers failed", "auto", "AI_ALL_PROVIDERS_FAILED");
}

export function buildClientAiStatus(keys: AiClientApiKeys): AiStatusResponse {
  const available = listAvailable(keys);
  const models: Partial<Record<AiProviderId, string>> = {};
  for (const id of available) {
    models[id] = CLIENT_DEFAULT_MODELS[id];
  }

  return {
    configured: available.length > 0,
    active_provider: available[0] ?? null,
    available_providers: available,
    models,
    max_output_tokens: CLIENT_MAX_OUTPUT_TOKENS,
    max_context_chars: CLIENT_MAX_CONTEXT_CHARS,
    server_provider: "auto",
  };
}
