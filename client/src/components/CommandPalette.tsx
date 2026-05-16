import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Eye, Layers, Maximize2, Microscope, Monitor, Download, Orbit, Palette, Sparkles } from "lucide-react";
import { useViewerOptional } from "@/contexts/ViewerContext";
import { useAiJobsOptional } from "@/contexts/AiJobsContext";
import type { CreateAiJobBody } from "@/lib/aiApi";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  /** Viewer command when `aiJob` is absent, or ignored when `aiJob` runs first. */
  cmdId: string;
  /** When set, Cmd+K submits this body via Express BFF (`/api/ai/jobs`). */
  aiJob?: CreateAiJobBody;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const viewer = useViewerOptional();
  const ai = useAiJobsOptional();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCmd = useCallback(
    (cmd: Command) => {
      if (cmd.aiJob && ai) {
        void ai.submitJob(cmd.aiJob);
        return;
      }
      if (viewer) {
        viewer.runViewerCommand(cmd.cmdId);
      } else {
        // eslint-disable-next-line no-console
        console.warn("Command palette: viewer or AI context unavailable for this command.");
      }
    },
    [viewer, ai],
  );

  const commands: Command[] = useMemo(
    () => [
      {
        id: "repr-cartoon",
        title: "Representation: cartoon",
        description: "Ribbons / cartoon / main chain trace",
        icon: <Layers size={14} />,
        category: "Display",
        cmdId: "repr.cartoon",
      },
      {
        id: "repr-rope",
        title: "Representation: ribbon (rope)",
        description: "Thin ribbon trace",
        icon: <Layers size={14} />,
        category: "Display",
        cmdId: "repr.rope",
      },
      {
        id: "repr-surface",
        title: "Representation: surface",
        description: "Solvent-accessible surface",
        icon: <Monitor size={14} />,
        category: "Display",
        cmdId: "repr.surface",
      },
      {
        id: "repr-bs",
        title: "Representation: ball & stick",
        description: "Atom/bonds",
        icon: <Microscope size={14} />,
        category: "Display",
        cmdId: "repr.ballstick",
      },
      {
        id: "repr-vdw",
        title: "Representation: spheres",
        description: "Spacefill / van der Waals",
        icon: <Monitor size={14} />,
        category: "Display",
        cmdId: "repr.spacefill",
      },
      {
        id: "repr-ribbon-alias",
        title: "Representation: ribbon (alias)",
        description: "Same as rope trace",
        icon: <Layers size={14} />,
        category: "Display",
        cmdId: "repr.ribbon",
      },
      {
        id: "repr-wire-alias",
        title: "Representation: wireframe (alias)",
        description: "Line / wireframe",
        icon: <Monitor size={14} />,
        category: "Display",
        cmdId: "repr.wireframe",
      },
      {
        id: "color-chain",
        title: "Color by chain",
        description: "Chain ID colors",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.chainid",
      },
      {
        id: "color-res",
        title: "Color by residue index",
        description: "Sequence position ramp",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.residueindex",
      },
      {
        id: "color-hp",
        title: "Color by hydrophobicity",
        description: "Magnitude scale",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.hydrophobicity",
      },
      {
        id: "color-bfac",
        title: "Color by confidence / B-factor",
        description: "Experimental B or pLDDT proxy",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.bfactor",
      },
      {
        id: "color-bfac-gray",
        title: "Color: confidence grey ramp",
        description: "B-factor / pLDDT on muted scale",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.bfactor.gray",
      },
      {
        id: "color-es",
        title: "Color: electrostatic",
        description: "Electrostatic potential colormap",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.electrostatic",
      },
      {
        id: "color-msa-ent",
        title: "Color: MSA entropy (conservation)",
        description: "Requires MSA job + structure on query chain",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.msa.entropy",
      },
      {
        id: "color-msa-gap",
        title: "Color: MSA gap fraction",
        description: "Requires MSA job + structure",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "color.msa.gap",
      },
      {
        id: "isolate-a",
        title: "Isolate chain A",
        description: "Restrict to chain A",
        icon: <Eye size={14} />,
        category: "Selection",
        cmdId: "isolate.A",
      },
      {
        id: "isolate-b",
        title: "Isolate chain B",
        description: "Restrict to chain B",
        icon: <Eye size={14} />,
        category: "Selection",
        cmdId: "isolate.B",
      },
      {
        id: "isolate-clear",
        title: "Clear isolate",
        description: "Show full structure",
        icon: <Eye size={14} />,
        category: "Selection",
        cmdId: "isolate.clear",
      },
      {
        id: "fit-selection",
        title: "Fit to selection / isolate",
        description: "Frame isolated chain or picked residue",
        icon: <Maximize2 size={14} />,
        category: "View",
        cmdId: "view.fit.selection",
      },
      {
        id: "fit-structure",
        title: "Fit full structure",
        description: "Auto-view entire structure",
        icon: <Maximize2 size={14} />,
        category: "View",
        cmdId: "view.fit.structure",
      },
      {
        id: "center",
        title: "Center view",
        description: "Auto view (alias)",
        icon: <Maximize2 size={14} />,
        category: "View",
        cmdId: "view.center",
      },
      {
        id: "view-reset",
        title: "Reset camera",
        description: "Viewer controls reset + autoView",
        icon: <Maximize2 size={14} />,
        category: "View",
        cmdId: "view.reset",
      },
      {
        id: "fullscreen",
        title: "Toggle fullscreen",
        description: "Viewport panel",
        icon: <Monitor size={14} />,
        category: "View",
        cmdId: "view.fullscreen.toggle",
      },
      {
        id: "confidence-toggle",
        title: "Toggle confidence coloring",
        description: "Grayscale B-factor / restore prior scheme",
        icon: <Palette size={14} />,
        category: "Display",
        cmdId: "overlay.confidence.toggle",
      },
      {
        id: "spin",
        title: "Toggle spin",
        description: "Stage autorotation",
        icon: <Orbit size={14} />,
        category: "View",
        cmdId: "view.spin.toggle",
      },
      {
        id: "analysis-ixn",
        title: "Toggle contact overlay (NGL)",
        description: "Non-covalent contact representation (distance-based)",
        icon: <Microscope size={14} />,
        category: "Analysis",
        cmdId: "overlay.contacts.toggle",
      },
      {
        id: "export-cif",
        title: "Export coordinates",
        description: "Download mmCIF / PDB via resolved URL",
        icon: <Download size={14} />,
        category: "I/O",
        cmdId: "export.cif",
      },
      {
        id: "screenshot",
        title: "Screenshot viewport",
        description: "PNG from WebGL canvas",
        icon: <Download size={14} />,
        category: "I/O",
        cmdId: "screenshot",
      },
      {
        id: "run-af3",
        title: "run.af3 — AlphaFold3 (dry)",
        description: "POST /api/ai/jobs · stub input; requires server API key for live",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "alphafold3", input: { cmdPalette: true, entities: [] }, dryRun: true },
      },
      {
        id: "fetch-msa",
        title: "fetch.msa — MSA search (dry)",
        description: "POST /api/ai/jobs · pipeline step placeholder",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "msa_search", input: { cmdPalette: true, query: "MKFL" }, dryRun: true },
      },
      {
        id: "analyze-evo2",
        title: "analyze.evo2 — Evo2 40B (dry)",
        description: "POST /api/ai/jobs · structured annotation panel",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "evo2_40b", input: { cmdPalette: true, sequence: "ATCGATCGATCGATCG", num_tokens: 48 }, dryRun: true },
      },
      {
        id: "gen-boltz",
        title: "gen.boltz — Boltz-2 (dry)",
        description: "POST /api/ai/jobs · PV / generative panels",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "boltz2", input: { cmdPalette: true }, dryRun: true },
      },
      {
        id: "gen-ligand",
        title: "gen.ligand — GenMol (dry)",
        description: "POST /api/ai/jobs · molecule shelf",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "genmol", input: { cmdPalette: true }, dryRun: true },
      },
      {
        id: "ai-local-echo",
        title: "AI: local echo (dry)",
        description: "BFF local_echo — verifies orchestrator without NVIDIA",
        icon: <Sparkles size={14} />,
        category: "AI",
        cmdId: "ai.stub",
        aiJob: { service: "local_echo", input: { from: "palette" }, dryRun: true },
      },
    ],
    [],
  );

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const svc = cmd.aiJob?.service?.toLowerCase() ?? "";
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.cmdId.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q) ||
        svc.includes(q)
      );
    });
  }, [commands, query]);

  const len = filteredCommands.length;

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev + 1) % len);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev === 0 ? len - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          runCmd(cmd);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, len, onClose, runCmd]);

  useEffect(() => {
    setSelectedIndex((i) => (len === 0 ? 0 : Math.min(i, len - 1)));
  }, [len, query]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center pt-20",
        isOpen ? "bg-black/55" : "pointer-events-none hidden",
      )}
      onClick={isOpen ? onClose : undefined}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className="w-full max-w-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] p-2 font-mono">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#6A6A6A]">CMD</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Isolate chain B · surface · electrostatic…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-[13px] text-[#F2F2F2] placeholder-[#5A5A5A] focus:outline-none"
          />
          <span className="text-[10px] text-[#6A6A6A]">ESC</span>
        </div>

        <div className="max-h-96 overflow-y-auto font-mono text-[12px]">
          {len === 0 ? (
            <div className="p-8 text-center text-[#6A6A6A]">No matching commands</div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    runCmd(cmd);
                    onClose();
                  }}
                  className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors ${
                    idx === selectedIndex ? "bg-[#1C1C1C] text-[#F2F2F2]" : "text-[#C8C8C8] hover:bg-[#141414]"
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-[#8A8A8A]">{cmd.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium uppercase tracking-wide">{cmd.title}</div>
                    <div className="text-[10px] text-[#8A8A8A]">{cmd.description}</div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wider text-[#6A6A6A]">
                    {cmd.category}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-[#2A2A2A] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#6A6A6A]">
          <span>↑↓ navigate · enter run</span>
          <span>
            {len} / {commands.length}
          </span>
        </div>
      </div>
    </div>
  );
}
