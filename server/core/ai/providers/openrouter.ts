import type { AiChatMessage } from "@shared/ai/types";
import type { AiServerConfig } from "../config.ts";
import { appendTruncationNotice } from "../truncation.ts";
import {
  AiProviderError,
  parseRetryAfterMs,
  type AiCompletionOptions,
  type AiProvider,
  type AiProviderResult,
} from "./base.ts";

/** Infer HTTP-ish status from OpenRouter error text when the wire status is missing/opaque. */
function classifyOpenRouterMessage(message: string): number | undefined {
  const lower = message.toLowerCase();
  if (
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("insufficient credits")
  ) {
    return 429;
  }
  if (
    lower.includes("not found") ||
    lower.includes("no endpoints") ||
    lower.includes("no available") ||
    lower.includes("unavailable") ||
    (lower.includes("model") && lower.includes("does not exist"))
  ) {
    return 404;
  }
  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("user not found") ||
    lower.includes("authentication")
  ) {
    return 401;
  }
  return undefined;
}

export function createOpenRouterProvider(config: AiServerConfig): AiProvider {
  return {
    id: "openrouter",
    isConfigured: () => Boolean(config.openRouterApiKey),
    async complete(messages: AiChatMessage[], options: AiCompletionOptions): Promise<AiProviderResult> {
      if (!config.openRouterApiKey) {
        throw new AiProviderError("OPENROUTER_API_KEY is not configured", "openrouter");
      }

      const model = options.model ?? config.openRouterModel;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://biolabs.local",
          "X-Title": "Biolabs Protein Workstation",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options.maxOutputTokens,
          temperature: options.temperature,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[biolabs-ai] openrouter upstream", res.status, errText.slice(0, 500));
        let payloadMsg = "";
        try {
          const parsed = JSON.parse(errText) as { error?: { message?: string } };
          payloadMsg = parsed.error?.message ?? "";
        } catch {
          payloadMsg = errText.slice(0, 200);
        }
        const inferred = classifyOpenRouterMessage(payloadMsg) ?? res.status;
        throw new AiProviderError(
          payloadMsg ? `openrouter upstream error: ${payloadMsg}` : "openrouter upstream error",
          "openrouter",
          inferred,
          {
            retryAfterMs: parseRetryAfterMs(res),
            model,
          },
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        error?: { message?: string; code?: number | string };
      };

      if (data.error?.message) {
        console.error("[biolabs-ai] openrouter payload error", data.error.message);
        const inferred =
          typeof data.error.code === "number"
            ? data.error.code
            : classifyOpenRouterMessage(data.error.message);
        throw new AiProviderError(
          `openrouter payload error: ${data.error.message}`,
          "openrouter",
          inferred,
          { model },
        );
      }

      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim() ?? "";
      if (!text) {
        throw new AiProviderError("empty response", "openrouter", undefined, { model });
      }

      const truncated = choice?.finish_reason === "length";
      return {
        text: appendTruncationNotice(text, truncated),
        model,
        provider: "openrouter",
      };
    },
  };
}
