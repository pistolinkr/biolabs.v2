/** Shared AI assistant contracts (client + server). */

export type AiProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "huggingface"
  | "auto";

export type AiExplainIntent =
  | "general"
  | "residue"
  | "chain"
  | "domain"
  | "mutation"
  | "structure"
  | "analysis"
  | "selection"
  | "agent";

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Flat context object injected into every AI request. */
export interface AiPlatformContext {
  protein_name: string | null;
  protein_id: string | null;
  protein_source: string | null;
  protein_label: string | null;
  chain: string | null;
  selected_chain: string | null;
  isolated_chain: string | null;
  residue_number: string | null;
  residue_name: string | null;
  residue_key: string | null;
  domain: string | null;
  mutation: string | null;
  sequence_fragment: string | null;
  full_sequences: Record<string, string> | null;
  nucleic_sequences: Record<string, string> | null;
  annotations: string | null;
  structure_summary: string | null;
  platform_generated_analysis: string | null;
  viewport_state: string | null;
  workflow_state: string | null;
  cached_search_hits: string | null;
  input_drafts: string | null;
  highlighted_region: string | null;
  /** Active workstation: helix (structure) or phaeleon (drug interaction). */
  workstation_id: string | null;
  metadata: Record<string, string | number | boolean | null>;
  /** ISO timestamp when context was assembled. */
  assembled_at: string;
  /** Stable fingerprint for dedup / debugging. */
  context_fingerprint: string;
}

export type AiResponseLanguage = "auto" | "en" | "ko" | "ja" | "zh" | "de" | "fr" | "es";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_NETWORK_ERROR"
  | "AI_ALL_PROVIDERS_FAILED"
  | "AI_REQUEST_INVALID"
  | "AI_EMPTY_RESPONSE"
  | "AI_UNKNOWN";

export interface AiUserErrorPayload {
  error: string;
  code: AiErrorCode;
}

export interface AiGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseLanguage?: AiResponseLanguage;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  context: AiPlatformContext;
  intent?: AiExplainIntent;
  /** Optional provider override (server validates). */
  provider?: AiProviderId;
  generation?: AiGenerationOptions;
}

/** One provider/model attempt made while routing a single chat request. */
export interface AiAttempt {
  provider: AiProviderId;
  model: string;
  /** True when this attempt produced the final answer. */
  ok?: boolean;
  /** Error code when the attempt failed. */
  code?: AiErrorCode;
  /** Set when the candidate was skipped before calling (cooldown). */
  skipped?: "cooldown";
}

export interface AiChatResponse {
  message: string;
  provider: AiProviderId;
  model: string;
  context_fingerprint: string;
  /** Ordered routing trail; present when more than the first candidate was tried. */
  attempts?: AiAttempt[];
  /** True when the answer came from a fallback (not the first-choice candidate). */
  fell_back?: boolean;
}

/** Live health of a single provider for the status panel. */
export interface AiProviderHealth {
  id: AiProviderId;
  models: string[];
  cooldown_until: number | null;
}

export interface AiStatusResponse {
  configured: boolean;
  active_provider: AiProviderId | null;
  available_providers: AiProviderId[];
  models: Partial<Record<AiProviderId, string>>;
  max_output_tokens: number;
  max_context_chars: number;
  server_provider: AiProviderId;
  /** Per-provider model fallback chains. */
  model_chains?: Partial<Record<AiProviderId, string[]>>;
  /** Per-provider live health (cooldown). */
  provider_health?: AiProviderHealth[];
}

/** Agent action types — model returns these in AiAgentPlan.actions. */
export type AiAgentActionType =
  | "search_select"
  | "set_representation"
  | "set_color"
  | "isolate_chain"
  | "spin"
  | "fit_view"
  | "reset_view"
  | "focus_residue"
  | "analyze_structure"
  | "explain_residue"
  | "command";

export interface AiActionSearchSelect {
  type: "search_select";
  query: string;
  database?: "uniprot" | "rcsb";
  structure?: "experimental" | "alphafold" | "auto";
}

export interface AiActionSetRepresentation {
  type: "set_representation";
  representation:
    | "cartoon"
    | "rope"
    | "ribbon"
    | "surface"
    | "ball+stick"
    | "spacefill"
    | "line"
    | "wireframe";
}

export interface AiActionSetColor {
  type: "set_color";
  color:
    | "chainid"
    | "residueindex"
    | "hydrophobicity"
    | "bfactor"
    | "bfactor_gray"
    | "electrostatic";
}

export interface AiActionIsolateChain {
  type: "isolate_chain";
  chain: string | null;
}

export interface AiActionSpin {
  type: "spin";
  enabled: boolean;
}

export interface AiActionFitView {
  type: "fit_view";
}

export interface AiActionResetView {
  type: "reset_view";
}

export interface AiActionFocusResidue {
  type: "focus_residue";
  chain: string;
  resno: number;
}

export interface AiActionAnalyzeStructure {
  type: "analyze_structure";
}

export interface AiActionExplainResidue {
  type: "explain_residue";
  chain: string;
  resno: number;
  prompt?: string;
}

export interface AiActionCommand {
  type: "command";
  cmdId: string;
}

export type AiAction =
  | AiActionSearchSelect
  | AiActionSetRepresentation
  | AiActionSetColor
  | AiActionIsolateChain
  | AiActionSpin
  | AiActionFitView
  | AiActionResetView
  | AiActionFocusResidue
  | AiActionAnalyzeStructure
  | AiActionExplainResidue
  | AiActionCommand;

/** Phaeleon DDI workstation agent actions (intent=agent on /phaeleon). */
export type PhaeleonDrugSlot = "drug1" | "drug2" | "active";

export type PhaeleonReportSectionKey =
  | "emergency"
  | "summary"
  | "mechanism"
  | "expectedEffects"
  | "practicalSteps";

export interface PhaeleonAiActionSearchDrug {
  type: "search_drug";
  query: string;
}

export interface PhaeleonAiActionAssignDrug {
  type: "assign_drug";
  slot: PhaeleonDrugSlot;
  name?: string;
  index?: number;
}

export interface PhaeleonAiActionSearchAssignDrug {
  type: "search_assign_drug";
  query: string;
  slot: PhaeleonDrugSlot;
}

export interface PhaeleonAiActionClearDrug {
  type: "clear_drug";
  slot: "drug1" | "drug2";
}

export interface PhaeleonAiActionSwapDrugs {
  type: "swap_drugs";
}

export interface PhaeleonAiActionSetActiveSlot {
  type: "set_active_slot";
  slot: "drug1" | "drug2";
}

export interface PhaeleonAiActionRunAnalysis {
  type: "run_analysis";
}

export interface PhaeleonAiActionClearSession {
  type: "clear_session";
}

export interface PhaeleonAiActionFocusInspector {
  type: "focus_inspector";
  slot: "drug1" | "drug2";
}

export interface PhaeleonAiActionScrollReport {
  type: "scroll_report";
  section: PhaeleonReportSectionKey;
}

export interface PhaeleonAiActionCommand {
  type: "command";
  cmdId: string;
}

export type PhaeleonAiAction =
  | PhaeleonAiActionSearchDrug
  | PhaeleonAiActionAssignDrug
  | PhaeleonAiActionSearchAssignDrug
  | PhaeleonAiActionClearDrug
  | PhaeleonAiActionSwapDrugs
  | PhaeleonAiActionSetActiveSlot
  | PhaeleonAiActionRunAnalysis
  | PhaeleonAiActionClearSession
  | PhaeleonAiActionFocusInspector
  | PhaeleonAiActionScrollReport
  | PhaeleonAiActionCommand;

export type AgentPlanAction = AiAction | PhaeleonAiAction;

export interface AiAgentPlan {
  reply: string;
  actions: AgentPlanAction[];
}

export type AgentStepStatus = "pending" | "running" | "success" | "error" | "skipped";

export interface AgentStepResult {
  index: number;
  action: AgentPlanAction;
  status: AgentStepStatus;
  label: string;
  detail?: string;
}
