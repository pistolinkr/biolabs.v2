import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Microscope } from "lucide-react";
import WorkstationDockLayout from "@/components/WorkstationDockLayout";
import AIChatSheet from "@/components/assistant/AIChatSheet";
import ExplainPopover from "@/components/assistant/ExplainPopover";
import ViewportAnalysisPanel from "@/components/assistant/ViewportAnalysisPanel";
import HelixHeaderActions, { useHelixWorkspaceShortcuts } from "@/components/helix/HelixHeaderActions";
import ToolShellHeader from "@/components/ToolShellHeader";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import StructureViewport from "@/components/StructureViewport";
import ViewportChrome from "@/components/viewport/ViewportChrome";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { ViewerProvider, useViewer } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { WorkstationLayoutProvider, useWorkstationLayout } from "@/contexts/WorkstationLayoutContext";

/**
 * Helix — protein prediction visualization workstation.
 */
export default function Helix() {
  return (
    <ViewerProvider>
      <WorkflowProvider>
        <AssistantProvider>
          <WorkstationLayoutProvider>
            <HelixChrome />
          </WorkstationLayoutProvider>
        </AssistantProvider>
      </WorkflowProvider>
    </ViewerProvider>
  );
}

function HelixChrome() {
  const { t } = useTranslation("common");
  const { t: tl } = useTranslation("landing");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { proteinSelection, setViewportShell } = useViewer();
  const { density } = useWorkstationLayout();
  const openCommandPalette = () => setCommandPaletteOpen(true);
  const saveWorkspace = useHelixWorkspaceShortcuts(openCommandPalette);
  const setViewportRef = (el: HTMLDivElement | null) => {
    setViewportShell(el);
  };

  return (
    <div
      data-density={density}
      className="workstation-shell flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background text-foreground"
    >
      <ToolShellHeader
        toolName={tl("tools.helix.name")}
        icon={<Microscope size={14} className="text-accent" />}
        onCommandPaletteOpen={openCommandPalette}
        onSettingsOpen={() => setSettingsOpen(true)}
        trailingActions={<HelixHeaderActions onSave={saveWorkspace} />}
      />
      {proteinSelection ? (
        <div
          className="shrink-0 bg-background px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
          title={proteinSelection.label}
        >
          <span className="text-foreground">{t("loaded")}</span>
          {" · "}
          {proteinSelection.source} {proteinSelection.id}
          {proteinSelection.pdbIds?.length ? (
            <span className="ml-2 normal-case">PDB: {proteinSelection.pdbIds.slice(0, 5).join(", ")}</span>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkstationDockLayout
          centerContent={
            <div
              ref={setViewportRef}
              className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <ViewportChrome>
                  <div className="relative h-full min-h-0 w-full overflow-hidden">
                    <StructureViewport className="absolute inset-0" />
                    <ViewportAnalysisPanel />
                  </div>
                </ViewportChrome>
              </div>
            </div>
          }
        />
      </div>
      <CommandPalette
        scope="helix"
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <SettingsPanel workstation="helix" isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AIChatSheet />
      <ExplainPopover />
    </div>
  );
}
