import type { i18n as I18nInstance } from "i18next";
import { SUPPORTED_UI_LOCALES } from "@shared/i18n/locales";
import type { CommandCategory } from "@/lib/commands/registry";

/** Extra aliases always searchable (English + Korean technical terms). */
const COMMAND_ALIASES: Record<string, string[]> = {
  "repr.cartoon": ["cartoon", "ribbon", "trace"],
  "repr.rope": ["rope", "ribbon", "trace"],
  "repr.surface": ["surface", "sas", "msms"],
  "repr.ballstick": ["ball", "stick", "ballstick", "atoms"],
  "repr.spacefill": ["spacefill", "vdw", "spheres"],
  "repr.ribbon": ["ribbon"],
  "repr.wireframe": ["wire", "wireframe", "line"],
  "color.chainid": ["chain", "chainid"],
  "color.residueindex": ["residue", "sequence", "index"],
  "color.hydrophobicity": ["hydrophobic", "hp", "kyte"],
  "color.bfactor": ["bfactor", "confidence", "plddt", "tempfactor"],
  "color.bfactor.gray": ["grey", "gray", "confidence"],
  "color.electrostatic": ["electrostatic", "charge", "coulomb"],
  "isolate.A": ["chain a", "isolate a"],
  "isolate.B": ["chain b", "isolate b"],
  "isolate.clear": ["clear", "show all", "reset isolate"],
  "view.fit.selection": ["fit", "zoom", "selection"],
  "view.fit.structure": ["fit all", "autoview", "structure"],
  "view.center": ["center", "centre", "focus"],
  "view.preset.readable": ["readable", "preset", "default view"],
  "view.quality.toggle": ["quality", "render", "performance"],
  "view.fullscreen.toggle": ["fullscreen", "full screen"],
  "overlay.confidence.toggle": ["confidence overlay"],
  "view.spin.toggle": ["spin", "rotate", "turntable"],
  "analysis.interactions": ["interaction", "contact", "ixn", "distance"],
  "export.cif": ["export", "cif", "mmcif", "download"],
  screenshot: ["screenshot", "png", "image", "capture"],
  "layout.classic": ["classic", "layout", "dock"],
  "layout.focus": ["focus layout", "viewport"],
  "layout.analysis": ["analysis layout", "inspector"],
  "layout.assistant": ["assistant layout", "chat dock"],
  "layout.compact": ["compact layout", "small screen"],
  "layout.reset": ["reset layout", "dock reset"],
  "nav.home": ["home", "landing", "hub", "tools"],
  "nav.helix": ["helix", "protein", "structure", "viewport", "gaster"],
  "nav.binary": ["binary", "ai", "chat", "assistant", "bioengineering"],
  "nav.phaeleon": ["phaeleon", "drug", "ddi", "interaction", "fda"],
  "phaeleon.analyze": ["analyze", "interaction", "ddi", "check", "상호작용", "분석", "약물"],
  "phaeleon.clear.session": ["clear", "reset", "session", "초기화", "세션"],
  "phaeleon.swap.drugs": ["swap", "exchange", "drug a", "drug b", "바꾸기", "교환"],
  "phaeleon.slot.drug1": ["drug a", "slot a", "first drug", "약물 a"],
  "phaeleon.slot.drug2": ["drug b", "slot b", "second drug", "약물 b"],
  "phaeleon.search.focus": ["search", "fda", "find drug", "검색", "약물 검색"],
  "phaeleon.fuzzy.toggle": ["fuzzy", "typo", "spell", "퍼지", "오타"],
  "phaeleon.layout.binary": ["binary layout", "default layout", "fast judgment", "바이너리", "기본"],
  "phaeleon.layout.consult": ["consult layout", "side by side ai", "컨설트", "상담"],
  "phaeleon.layout.classic": ["classic layout", "3 panel", "inspector", "클래식"],
  "phaeleon.layout.reset": ["reset layout", "preset reset", "panel reset", "패널", "초기화"],
  "phaeleon.ai.chat": ["ai", "assistant", "chat", "ask", "어시스턴트", "채팅"],
  "phaeleon.settings.open": ["settings", "preferences", "설정"],
  "assistant.chat.open": ["ai", "assistant", "chat", "open chat"],
};

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/** Build a multilingual search blob for one command (all UI locales + aliases). */
export function buildCommandSearchBlob(
  i18n: I18nInstance,
  cmdId: string,
  category: CommandCategory,
): string {
  const parts: string[] = [cmdId, cmdId.replace(/\./g, " "), ...(COMMAND_ALIASES[cmdId] ?? [])];

  for (const lng of SUPPORTED_UI_LOCALES) {
    parts.push(i18n.t(`items.${cmdId}.title`, { lng, ns: "commands", defaultValue: "" }));
    parts.push(i18n.t(`items.${cmdId}.description`, { lng, ns: "commands", defaultValue: "" }));
    parts.push(i18n.t(`categories.${category}`, { lng, ns: "commands", defaultValue: "" }));
  }

  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function scoreTokenInBlob(token: string, blob: string): number {
  if (!token) return 0;
  if (blob.includes(token)) {
    if (blob.startsWith(token)) return 100;
    if (blob.includes(` ${token}`)) return 80;
    return 60;
  }

  let ti = 0;
  let bi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  while (ti < token.length && bi < blob.length) {
    if (blob[bi] === token[ti]) {
      consecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      ti += 1;
    } else {
      consecutive = 0;
    }
    bi += 1;
  }
  if (ti === token.length) {
    return 20 + Math.min(30, maxConsecutive * 4);
  }
  return 0;
}

/** Score command relevance; 0 = no match. Higher is better. */
export function scoreCommandMatch(searchBlob: string, query: string): number {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return 1;

  let total = 0;
  for (const token of tokens) {
    const tokenScore = scoreTokenInBlob(token, searchBlob);
    if (tokenScore === 0) return 0;
    total += tokenScore;
  }
  return total / tokens.length;
}

export function commandMatchesQuery(searchBlob: string, query: string): boolean {
  return scoreCommandMatch(searchBlob, query) > 0;
}

export function rankCommandsByQuery<T extends { searchBlob: string }>(
  commands: T[],
  query: string,
): T[] {
  const q = query.trim();
  if (!q) return commands;

  return commands
    .map((cmd) => ({ cmd, score: scoreCommandMatch(cmd.searchBlob, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd);
}
