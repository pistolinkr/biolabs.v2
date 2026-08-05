import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import WorkstationDockLayout from "@/components/WorkstationDockLayout";
import BiolabsNav from "@/components/BiolabsNav";
import HelixHeaderActions, { useHelixWorkspaceShortcuts } from "@/components/helix/HelixHeaderActions";
import CommandPalette from "@/components/CommandPalette";
import ScientificHUD from "@/components/ScientificHUD";
import SettingsPanel from "@/components/SettingsPanel";
import StructureViewport from "@/components/StructureViewport";
import ToolBottomBar from "@/components/ToolBottomBar";
import ViewportBottomInfoStrip from "@/components/viewport/ViewportBottomInfoStrip";
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { proteinSelection, setViewportShell } = useViewer();
  const { density } = useWorkstationLayout();
  const openCommandPalette = () => setCommandPaletteOpen(true);
  const saveWorkspace = useHelixWorkspaceShortcuts(openCommandPalette);
  const canvasBoundsRef = useRef<HTMLDivElement | null>(null);
  const setViewportRef = (el: HTMLDivElement | null) => {
    setViewportShell(el);
  };

  return (
    <ToolBottomBar
      variant="docked"
      workstation="helix"
      holdOpen={settingsOpen || commandPaletteOpen}
      onSettingsOpen={() => setSettingsOpen(true)}
      trailing={<HelixHeaderActions onSave={saveWorkspace} />}
    >
      <div
        data-density={density}
        className="workstation-shell flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background text-foreground"
      >
        <BiolabsNav />
        <div className="flex shrink-0 items-center gap-4 border-b border-border bg-background px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          <div className="min-w-0 shrink truncate" title={proteinSelection?.label}>
            {proteinSelection ? (
              <>
                <span className="text-foreground">{t("loaded")}</span>
                {" · "}
                {proteinSelection.source} {proteinSelection.id}
                {proteinSelection.pdbIds?.length ? (
                  <span className="ml-2 normal-case">
                    PDB: {proteinSelection.pdbIds.slice(0, 5).join(", ")}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <ViewportBottomInfoStrip placement="header" className="min-w-0 flex-1" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <WorkstationDockLayout
            centerContent={
              <div
                ref={setViewportRef}
                className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <ViewportChrome>
                    <div
                      ref={canvasBoundsRef}
                      className="relative h-full min-h-0 w-full overflow-hidden"
                    >
                      <StructureViewport className="absolute inset-0" />
                      <ScientificHUD
                        dockInsidePanel
                        canvasRef={canvasBoundsRef}
                        position="top-right"
                      />
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
      </div>
    </ToolBottomBar>
  );
}
