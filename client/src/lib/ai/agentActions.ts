import type {
  AgentPlanAction,
  AgentStepResult,
  AiAction,
  AiAgentPlan,
} from "@shared/ai/types";
import type { ProteinSelection } from "@/lib/proteinApis";
import {
  proteinHitToSelection,
  proteinSelectionKey,
  searchRcsb,
  searchUniProt,
} from "@/lib/proteinApis";
import { normalizeProteinSearchQuery } from "@/lib/proteinSearchQuery";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import type { StructureHierarchyModel } from "@/contexts/ViewerContext";

const REPRESENTATIONS = new Set<VizRepresentationId>([
  "cartoon",
  "rope",
  "ribbon",
  "surface",
  "ball+stick",
  "spacefill",
  "line",
  "wireframe",
]);

const COLORS = new Set<VizColorSchemeId>([
  "chainid",
  "residueindex",
  "hydrophobicity",
  "bfactor",
  "bfactor_gray",
  "electrostatic",
]);

export const WHITELISTED_AGENT_COMMANDS = new Set([
  "repr.cartoon",
  "repr.rope",
  "repr.ribbon",
  "repr.surface",
  "repr.ballstick",
  "repr.spacefill",
  "repr.line",
  "repr.wireframe",
  "color.chainid",
  "color.residueindex",
  "color.hydrophobicity",
  "color.bfactor",
  "color.bfactor.gray",
  "color.electrostatic",
  "isolate.A",
  "isolate.B",
  "isolate.clear",
  "view.center",
  "view.fit.structure",
  "view.fit.selection",
  "view.reset",
  "view.spin.toggle",
  "view.preset.readable",
  "view.quality.toggle",
  "view.preset.nucleic.accent",
  "analysis.interactions",
  "overlay.confidence.toggle",
]);

export interface AgentViewerSnapshot {
  proteinSelection: ProteinSelection | null;
  structureModel: StructureHierarchyModel | null;
}

export interface AgentExecutorDeps {
  getViewer: () => AgentViewerSnapshot;
  setProteinSelection: (s: ProteinSelection | null) => void;
  setRepresentation: (r: VizRepresentationId) => void;
  setColorScheme: (c: VizColorSchemeId) => void;
  setIsolateChainId: (id: string | null) => void;
  setSpinEnabled: (v: boolean) => void;
  setSelectedResidueKey: (k: string | null) => void;
  runViewerCommand: (cmdId: string) => void;
  analyzeStructure: () => Promise<void>;
  explainResidue: (params: { chain: string; resno: number; prompt?: string }) => Promise<string | null>;
  acceptLanguage: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onStepUpdate?: (steps: AgentStepResult[]) => void;
}

function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function parseAction(raw: unknown): AiAction | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "search_select": {
      if (typeof raw.query !== "string" || !raw.query.trim()) return null;
      const database = raw.database === "rcsb" ? "rcsb" : "uniprot";
      const structure =
        raw.structure === "experimental" || raw.structure === "alphafold" || raw.structure === "auto"
          ? raw.structure
          : "auto";
      return { type: "search_select", query: raw.query.trim(), database, structure };
    }
    case "set_representation": {
      const repr = raw.representation;
      if (typeof repr !== "string" || !REPRESENTATIONS.has(repr as VizRepresentationId)) return null;
      return { type: "set_representation", representation: repr as VizRepresentationId };
    }
    case "set_color": {
      const color = raw.color;
      if (typeof color !== "string" || !COLORS.has(color as VizColorSchemeId)) return null;
      return { type: "set_color", color: color as VizColorSchemeId };
    }
    case "isolate_chain": {
      if (raw.chain === null) return { type: "isolate_chain", chain: null };
      if (typeof raw.chain !== "string" || !raw.chain.trim()) return null;
      return { type: "isolate_chain", chain: raw.chain.trim() };
    }
    case "spin": {
      if (typeof raw.enabled !== "boolean") return null;
      return { type: "spin", enabled: raw.enabled };
    }
    case "fit_view":
      return { type: "fit_view" };
    case "reset_view":
      return { type: "reset_view" };
    case "focus_residue": {
      if (typeof raw.chain !== "string" || !raw.chain.trim()) return null;
      const resno = typeof raw.resno === "number" ? raw.resno : Number(raw.resno);
      if (!Number.isFinite(resno) || resno <= 0) return null;
      return { type: "focus_residue", chain: raw.chain.trim(), resno: Math.floor(resno) };
    }
    case "analyze_structure":
      return { type: "analyze_structure" };
    case "explain_residue": {
      if (typeof raw.chain !== "string" || !raw.chain.trim()) return null;
      const resno = typeof raw.resno === "number" ? raw.resno : Number(raw.resno);
      if (!Number.isFinite(resno) || resno <= 0) return null;
      const prompt = typeof raw.prompt === "string" && raw.prompt.trim() ? raw.prompt.trim() : undefined;
      return {
        type: "explain_residue",
        chain: raw.chain.trim(),
        resno: Math.floor(resno),
        prompt,
      };
    }
    case "command": {
      if (typeof raw.cmdId !== "string" || !WHITELISTED_AGENT_COMMANDS.has(raw.cmdId)) return null;
      return { type: "command", cmdId: raw.cmdId };
    }
    default:
      return null;
  }
}

export function parseAgentPlan(text: string): AiAgentPlan {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return { reply: text.trim(), actions: [] };

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!isRecord(parsed)) return { reply: text.trim(), actions: [] };

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : text.trim();
    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const actions = rawActions.map(parseAction).filter((a): a is AiAction => a !== null);
    return { reply: reply || text.trim(), actions };
  } catch {
    return { reply: text.trim(), actions: [] };
  }
}

/** Never show raw agent JSON in chat bubbles — extract reply prose only. */
export function userFacingAgentReply(raw: string, plan: AiAgentPlan): string {
  let reply = plan.reply.trim();
  if (!reply) return raw.trim();

  const looksLikeJson =
    (reply.startsWith("{") && reply.includes('"actions"')) || extractJsonObject(reply) !== null;
  if (looksLikeJson) {
    const nested = parseAgentPlan(reply);
    if (nested.reply && nested.reply !== reply && !nested.reply.startsWith("{")) {
      reply = nested.reply;
    } else if (extractJsonObject(raw)) {
      const fromRaw = parseAgentPlan(raw);
      if (fromRaw.reply && !fromRaw.reply.startsWith("{")) reply = fromRaw.reply;
    }
  }

  if (reply.startsWith("{") && reply.includes('"reply"')) {
    try {
      const o = JSON.parse(extractJsonObject(reply) ?? reply) as { reply?: string };
      if (typeof o.reply === "string" && o.reply.trim()) reply = o.reply.trim();
    } catch {
      /* keep best effort */
    }
  }

  return reply;
}

const SEARCH_INTENT =
  /(?:find|search|look\s*up|load|open|fetch|찾|검색|유니프?롯|uniprot|렌더|render|표시|보여|display|show|로드)/i;
const RENDER_INTENT = /(?:render|랜더|렌더|표시|보여|display|show|visuali[sz]e)/i;
const EXPLAIN_INTENT = /(?:function|역할|기능|설명|tell|explain|알려|what does|무엇)/i;
const NUCLEIC_INTENT = /(?:dna|rna|nucleic|핵산|염색체|chromosome|유전자)/i;
const REFUSAL_INTENT =
  /(?:cannot|can't|unable|없습니다|없어|불가|직접 찾|진행해 주세요|following|다음 중)/i;

function extractResidueRef(text: string): { chain: string; resno: number } | null {
  const match = text.match(/(?:잔기\s*)?([A-Za-z])\s*:\s*(\d+)/);
  if (!match) return null;
  return { chain: match[1].toUpperCase(), resno: parseInt(match[2], 10) };
}

function extractSearchQuery(userText: string): string {
  let q = userText
    .replace(/(?:그리고|and then|then|후에|후|please|해주세요|알려주세요).+$/i, "")
    .replace(/(?:잔기\s*)?[A-Za-z]\s*:\s*\d+.*$/i, "")
    .trim();

  q = q
    .replace(/(?:유니프?롯|uniprot)\s*(?:에서|from|on)?/gi, " ")
    .replace(/(?:찾(?:은|아|어|기)?|검색|search|find|load|fetch)\s*(?:한\s*)?(?:후|after|and)?/gi, " ")
    .replace(/(?:랜더(?:링)?|render(?:ing)?|표시|보여주)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (NUCLEIC_INTENT.test(userText) && /(?:남자|남성|male|man|y\s*chromosome)/i.test(userText)) {
    return "Homo sapiens SRY Y chromosome DNA";
  }
  if (NUCLEIC_INTENT.test(userText) && /(?:남자|남성|male|man)/i.test(userText)) {
    return "Homo sapiens male DNA";
  }
  if (NUCLEIC_INTENT.test(userText)) {
    return q.length >= 4 ? q : "Homo sapiens DNA nucleosome";
  }

  return q.length >= 3 ? q : userText.slice(0, 100).trim();
}

/** Client-side fallback when the model returns prose or empty actions for a control request. */
export function inferAgentActions(userText: string): AiAction[] {
  const text = userText.trim();
  if (!text) return [];

  const actions: AiAction[] = [];
  const wantsSearch = SEARCH_INTENT.test(text);
  const wantsRender = RENDER_INTENT.test(text) || wantsSearch;
  const residue = extractResidueRef(text);
  const wantsExplain = EXPLAIN_INTENT.test(text);

  if (wantsSearch) {
    actions.push({
      type: "search_select",
      query: extractSearchQuery(text),
      database: /rcsb|pdb/i.test(text) ? "rcsb" : "uniprot",
    });
  }

  if (wantsRender) {
    if (NUCLEIC_INTENT.test(text)) {
      actions.push({ type: "set_representation", representation: "line" });
      actions.push({ type: "command", cmdId: "view.preset.nucleic.accent" });
    } else {
      actions.push({ type: "set_representation", representation: "cartoon" });
    }
    actions.push({ type: "fit_view" });
  }

  if (residue) {
    if (!actions.some((a) => a.type === "focus_residue")) {
      actions.push({ type: "focus_residue", chain: residue.chain, resno: residue.resno });
    }
    if (wantsExplain) {
      actions.push({ type: "explain_residue", chain: residue.chain, resno: residue.resno });
    }
  }

  return actions;
}

export function boostAgentPlan(userText: string, plan: AiAgentPlan): AiAgentPlan {
  if (plan.actions.length > 0) return plan;

  const inferred = inferAgentActions(userText);
  if (!inferred.length) return plan;

  const refused = REFUSAL_INTENT.test(plan.reply);
  const reply =
    refused || plan.reply.length > 280 || !extractJsonObject(plan.reply)
      ? userText.match(/[\u3131-\uD79D]/)
        ? "요청하신 검색·렌더·분석을 플랫폼에서 실행합니다."
        : "Executing your search, render, and analysis request on the platform."
      : plan.reply;

  return { reply, actions: inferred };
}

/**
 * Helix BOA5 ask bar — answer questions without mutating the loaded viewport.
 * Isolate / reload / repr swaps from the model often blank the canvas (esp. nucleic).
 */
const ASK_SAFE_ACTION_TYPES = new Set<AiAction["type"]>([
  "focus_residue",
  "explain_residue",
  "analyze_structure",
  "fit_view",
  "reset_view",
]);

const ASK_SAFE_COMMANDS = new Set([
  "view.center",
  "view.fit.structure",
  "view.fit.selection",
  "view.reset",
]);

export function filterAskSafeAgentActions(actions: AgentPlanAction[]): AiAction[] {
  return actions.filter(isHelixAiAction).filter((action) => {
    if (action.type === "command") return ASK_SAFE_COMMANDS.has(action.cmdId);
    return ASK_SAFE_ACTION_TYPES.has(action.type);
  });
}

export function waitForStructureLoaded(
  getViewer: () => AgentViewerSnapshot,
  proteinKey: string,
  timeoutMs = 15_000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const viewer = getViewer();
      const key = viewer.proteinSelection ? proteinSelectionKey(viewer.proteinSelection) : null;
      if (key === proteinKey && viewer.structureModel) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

function actionLabel(action: AiAction, t: AgentExecutorDeps["t"]): string {
  switch (action.type) {
    case "search_select":
      return t("agent.steps.searchSelect", { query: action.query });
    case "set_representation":
      return t("agent.steps.setRepresentation", { representation: action.representation });
    case "set_color":
      return t("agent.steps.setColor", { color: action.color });
    case "isolate_chain":
      return action.chain
        ? t("agent.steps.isolateChain", { chain: action.chain })
        : t("agent.steps.isolateClear");
    case "spin":
      return action.enabled ? t("agent.steps.spinOn") : t("agent.steps.spinOff");
    case "fit_view":
      return t("agent.steps.fitView");
    case "reset_view":
      return t("agent.steps.resetView");
    case "focus_residue":
      return t("agent.steps.focusResidue", { chain: action.chain, resno: action.resno });
    case "analyze_structure":
      return t("agent.steps.analyzeStructure");
    case "explain_residue":
      return t("agent.steps.explainResidue", { chain: action.chain, resno: action.resno });
    case "command":
      return t("agent.steps.command", { cmdId: action.cmdId });
    default:
      return t("agent.steps.unknown");
  }
}

function buildInitialSteps(actions: AiAction[], t: AgentExecutorDeps["t"]): AgentStepResult[] {
  return actions.map((action, index) => ({
    index,
    action,
    status: "pending",
    label: actionLabel(action, t),
  }));
}

function emitSteps(steps: AgentStepResult[], deps: AgentExecutorDeps): void {
  deps.onStepUpdate?.([...steps]);
}

async function executeAction(
  action: AiAction,
  deps: AgentExecutorDeps,
  pendingProteinKey: { current: string | null },
): Promise<{ ok: boolean; detail?: string }> {
  const { t } = deps;

  switch (action.type) {
    case "search_select": {
      const q = normalizeProteinSearchQuery(action.query);
      if (!q) return { ok: false, detail: t("agent.errors.emptyQuery") };

      const hits =
        action.database === "rcsb"
          ? await searchRcsb(q)
          : await searchUniProt(q, { acceptLanguage: deps.acceptLanguage });

      if (!hits.length) return { ok: false, detail: t("agent.errors.noSearchResults", { query: q }) };

      const hit = hits[0];
      const preferred =
        action.structure === "experimental" || action.structure === "alphafold"
          ? action.structure
          : undefined;
      const selection = proteinHitToSelection(hit, preferred ? { preferredStructure: preferred } : undefined);
      deps.setProteinSelection(selection);
      pendingProteinKey.current = proteinSelectionKey(selection);

      const loaded = await waitForStructureLoaded(deps.getViewer, pendingProteinKey.current);
      if (!loaded) {
        return {
          ok: false,
          detail: t("agent.errors.loadTimeout", { id: selection.id }),
        };
      }
      return { ok: true, detail: selection.label };
    }

    case "set_representation": {
      if (pendingProteinKey.current) {
        await waitForStructureLoaded(deps.getViewer, pendingProteinKey.current, 2_000);
      }
      deps.setRepresentation(action.representation);
      return { ok: true };
    }

    case "set_color": {
      deps.setColorScheme(action.color);
      return { ok: true };
    }

    case "isolate_chain": {
      deps.setIsolateChainId(action.chain);
      return { ok: true };
    }

    case "spin": {
      deps.setSpinEnabled(action.enabled);
      return { ok: true };
    }

    case "fit_view": {
      deps.runViewerCommand("view.fit.structure");
      return { ok: true };
    }

    case "reset_view": {
      deps.runViewerCommand("view.reset");
      return { ok: true };
    }

    case "focus_residue": {
      const key = `${action.chain}:${action.resno}`;
      deps.setSelectedResidueKey(key);
      deps.runViewerCommand("view.fit.selection");
      return { ok: true };
    }

    case "analyze_structure": {
      const viewer = deps.getViewer();
      if (!viewer.proteinSelection || !viewer.structureModel) {
        return { ok: false, detail: t("agent.errors.noStructure") };
      }
      await deps.analyzeStructure();
      return { ok: true };
    }

    case "explain_residue": {
      const viewer = deps.getViewer();
      if (!viewer.proteinSelection || !viewer.structureModel) {
        return { ok: false, detail: t("agent.errors.noStructure") };
      }
      deps.setSelectedResidueKey(`${action.chain}:${action.resno}`);
      deps.runViewerCommand("view.fit.selection");
      const prompt =
        action.prompt ??
        `Explain the biological function and structural role of residue ${action.chain}:${action.resno} in the loaded structure.`;
      const answer = await deps.explainResidue({
        chain: action.chain,
        resno: action.resno,
        prompt,
      });
      if (!answer || answer.includes("(AI_")) {
        return { ok: false, detail: answer ?? t("agent.errors.explainFailed") };
      }
      return { ok: true, detail: answer };
    }

    case "command": {
      if (!WHITELISTED_AGENT_COMMANDS.has(action.cmdId)) {
        return { ok: false, detail: t("agent.errors.commandNotAllowed", { cmdId: action.cmdId }) };
      }
      deps.runViewerCommand(action.cmdId);
      return { ok: true };
    }

    default:
      return { ok: false, detail: t("agent.errors.unknownAction") };
  }
}

function isHelixAiAction(action: AgentPlanAction): action is AiAction {
  switch (action.type) {
    case "search_drug":
    case "assign_drug":
    case "search_assign_drug":
    case "clear_drug":
    case "swap_drugs":
    case "set_active_slot":
    case "run_analysis":
    case "clear_session":
    case "focus_inspector":
    case "scroll_report":
      return false;
    case "command":
      return !action.cmdId.startsWith("phaeleon.");
    default:
      return true;
  }
}

export async function executeAgentPlan(
  plan: AiAgentPlan,
  deps: AgentExecutorDeps,
): Promise<{ steps: AgentStepResult[]; appendReply?: string }> {
  const helixActions = plan.actions.filter(isHelixAiAction);
  if (!helixActions.length) return { steps: [] };

  const steps = buildInitialSteps(helixActions, deps.t);
  emitSteps(steps, deps);

  const pendingProteinKey = { current: null as string | null };
  const replyParts: string[] = [];

  for (let i = 0; i < helixActions.length; i += 1) {
    steps[i] = { ...steps[i], status: "running" };
    emitSteps(steps, deps);

    try {
      const result = await executeAction(helixActions[i], deps, pendingProteinKey);
      steps[i] = {
        ...steps[i],
        status: result.ok ? "success" : "error",
        detail: result.detail,
      };
      if (result.ok && helixActions[i].type === "explain_residue" && result.detail) {
        replyParts.push(result.detail);
      }
    } catch (e) {
      steps[i] = {
        ...steps[i],
        status: "error",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    emitSteps(steps, deps);
  }

  return {
    steps,
    appendReply: replyParts.length ? replyParts.join("\n\n") : undefined,
  };
}
