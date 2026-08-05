import React from "react";
import { useTranslation } from "react-i18next";
import type { AiClientSettings } from "@/lib/ai/aiSettingsStorage";
import type { AiKeysSettings } from "@/lib/ai/aiKeysStorage";
import { maskApiKey, providersWithKeys } from "@/lib/ai/aiKeysStorage";
import { CLIENT_MAX_OUTPUT_TOKENS } from "@/lib/ai/clientProviders";
import type { AiStatusResponse } from "@shared/ai/types";
import type { AiProviderId } from "@shared/ai/types";
import type { UiLocalePreference } from "@shared/i18n/locales";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import { useLocale } from "@/contexts/LocaleContext";
import {
  completeAiOnboarding,
  prefersPlatformAi,
  AI_SETUP_CHANGED_EVENT,
} from "@/lib/ai/aiOnboardingStorage";
import WorkstationSelect from "@/components/WorkstationSelect";
import { cn } from "@/lib/utils";

const TEMPERATURE_OPTIONS = [0, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1] as const;

function withCurrentOption(options: number[], current: number): number[] {
  if (options.includes(current)) return options;
  return [...options, current].sort((a, b) => a - b);
}

function tokenOptions(cap: number, current: number): number[] {
  const base: number[] = [];
  for (let n = 256; n <= cap; n += 256) base.push(n);
  if (!base.includes(cap)) base.push(cap);
  return withCurrentOption(base, Math.min(current, cap));
}

function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-[55%]">
        <div className="font-mono text-[10px] uppercase tracking-wide text-foreground">{label}</div>
        {hint ? <div className="mt-0.5 font-mono text-[9px] leading-snug text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "h-5 w-10 border transition-colors disabled:opacity-40",
        checked ? "border-accent bg-accent" : "border-border bg-secondary",
      )}
    />
  );
}

export interface AiSettingsSectionProps {
  workstation?: WorkstationId;
  settings: AiClientSettings;
  aiKeysSettings: AiKeysSettings;
  status: AiStatusResponse | null;
  statusLoading: boolean;
  isSending: boolean;
  aiConfigured: boolean;
  usingClientKeys: boolean;
  onChange: (patch: Partial<AiClientSettings>) => void;
  onKeysChange: (patch: Partial<AiKeysSettings>) => void;
  onClearKeys: () => void;
  onReset: () => void;
  onRefreshStatus: () => void;
  onTestConnection: () => void;
  onClearChat: () => void;
}

export default function AiSettingsSection({
  workstation = "helix",
  settings,
  aiKeysSettings,
  status,
  statusLoading,
  isSending,
  aiConfigured,
  usingClientKeys,
  onChange,
  onKeysChange,
  onClearKeys,
  onReset,
  onRefreshStatus,
  onTestConnection,
  onClearChat,
}: AiSettingsSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { uiLocale, setUiLocale, supportedLocales, localeLabels } = useLocale();
  const clientProviders = providersWithKeys(aiKeysSettings.keys);
  const platformMode = prefersPlatformAi();
  const serverProviders = status?.available_providers ?? [];
  const providerOptions: AiProviderId[] = usingClientKeys
    ? ["auto", ...clientProviders]
    : ["auto", ...serverProviders];
  const maxTokensCap = usingClientKeys
    ? CLIENT_MAX_OUTPUT_TOKENS
    : (status?.max_output_tokens ?? 1024);

  const providerLabel = (p: AiProviderId) => t(`ai.providers.${p}`);

  const handleResponseLanguageChange = (lang: AiClientSettings["responseLanguage"]) => {
    onChange({ responseLanguage: lang });
  };

  const setAiSource = (mode: "byok" | "platform") => {
    onKeysChange({ useOwnApiKeys: mode === "byok" });
    completeAiOnboarding(mode);
    window.dispatchEvent(new CustomEvent(AI_SETUP_CHANGED_EVENT));
    onRefreshStatus();
  };

  return (
    <div className="space-y-4">
      <div className="workbench-panel-inset p-3">
        <div className="workbench-kicker mb-1">{t("ai.source")}</div>
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-muted-foreground">{t("ai.sourceHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAiSource("platform")}
            className={cn(
              "border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
              platformMode
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {t("ai.sourcePlatform")}
          </button>
          <button
            type="button"
            onClick={() => setAiSource("byok")}
            className={cn(
              "border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
              !platformMode
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {t("ai.sourceByok")}
          </button>
        </div>
      </div>

      <div className="workbench-panel-inset p-3">
        <div className="workbench-kicker mb-1">{t("ai.apiKeys")}</div>
        <p className="mb-3 font-mono text-[9px] leading-relaxed text-muted-foreground">{t("ai.apiKeysHint")}</p>

        <div className="space-y-2">
          {(
            [
              { id: "openai" as const, label: "OpenAI", link: "https://platform.openai.com/api-keys" },
              {
                id: "anthropic" as const,
                label: "Anthropic",
                link: "https://console.anthropic.com/settings/keys",
              },
              { id: "gemini" as const, label: "Google AI", link: "https://aistudio.google.com/apikey" },
              { id: "openrouter" as const, label: "OpenRouter", link: "https://openrouter.ai/keys" },
              {
                id: "huggingface" as const,
                label: "Hugging Face",
                link: "https://huggingface.co/settings/tokens",
              },
            ] as const
          ).map(({ id, label, link }) => (
            <div key={id} className="border-b border-border pb-2 last:border-b-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-foreground">{label}</span>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[9px] text-accent hover:underline"
                >
                  {t("ai.getKey")}
                </a>
              </div>
              <input
                type="password"
                autoComplete="off"
                value={aiKeysSettings.keys[id]}
                placeholder={
                  aiKeysSettings.keys[id]
                    ? t("ai.keySaved", { mask: maskApiKey(aiKeysSettings.keys[id]) })
                    : t("ai.keyPlaceholder", { provider: label })
                }
                onChange={(e) => onKeysChange({ keys: { ...aiKeysSettings.keys, [id]: e.target.value } })}
                className="w-full border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </div>
          ))}
          <button type="button" onClick={onClearKeys} className="btn-compact mt-1">
            {t("ai.clearKeys")}
          </button>
        </div>
      </div>

      <div className="workbench-panel-inset p-3">
        <div className="workbench-kicker mb-2">{t("ai.providerStatus")}</div>
        {statusLoading ? (
          <p className="font-mono text-[10px] text-muted-foreground">{t("ai.checking")}</p>
        ) : usingClientKeys ? (
          <div className="space-y-1 font-mono text-[10px] text-foreground">
            <div>{t("ai.clientActive")}</div>
            <div className="text-muted-foreground">
              {t("ai.available", {
                list: clientProviders.join(", ") || t("ai.none"),
              })}
            </div>
            <div className="text-muted-foreground">
              {t("ai.outputLimits", {
                tokens: status?.max_output_tokens ?? CLIENT_MAX_OUTPUT_TOKENS,
                chars: (status?.max_context_chars ?? 24_000).toLocaleString(),
              })}
            </div>
            <div className="text-muted-foreground">{t("ai.clientKeysNote")}</div>
          </div>
        ) : status?.configured ? (
          <div className="space-y-2 font-mono text-[10px] text-foreground">
            <div>
              {t("ai.active", {
                provider: status.active_provider ?? t("ai.none"),
                model: status.active_provider
                  ? t("ai.activeModel", {
                      model: status.models?.[status.active_provider] ?? "",
                    })
                  : "",
              })}
            </div>
            <div className="text-muted-foreground">
              {t("ai.available", {
                list: (status.available_providers ?? []).join(", ") || t("ai.none"),
              })}
            </div>
            <div className="text-muted-foreground">
              {t("ai.outputLimits", {
                tokens: status.max_output_tokens,
                chars: status.max_context_chars.toLocaleString(),
              })}
            </div>
            {status.provider_health && status.provider_health.length > 0 ? (
              <div className="space-y-1 pt-1">
                <div className="text-foreground">{t("ai.providerHealth")}</div>
                <p className="text-muted-foreground">{t("ai.providerHealthHint")}</p>
                <ul className="space-y-1 text-muted-foreground">
                  {status.provider_health.map((h) => {
                    const cooling = h.cooldown_until != null && h.cooldown_until > Date.now();
                    return (
                      <li key={h.id}>
                        {providerLabel(h.id)} —{" "}
                        {cooling ? t("ai.health.cooldown") : t("ai.health.ready")}
                        {h.models.length
                          ? ` · ${t("ai.health.models", { list: h.models.join(", ") })}`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {t("ai.platformNotConfigured")}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onRefreshStatus} className="btn-compact">
            {t("ai.refreshStatus")}
          </button>
          <button
            type="button"
            onClick={onTestConnection}
            disabled={!aiConfigured || isSending}
            className="btn-compact disabled:opacity-40"
          >
            {t("ai.testConnection")}
          </button>
        </div>
      </div>

      <div>
        <div className="workbench-kicker mb-2 px-1">{t("ai.clientPrefs")}</div>

        <SettingsRow label={t("ai.interfaceLanguage")} hint={t("ai.interfaceLanguageHint")}>
          <WorkstationSelect
            value={uiLocale}
            onValueChange={(v) => void setUiLocale(v as UiLocalePreference)}
            className="min-w-[180px]"
            options={[
              { value: "auto", label: tc("locale.auto") },
              ...supportedLocales.map((code) => ({ value: code, label: localeLabels[code] })),
            ]}
          />
        </SettingsRow>

        <SettingsRow label={t("ai.preferredProvider")} hint={t("ai.preferredProviderHint")}>
          <WorkstationSelect
            value={settings.preferredProvider}
            onValueChange={(v) => onChange({ preferredProvider: v as AiProviderId })}
            className="min-w-[180px]"
            options={providerOptions.map((p) => ({ value: p, label: providerLabel(p) }))}
          />
        </SettingsRow>

        <SettingsRow label={t("ai.responseLanguage")} hint={t("ai.responseLanguageHint")}>
          <WorkstationSelect
            value={settings.responseLanguage}
            onValueChange={(v) =>
              handleResponseLanguageChange(v as AiClientSettings["responseLanguage"])
            }
            className="min-w-[140px]"
            options={[
              { value: "auto", label: t("ai.responseLanguageAuto") },
              ...supportedLocales.map((code) => ({ value: code, label: localeLabels[code] })),
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label={t("ai.temperature")}
          hint={t("ai.temperatureHint", { value: settings.temperature.toFixed(2) })}
        >
          <WorkstationSelect
            value={String(settings.temperature)}
            onValueChange={(v) => onChange({ temperature: parseFloat(v) })}
            options={withCurrentOption([...TEMPERATURE_OPTIONS], settings.temperature).map((v) => ({
              value: String(v),
              label: v.toFixed(2),
            }))}
          />
        </SettingsRow>

        <SettingsRow
          label={t("ai.maxTokens")}
          hint={t("ai.maxTokensHint", {
            value: Math.min(settings.maxOutputTokens, maxTokensCap),
            cap: maxTokensCap,
          })}
        >
          <WorkstationSelect
            value={String(Math.min(settings.maxOutputTokens, maxTokensCap))}
            onValueChange={(v) => onChange({ maxOutputTokens: parseInt(v, 10) })}
            options={tokenOptions(maxTokensCap, settings.maxOutputTokens).map((v) => ({
              value: String(v),
              label: String(v),
            }))}
          />
        </SettingsRow>

        <SettingsRow label={t("ai.compactContext")} hint={t("ai.compactContextHint")}>
          <Toggle checked={settings.compactContext} onChange={(v) => onChange({ compactContext: v })} />
        </SettingsRow>

        {workstation === "phaeleon" ? (
          <p className="px-1 pt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
            {t("ai.phaeleonContextNote")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onClearChat} className="btn-compact">
          {t("ai.clearChat")}
        </button>
        <button type="button" onClick={onReset} className="btn-compact">
          {t("ai.resetDefaults")}
        </button>
      </div>
    </div>
  );
}

export { SettingsRow, Toggle };
