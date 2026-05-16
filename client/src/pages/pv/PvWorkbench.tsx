import React, { useRef, useState } from "react";
import WorkstationLayout from "@/components/WorkstationLayout";
import ViewportContainer from "@/components/ViewportContainer";
import LeftWorkstationPanel from "@/components/workbench/LeftWorkstationPanel";
import RightWorkstationPanel from "@/components/workbench/RightWorkstationPanel";
import SequenceStrip from "@/components/workbench/SequenceStrip";
import ViewportOverlays from "@/components/workbench/ViewportOverlays";
import ViewportFloatingToolbar from "@/components/workbench/ViewportFloatingToolbar";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import ScientificHUD from "@/components/ScientificHUD";
import StructureViewport from "@/components/StructureViewport";
import PipelineRunBar from "@/components/workbench/PipelineRunBar";
import JobRail from "@/components/workbench/JobRail";
import MsaWorkflowStrip from "@/components/workbench/MsaWorkflowStrip";
import { useViewer } from "@/contexts/ViewerContext";
import PvChromeHeader from "@/pages/pv/PvChromeHeader";

/** Full PV workbench (viewport + rails). Providers live in `PvShell`. */
export default function PvWorkbench() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { proteinSelection, setViewportShell } = useViewer();
  const canvasHudBoundsRef = useRef<HTMLDivElement>(null);

  const setViewportAndHudRef = (el: HTMLDivElement | null) => {
    canvasHudBoundsRef.current = el;
    setViewportShell(el);
  };

  const bottomPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <JobRail />
    </div>
  );

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#0A0A0A]">
      <PvChromeHeader
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      {proteinSelection ? (
        <div
          className="shrink-0 border-b border-[#2A2A2A] bg-[#111111] px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A]"
          title={proteinSelection.label}
        >
          <span className="text-[#F2F2F2]">Loaded</span>
          {" · "}
          {proteinSelection.source} {proteinSelection.id}
          {proteinSelection.pdbIds?.length ? (
            <span className="ml-2 normal-case">PDB: {proteinSelection.pdbIds.slice(0, 5).join(", ")}</span>
          ) : null}
        </div>
      ) : null}
      <PipelineRunBar />
      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkstationLayout
          leftPanel={<LeftWorkstationPanel />}
          centerPanel={
            <div
              ref={setViewportAndHudRef}
              className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none"
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <ViewportContainer>
                  <div className="relative h-full w-full min-h-0 overflow-hidden">
                    <StructureViewport className="absolute inset-0" />
                    <ViewportOverlays />
                    <ViewportFloatingToolbar />
                  </div>
                </ViewportContainer>
                <ScientificHUD
                  visible={true}
                  position="top-right"
                  canvasRef={canvasHudBoundsRef}
                  dockInsidePanel
                />
              </div>
              <SequenceStrip />
              <MsaWorkflowStrip />
            </div>
          }
          rightPanel={<RightWorkstationPanel />}
          bottomPanel={bottomPanel}
          showBottom
        />
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
