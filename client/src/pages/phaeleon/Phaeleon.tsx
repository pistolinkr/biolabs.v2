import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PanelRight } from "lucide-react";
import ExplainPopover from "@/components/assistant/ExplainPopover";
import CommandPalette from "@/components/CommandPalette";
import PhaeleonLogo from "@/components/phaeleon/PhaeleonLogo";
import PhaeleonAssistantBridge from "@/components/phaeleon/PhaeleonAssistantBridge";
import PhaeleonAssistantEffects from "@/components/phaeleon/PhaeleonAssistantEffects";
import PhaeleonSessionHistoryBridge from "@/components/phaeleon/PhaeleonSessionHistoryBridge";
import PhaeleonAnalysisPanel from "@/components/phaeleon/PhaeleonAnalysisPanel";
import PhaeleonBinaryCanvas from "@/components/phaeleon/PhaeleonBinaryCanvas";
import PhaeleonConsultSplit from "@/components/phaeleon/PhaeleonConsultSplit";
import PhaeleonInputPanel from "@/components/phaeleon/PhaeleonInputPanel";
import PhaeleonInspectorPanel from "@/components/phaeleon/PhaeleonInspectorPanel";
import PhaeleonMinimalInputRail from "@/components/phaeleon/PhaeleonMinimalInputRail";
import PhaeleonRightColumnStack from "@/components/phaeleon/PhaeleonRightColumnStack";
import SettingsPanel from "@/components/SettingsPanel";
import ToolShellHeader from "@/components/ToolShellHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { PhaeleonProvider, usePhaeleon } from "@/contexts/PhaeleonContext";
import { useCompactWorkstation } from "@/hooks/useCompactWorkstation";
import { usePhaeleonAutoAnalyzeOnRailCollapse } from "@/hooks/usePhaeleonAutoAnalyzeOnRailCollapse";
import {
  PHAELEON_INPUT_RAIL_COLLAPSED_PX,
  usePhaeleonInputRailCollapse,
} from "@/hooks/usePhaeleonInputRailCollapse";
import {
  isClassicLayout,
  isConsultLayout,
  layoutStructureOf,
} from "@/lib/phaeleon/phaeleonLayoutMode";
import { ViewerProvider } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { cn } from "@/lib/utils";

export default function Phaeleon() {
  return (
    <ViewerProvider>
      <WorkflowProvider>
        <AssistantProvider>
          <PhaeleonProvider>
            <PhaeleonChrome />
          </PhaeleonProvider>
        </AssistantProvider>
      </WorkflowProvider>
    </ViewerProvider>
  );
}

function PhaeleonChrome() {
  const { t } = useTranslation("phaeleon");
  const { t: tc } = useTranslation("common");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const viewportCompact = useCompactWorkstation();
  const { drug1, drug2, settings, runAnalysis } = usePhaeleon();
  const pairReady = Boolean(drug1 && drug2);
  const structure = layoutStructureOf(settings);
  const slimInput = structure === "binaryCanvas" || structure === "consultSplit";
  const {
    collapsed: inputCollapsed,
    toggleExpanded: toggleInputRail,
    expand: expandInputRail,
    spring: inputRailSpring,
  } = usePhaeleonInputRailCollapse(pairReady);

  usePhaeleonAutoAnalyzeOnRailCollapse({
    enabled: slimInput && !settings.autoAnalyzeOnPair,
    pairReady,
    collapsed: inputCollapsed,
    drug1Name: drug1?.name,
    drug2Name: drug2?.name,
    runAnalysis,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const inputRailWidth =
    slimInput && inputCollapsed ? PHAELEON_INPUT_RAIL_COLLAPSED_PX : settings.inputColumnWidth;

  const gridColumns = (() => {
    switch (structure) {
      case "classicStack":
        return viewportCompact
          ? `${settings.inputColumnWidth}px minmax(0, 1fr)`
          : `${settings.inputColumnWidth}px minmax(0, 1fr) ${settings.rightColumnWidth}px`;
      default:
        return "minmax(0, 1fr)";
    }
  })();

  const renderBody = () => {
    const inputRail = slimInput ? (
      <motion.div
        className="h-full shrink-0 overflow-hidden"
        initial={false}
        animate={{ width: inputRailWidth }}
        transition={inputRailSpring}
      >
        <PhaeleonMinimalInputRail
          collapsed={inputCollapsed}
          onToggleCollapse={toggleInputRail}
          onExpand={expandInputRail}
        />
      </motion.div>
    ) : (
      <PhaeleonInputPanel />
    );

    if (structure === "binaryCanvas") {
      return (
        <>
          {inputRail}
          <div className="min-h-0 min-w-0 flex-1">
            <PhaeleonBinaryCanvas />
          </div>
        </>
      );
    }

    if (structure === "consultSplit") {
      return (
        <>
          {inputRail}
          <PhaeleonConsultSplit />
        </>
      );
    }

    return (
      <>
        {inputRail}
        <PhaeleonAnalysisPanel />
        {isClassicLayout(settings) && !viewportCompact ? <PhaeleonRightColumnStack /> : null}
      </>
    );
  };

  const showPairStrip = drug1 && drug2;

  return (
    <div className="workstation-shell flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <PhaeleonAssistantBridge />
      <PhaeleonSessionHistoryBridge />
      <PhaeleonAssistantEffects />
      <ToolShellHeader
        toolName={t("toolName")}
        icon={<PhaeleonLogo size={16} />}
        onSettingsOpen={() => setSettingsOpen(true)}
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        usePhaeleonAssistant
      />

      {showPairStrip ? (
        <div
          className="shrink-0 bg-background px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
          title={`${drug1.name} + ${drug2.name}`}
        >
          <span className="text-foreground">{tc("loaded")}</span>
          {" · "}
          {drug1.name} + {drug2.name}
        </div>
      ) : null}

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden",
          slimInput ? "flex divide-x divide-border" : "grid divide-x divide-border",
        )}
        style={slimInput ? undefined : { gridTemplateColumns: gridColumns }}
      >
        {renderBody()}
      </div>

      {isClassicLayout(settings) && viewportCompact && isConsultLayout(settings) === false ? (
        <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "fixed bottom-4 right-4 z-40 flex items-center gap-2 border border-border bg-card px-3 py-2",
                "font-mono text-[10px] uppercase tracking-wide text-foreground shadow-md",
                "hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              )}
            >
              <PanelRight size={14} />
              {t("layout.openInspector")}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[min(72vh,640px)] p-0">
            <SheetHeader className="border-b border-border px-3 py-2 text-left">
              <SheetTitle className="text-sm">{t("panels.inspector.title")}</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-3rem)] min-h-0">
              <PhaeleonInspectorPanel />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <SettingsPanel workstation="phaeleon" isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette
        scope="phaeleon"
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <ExplainPopover />
    </div>
  );
}
