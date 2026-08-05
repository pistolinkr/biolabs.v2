import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";
import WorkstationSelect from "@/components/WorkstationSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { syncAiResponseLanguageFromUiLocale } from "@/components/settings/GeneralSettingsSection";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import type { UiLocalePreference } from "@shared/i18n/locales";

interface ToolBottomBarQuickSettingsProps {
  workstation: WorkstationId;
  onOpenFullSettings: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Quick settings on the rising toolbar control.
 * Click to open (stable); closes on outside click / Escape / leaving the panel.
 */
export default function ToolBottomBarQuickSettings({
  onOpenFullSettings,
  onOpenChange,
}: ToolBottomBarQuickSettingsProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { uiLocale, supportedLocales, localeLabels, setUiLocale } = useLocale();
  const { updateAiSettings } = useAssistant();
  const [open, setOpen] = useState(false);

  const setMenuOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const onLocaleChange = (next: UiLocalePreference) => {
    void setUiLocale(next);
    syncAiResponseLanguageFromUiLocale(next, updateAiSettings);
  };

  return (
    <Popover open={open} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={tc("actions.settings")}
          aria-label={tc("actions.settings")}
          aria-expanded={open}
          className="rounded-full border border-transparent p-2 text-foreground transition-colors hover:border-border/40 hover:bg-background/30 data-[state=open]:border-border/40 data-[state=open]:bg-background/30"
        >
          <Settings size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="z-[60] w-64 space-y-3 border-border bg-card p-3 shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerLeave={(e) => {
          // Portaled select panels live outside this popover — don't close while choosing.
          const related = e.relatedTarget as Node | null;
          const selectOpen = document.querySelector('[data-slot="select-content"]');
          if (selectOpen && (!related || selectOpen.contains(related) || selectOpen === related)) {
            return;
          }
          if (selectOpen) return;
          setMenuOpen(false);
        }}
      >
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
          {tc("actions.settings")}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {tc("locale.label")}
          </span>
          <WorkstationSelect
            value={uiLocale}
            onValueChange={(v) => onLocaleChange(v as UiLocalePreference)}
            className="w-full min-w-0"
            align="start"
            options={[
              { value: "auto", label: tc("locale.auto") },
              ...supportedLocales.map((code) => ({ value: code, label: localeLabels[code] })),
            ]}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {t("general.colorTheme")}
          </span>
          <ThemeSelector className="w-full min-w-0" />
        </label>

        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onOpenFullSettings();
          }}
          className="w-full border border-border px-2 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          {t("title")}…
        </button>
      </PopoverContent>
    </Popover>
  );
}
