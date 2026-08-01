import type { SupportedUiLocale } from "@shared/i18n/locales";
import type { AiProviderId } from "@shared/ai/types";
import type { AiClientApiKeys } from "@/lib/ai/aiKeysStorage";
import { completeWithClientKeys } from "@/lib/ai/clientProviders";
import { formatDrugProfileForAi } from "@/lib/phaeleon/phaeleonProfileGaps";
import type { DrugProfile } from "@/lib/phaeleon/types";

function localeInstruction(locale: SupportedUiLocale): string {
  if (locale === "en") return "Respond in English.";
  return `Respond in ${locale}. Translate any English FDA excerpts you cite.`;
}

export async function explainDrugWithAi(params: {
  drugName: string;
  slotLabel: string;
  profile: DrugProfile | null;
  locale: SupportedUiLocale;
  keys: AiClientApiKeys;
  preferredProvider: AiProviderId;
}): Promise<string> {
  const profileBlock = formatDrugProfileForAi(`${params.slotLabel} FDA/local profile`, params.profile);

  const userPrompt = [
    `Explain the prescription drug "${params.drugName}" for someone reviewing drug–drug interactions.`,
    "Cover: drug class, typical uses, key pharmacology, major warnings, and what clinicians monitor.",
    "Be concise (3–5 short paragraphs). Educational only — not medical advice.",
    localeInstruction(params.locale),
    "",
    profileBlock,
  ].join("\n");

  const result = await completeWithClientKeys({
    messages: [
      {
        role: "system",
        content:
          "You are BOA5, the Biolabs Phaeleon drug interaction assistant. Explain single drugs clearly and accurately using the profile data when available.",
      },
      { role: "user", content: userPrompt },
    ],
    keys: params.keys,
    preferred: params.preferredProvider,
    maxOutputTokens: 1024,
    temperature: 0.3,
  });

  return result.text.trim();
}
