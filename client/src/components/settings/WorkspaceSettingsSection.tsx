import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsRow } from "@/components/settings/AiSettingsSection";
import { useWorkstationLayout } from "@/contexts/WorkstationLayoutContext";
import {
  LAYOUT_PRESET_IDS,
  type LayoutPresetId,
  type WorkstationDensity,
} from "@/lib/workstationLayoutStorage";
import { cn } from "@/lib/utils";

/** Tiny schematic of each preset: left column, viewport, right column with optional split. */
function PresetGlyph({ preset }: { preset: LayoutPresetId }) {
  const cell = "h-full bg-muted-foreground/30";
  const cellStrong = "h-full bg-muted-foreground/55";
  switch (preset) {
    case "focus":
      return (
        <div className="flex h-8 w-14 gap-px border border-border bg-background p-px">
          <div className={cn(cell, "w-1.5")} />
          <div className={cn(cellStrong, "flex-1")} />
          <div className={cn(cell, "w-2")} />
        </div>
      );
    case "analysis":
      return (
        <div className="flex h-8 w-14 gap-px border border-border bg-background p-px">
          <div className={cn(cell, "w-2")} />
          <div className={cn(cellStrong, "flex-1")} />
          <div className={cn(cell, "w-5")} />
        </div>
      );
    case "compact":
      return (
        <div className="flex h-8 w-14 gap-px border border-border bg-background p-px">
          <div className={cn(cell, "w-1.5")} />
          <div className={cn(cellStrong, "flex-1")} />
          <div className={cn(cell, "w-1.5")} />
        </div>
      );
    case "classic":
    default:
      return (
        <div className="flex h-8 w-14 gap-px border border-border bg-background p-px">
          <div className={cn(cell, "w-3")} />
          <div className={cn(cellStrong, "flex-1")} />
          <div className={cn(cell, "w-3")} />
        </div>
      );
  }
}

export default function WorkspaceSettingsSection() {
  const { t } = useTranslation("settings");
  const { activePreset, density, setActivePreset, resetToPreset, setDensity } = useWorkstationLayout();

  const densityOptions: WorkstationDensity[] = ["comfortable", "compact"];

  return (
    <div className="space-y-5">
      <div>
        <div className="workbench-kicker">{t("workspace.layout")}</div>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
          {t("workspace.layoutHint")}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {LAYOUT_PRESET_IDS.map((preset) => {
            const selected = preset === activePreset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setActivePreset(preset)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-3 border px-2.5 py-2 text-left transition-colors",
                  selected
                    ? "border-accent bg-secondary"
                    : "border-border bg-background hover:border-muted-foreground hover:bg-secondary/60",
                )}
              >
                <PresetGlyph preset={preset} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-wide text-foreground">
                    {t(`workspace.presets.${preset}`)}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] leading-snug text-muted-foreground">
                    {t(`workspace.presets.${preset}Hint`)}
                  </div>
                </div>
                {selected ? (
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-wider text-accent">
                    {t("workspace.activeBadge")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={resetToPreset}
          className="btn-compact mt-2"
        >
          {t("workspace.resetLayout")}
        </button>
      </div>

      <div className="space-y-3">
        <div className="workbench-kicker">{t("workspace.appearance")}</div>
        <SettingsRow label={t("workspace.density")} hint={t("workspace.densityHint")}>
          <div className="flex border border-border">
            {densityOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDensity(opt)}
                className={cn(
                  "px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide transition-colors",
                  density === opt
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`workspace.densityOptions.${opt}`)}
              </button>
            ))}
          </div>
        </SettingsRow>
      </div>

      <div className="space-y-3">
        <div className="workbench-kicker">{t("workspace.persistence")}</div>
        <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
          {t("workspace.saveNote")}
        </p>
      </div>
    </div>
  );
}
