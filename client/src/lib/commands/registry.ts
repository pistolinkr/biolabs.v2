import type { WorkstationId } from "@/lib/settings/workstationTypes";

/** Command palette context: tool workstations or the landing hub. */
export type CommandPaletteScope = WorkstationId | "landing";

export type CommandCategory =
  | "display"
  | "selection"
  | "view"
  | "analysis"
  | "io"
  | "phaeleon"
  | "nav"
  | "assistant";

export interface CommandRegistryEntry {
  id: string;
  cmdId: string;
  category: CommandCategory;
  /** When omitted, command is available on all workstations that register it. */
  workstations?: WorkstationId[];
}

const HELIX_COMMANDS: CommandRegistryEntry[] = [
  { id: "repr-cartoon", cmdId: "repr.cartoon", category: "display" },
  { id: "repr-rope", cmdId: "repr.rope", category: "display" },
  { id: "repr-surface", cmdId: "repr.surface", category: "display" },
  { id: "repr-bs", cmdId: "repr.ballstick", category: "display" },
  { id: "repr-vdw", cmdId: "repr.spacefill", category: "display" },
  { id: "repr-ribbon-alias", cmdId: "repr.ribbon", category: "display" },
  { id: "repr-wire-alias", cmdId: "repr.wireframe", category: "display" },
  { id: "color-chain", cmdId: "color.chainid", category: "display" },
  { id: "color-res", cmdId: "color.residueindex", category: "display" },
  { id: "color-hp", cmdId: "color.hydrophobicity", category: "display" },
  { id: "color-bfac", cmdId: "color.bfactor", category: "display" },
  { id: "color-bfac-gray", cmdId: "color.bfactor.gray", category: "display" },
  { id: "color-es", cmdId: "color.electrostatic", category: "display" },
  { id: "isolate-a", cmdId: "isolate.A", category: "selection" },
  { id: "isolate-b", cmdId: "isolate.B", category: "selection" },
  { id: "isolate-clear", cmdId: "isolate.clear", category: "selection" },
  { id: "fit-selection", cmdId: "view.fit.selection", category: "view" },
  { id: "fit-structure", cmdId: "view.fit.structure", category: "view" },
  { id: "center", cmdId: "view.center", category: "view" },
  { id: "view-readable", cmdId: "view.preset.readable", category: "view" },
  { id: "quality-toggle", cmdId: "view.quality.toggle", category: "view" },
  { id: "fullscreen", cmdId: "view.fullscreen.toggle", category: "view" },
  { id: "confidence-toggle", cmdId: "overlay.confidence.toggle", category: "display" },
  { id: "spin", cmdId: "view.spin.toggle", category: "view" },
  { id: "analysis-ixn", cmdId: "analysis.interactions", category: "analysis" },
  { id: "layout-classic", cmdId: "layout.classic", category: "view" },
  { id: "layout-focus", cmdId: "layout.focus", category: "view" },
  { id: "layout-analysis", cmdId: "layout.analysis", category: "view" },
  { id: "layout-assistant", cmdId: "layout.assistant", category: "view" },
  { id: "layout-compact", cmdId: "layout.compact", category: "view" },
  { id: "layout-reset", cmdId: "layout.reset", category: "view" },
  { id: "export-cif", cmdId: "export.cif", category: "io" },
  { id: "screenshot", cmdId: "screenshot", category: "io" },
  { id: "nav-binary", cmdId: "nav.binary", category: "nav" },
  { id: "nav-phaeleon", cmdId: "nav.phaeleon", category: "nav" },
];

const PHAELEON_COMMANDS: CommandRegistryEntry[] = [
  { id: "phaeleon-analyze", cmdId: "phaeleon.analyze", category: "phaeleon" },
  { id: "phaeleon-clear", cmdId: "phaeleon.clear.session", category: "phaeleon" },
  { id: "phaeleon-swap", cmdId: "phaeleon.swap.drugs", category: "phaeleon" },
  { id: "phaeleon-slot-a", cmdId: "phaeleon.slot.drug1", category: "phaeleon" },
  { id: "phaeleon-slot-b", cmdId: "phaeleon.slot.drug2", category: "phaeleon" },
  { id: "phaeleon-search", cmdId: "phaeleon.search.focus", category: "phaeleon" },
  { id: "phaeleon-fuzzy", cmdId: "phaeleon.fuzzy.toggle", category: "phaeleon" },
  { id: "phaeleon-layout-binary", cmdId: "phaeleon.layout.binary", category: "view" },
  { id: "phaeleon-layout-consult", cmdId: "phaeleon.layout.consult", category: "view" },
  { id: "phaeleon-layout-classic", cmdId: "phaeleon.layout.classic", category: "view" },
  { id: "phaeleon-layout-reset", cmdId: "phaeleon.layout.reset", category: "view" },
  { id: "phaeleon-ai-chat", cmdId: "phaeleon.ai.chat", category: "assistant" },
  { id: "phaeleon-settings", cmdId: "phaeleon.settings.open", category: "phaeleon" },
  { id: "nav-home", cmdId: "nav.home", category: "nav" },
  { id: "nav-binary", cmdId: "nav.binary", category: "nav" },
  { id: "nav-helix", cmdId: "nav.helix", category: "nav" },
];

const SHARED_COMMANDS: CommandRegistryEntry[] = [
  { id: "assistant-chat", cmdId: "assistant.chat.open", category: "assistant" },
];

/** Hub palette — open tools only; no in-tool viewer / analysis actions. */
const LANDING_COMMANDS: CommandRegistryEntry[] = [
  { id: "nav-binary", cmdId: "nav.binary", category: "nav" },
  { id: "nav-helix", cmdId: "nav.helix", category: "nav" },
  { id: "nav-phaeleon", cmdId: "nav.phaeleon", category: "nav" },
];

export function commandsForWorkstation(scope: CommandPaletteScope): CommandRegistryEntry[] {
  if (scope === "landing") {
    return LANDING_COMMANDS;
  }
  if (scope === "phaeleon") {
    return [...PHAELEON_COMMANDS, ...SHARED_COMMANDS];
  }
  return [...HELIX_COMMANDS, ...SHARED_COMMANDS];
}
