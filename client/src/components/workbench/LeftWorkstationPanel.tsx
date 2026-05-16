import React, { useState } from "react";
import InputWorkspacePanel from "@/components/workbench/InputWorkspacePanel";
import StructureHierarchyPanel from "@/components/workbench/StructureHierarchyPanel";
import VisualizationControlPanel from "@/components/workbench/VisualizationControlPanel";
import ProteinSourcePanel from "@/components/workbench/ProteinSourcePanel";
import { cn } from "@/lib/utils";

type Tab = "input" | "structure" | "display" | "source";

const TABS: { id: Tab; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "structure", label: "Structure" },
  { id: "display", label: "Display" },
  { id: "source", label: "Source" },
];

export default function LeftWorkstationPanel() {
  const [tab, setTab] = useState<Tab>("input");

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#111111]">
      <div className="flex shrink-0 border-b border-[#2A2A2A]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 py-2 font-mono text-[9px] uppercase tracking-[0.14em] ${
              tab === t.id
                ? "border-[#F2F2F2] text-[#F2F2F2]"
                : "border-transparent text-[#8A8A8A] hover:text-[#C8C8C8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Keep all tabs mounted so search / hierarchy / display state survives tab switches */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "input" && "hidden",
          )}
        >
          <InputWorkspacePanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "structure" && "hidden",
          )}
        >
          <StructureHierarchyPanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "display" && "hidden",
          )}
        >
          <VisualizationControlPanel />
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            tab !== "source" && "hidden",
          )}
        >
          <ProteinSourcePanel />
        </div>
      </div>
    </div>
  );
}
