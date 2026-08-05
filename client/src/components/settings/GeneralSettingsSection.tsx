import React from "react";
import { useTranslation } from "react-i18next";
import ThemeSelector from "@/components/ThemeSelector";
import WorkstationSelect from "@/components/WorkstationSelect";
import { SettingsRow, Toggle } from "@/components/settings/AiSettingsSection";
import { useLocale } from "@/contexts/LocaleContext";
import { useNavbarFixed } from "@/hooks/useNavbarFixed";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import type { AiResponseLanguage } from "@/lib/ai/aiSettingsStorage";
import type { UiLocalePreference } from "@shared/i18n/locales";
import { resolveUiLocale } from "@shared/i18n/locales";

interface GeneralSettingsSectionProps {
  workstation: WorkstationId;
  onUiLocaleChange: (next: UiLocalePreference) => void;
}

export default function GeneralSettingsSection({ workstation, onUiLocaleChange }: GeneralSettingsSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { uiLocale, resolvedLocale, supportedLocales, localeLabels } = useLocale();
  const [navbarFixed, setNavbarFixed] = useNavbarFixed();

  return (
    <div className="space-y-4">
      <div className="workbench-kicker">{t("general.appearance")}</div>
      <SettingsRow label={tc("locale.label")} hint={tc("locale.hint")}>
        <WorkstationSelect
          value={uiLocale}
          onValueChange={(v) => onUiLocaleChange(v as UiLocalePreference)}
          className="min-w-[160px]"
          options={[
            { value: "auto", label: tc("locale.auto") },
            ...supportedLocales.map((code) => ({ value: code, label: localeLabels[code] })),
          ]}
        />
      </SettingsRow>
      {uiLocale === "auto" ? (
        <p className="px-1 font-mono text-[9px] text-muted-foreground">
          {tc("locale.autoResolved", { locale: localeLabels[resolvedLocale] })}
        </p>
      ) : null}
      <SettingsRow label={t("general.colorTheme")} hint={t("general.colorThemeHint")}>
        <ThemeSelector className="min-w-[140px]" />
      </SettingsRow>
      <SettingsRow label={t("general.navbarFixed")} hint={t("general.navbarFixedHint")}>
        <Toggle checked={navbarFixed} onChange={setNavbarFixed} />
      </SettingsRow>

      {workstation === "helix" ? (
        <>
          <SettingsRow label={t("general.scientificHud")} hint={t("general.scientificHudHint")}>
            <Toggle checked={true} onChange={() => {}} disabled />
          </SettingsRow>
          <p className="font-mono text-[9px] text-muted-foreground">{t("general.viewportNote")}</p>
        </>
      ) : (
        <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">{t("general.phaeleonNote")}</p>
      )}
    </div>
  );
}

export function syncAiResponseLanguageFromUiLocale(
  preference: UiLocalePreference,
  updateAiSettings: (patch: { responseLanguage: AiResponseLanguage }) => void,
): void {
  const resolved = resolveUiLocale(preference);
  if (preference === "auto") {
    updateAiSettings({ responseLanguage: "auto" });
    return;
  }
  if (
    resolved === "en" ||
    resolved === "ko" ||
    resolved === "ja" ||
    resolved === "zh" ||
    resolved === "de" ||
    resolved === "fr" ||
    resolved === "es"
  ) {
    updateAiSettings({ responseLanguage: resolved });
  }
}
