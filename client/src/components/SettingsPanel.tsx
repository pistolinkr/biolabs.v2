import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import AboutSettingsSection from "@/components/settings/AboutSettingsSection";
import AiSettingsSection from "@/components/settings/AiSettingsSection";
import GeneralSettingsSection, { syncAiResponseLanguageFromUiLocale } from "@/components/settings/GeneralSettingsSection";
import GasterWorkspaceSettingsSection from "@/components/settings/WorkspaceSettingsSection";
import PhaeleonWorkspaceSettingsSection from "@/components/settings/PhaeleonWorkspaceSettingsSection";
import { useAssistant } from "@/contexts/AssistantContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import type { UiLocalePreference } from "@shared/i18n/locales";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "ai" | "workspace" | "about";

interface SettingsPanelProps {
  workstation: WorkstationId;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export default function SettingsPanel({
  workstation,
  isOpen,
  onClose,
  initialTab = "general",
}: SettingsPanelProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { setUiLocale } = useLocale();
  const {
    aiSettings,
    updateAiSettings,
    resetAiSettings,
    aiKeysSettings,
    updateAiKeysSettings,
    clearAiKeys,
    aiConfigured,
    usingClientKeys,
    status,
    statusLoading,
    isSending,
    refreshAiStatus,
    testAiConnection,
    clearMessages,
  } = useAssistant();

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "general", label: t("tabs.general") },
    { id: "ai", label: t("tabs.ai") },
    { id: "workspace", label: t("tabs.workspace") },
    { id: "about", label: t("tabs.about") },
  ];

  const handleUiLocaleChange = (next: UiLocalePreference) => {
    void setUiLocale(next);
    syncAiResponseLanguageFromUiLocale(next, updateAiSettings);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        data-settings-panel
        className="flex h-[min(640px,85vh)] w-[min(920px,calc(100vw-2rem))] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-settings-panel-header
          className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3"
        >
          <div>
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
              {t("title")}
            </h2>
            <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {t(`subtitle.${workstation}`)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-transparent p-1.5 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav className="flex w-[140px] shrink-0 flex-col border-r border-border bg-background">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "border-b border-border px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                  tab === item.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="panel-content min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {tab === "general" && (
              <GeneralSettingsSection workstation={workstation} onUiLocaleChange={handleUiLocaleChange} />
            )}

            {tab === "ai" && (
              <AiSettingsSection
                workstation={workstation}
                settings={aiSettings}
                aiKeysSettings={aiKeysSettings}
                status={status}
                statusLoading={statusLoading}
                isSending={isSending}
                aiConfigured={aiConfigured}
                usingClientKeys={usingClientKeys}
                onChange={updateAiSettings}
                onKeysChange={updateAiKeysSettings}
                onClearKeys={clearAiKeys}
                onReset={resetAiSettings}
                onRefreshStatus={() => void refreshAiStatus()}
                onTestConnection={() => void testAiConnection()}
                onClearChat={clearMessages}
              />
            )}

            {tab === "workspace" &&
              (workstation === "phaeleon" ? (
                <PhaeleonWorkspaceSettingsSection />
              ) : (
                <GasterWorkspaceSettingsSection />
              ))}

            {tab === "about" && <AboutSettingsSection workstation={workstation} />}
          </div>
        </div>

        <div
          data-settings-panel-footer
          className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-4 py-3"
        >
          <button type="button" onClick={onClose} className="btn-compact">
            {tc("actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SettingsTab };
