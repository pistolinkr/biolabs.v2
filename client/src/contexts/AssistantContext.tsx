import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { i18n } from "@/i18n";
import { useLocale } from "@/contexts/LocaleContext";
import { useViewer } from "@/contexts/ViewerContext";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { STRUCTURE_ANALYSIS_PROMPT } from "@/lib/ai/structureAnalysisPrompt";
import { appendStructureAnalysisHistory } from "@/lib/ai/structureAnalysisHistory";
import {
  DEFAULT_AI_CLIENT_SETTINGS,
  loadAiClientSettings,
  saveAiClientSettings,
  type AiClientSettings,
} from "@/lib/ai/aiSettingsStorage";
import {
  DEFAULT_AI_KEYS,
  hasAnyClientKey,
  loadAiKeysSettings,
  saveAiKeysSettings,
  type AiKeysSettings,
} from "@/lib/ai/aiKeysStorage";
import { buildClientAiStatus, CLIENT_MAX_OUTPUT_TOKENS } from "@/lib/ai/clientProviders";
import { buildAiPlatformContext } from "@/lib/ai/contextBuilder";
import {
  boostAgentPlan,
  executeAgentPlan,
  filterAskSafeAgentActions,
  parseAgentPlan,
  userFacingAgentReply,
} from "@/lib/ai/agentActions";
import {
  boostPhaeleonAgentPlan,
  executePhaeleonAgentPlan,
  parsePhaeleonAgentPlan,
  type PhaeleonAgentExecutorDeps,
} from "@/lib/phaeleon/phaeleonAgentActions";
import { acceptLanguageForSearch } from "@/lib/proteinSearchQuery";
import {
  appendBoa5SharedTurn,
  loadBoa5WorkstationSharedMessages,
} from "@/lib/ai/binaryChatThreads";
import { fetchAiStatus, sendAiChat } from "@/lib/ai/assistantApi";
import { AI_SETUP_CHANGED_EVENT, prefersPlatformAi } from "@/lib/ai/aiOnboardingStorage";
import { AiRequestError, formatAiUserNotice, noticeFromUnknownError } from "@/lib/ai/userErrors";
import type {
  AgentStepResult,
  AiChatMessage,
  AiExplainIntent,
  AiPlatformContext,
  AiProviderId,
  AiStatusResponse,
} from "@shared/ai/types";

export interface AssistantUiMessage extends AiChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
  agentSteps?: AgentStepResult[];
  agentExecuting?: boolean;
  /** True when the answer was served by a fallback provider/model. */
  fellBack?: boolean;
  /** Provider/model that actually produced this answer. */
  servedBy?: { provider: AiProviderId; model: string };
}

interface RoutingMeta {
  fellBack: boolean;
  provider: AiProviderId;
  model: string;
}

export interface ContextExtensionSlice {
  domain?: string | null;
  mutation?: string | null;
  input_drafts?: string | null;
  annotations?: string | null;
  platform_generated_analysis?: string | null;
  workstation_id?: string | null;
  ui_locale?: string | null;
}

export interface StructureAnalysisActive {
  entryId: string;
  phase: "loading" | "ready" | "error";
  content: string | null;
}

export interface StructureAnalysisState {
  /** Opens the viewport analysis panel (e.g. agent or re-run). */
  panelOpen: boolean;
  active: StructureAnalysisActive | null;
}

interface AssistantContextValue {
  messages: AssistantUiMessage[];
  status: AiStatusResponse | null;
  statusLoading: boolean;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  isSending: boolean;
  lastContext: AiPlatformContext | null;
  buildContext: () => AiPlatformContext;
  sendMessage: (text: string, intent?: AiExplainIntent) => Promise<void>;
  runAgentQuery: (
    text: string,
    options?: {
      mode?: "full" | "ask";
      /** Append Q/A into the shared BOA5 thread (default true). */
      share?: boolean;
    },
  ) => Promise<{
    ok: boolean;
    reply?: string;
    steps?: AgentStepResult[];
    error?: string;
  }>;
  explain: (params: {
    intent: AiExplainIntent;
    prompt: string;
    openChat?: boolean;
    /** When true, never opens assistant chat/history (overrides settings). */
    popoverOnly?: boolean;
    /** When false, skips the global bottom-right explain popover. */
    globalPopover?: boolean;
  }) => Promise<string | null>;
  clearMessages: () => void;
  /** Replace the visible chat thread (e.g. restore per drug-pair history). */
  replaceMessages: (messages: AssistantUiMessage[]) => void;
  registerContextExtension: (slice: ContextExtensionSlice) => () => void;
  registerPhaeleonAgentDeps: (deps: PhaeleonAgentExecutorDeps | null) => () => void;
  /** Popover state for inline explain UI */
  explainPopover: {
    open: boolean;
    title: string;
    content: string | null;
    loading: boolean;
    intent: AiExplainIntent;
  } | null;
  /** Shared floating assistant HUD (bar ask + residue explain). */
  showAssistantHud: (opts: {
    title: string;
    content?: string | null;
    loading?: boolean;
    intent?: AiExplainIntent;
  }) => void;
  closeExplainPopover: () => void;
  aiSettings: AiClientSettings;
  updateAiSettings: (patch: Partial<AiClientSettings>) => void;
  resetAiSettings: () => void;
  aiKeysSettings: AiKeysSettings;
  updateAiKeysSettings: (patch: Partial<AiKeysSettings>) => void;
  clearAiKeys: () => void;
  /** True when server or user API keys can serve requests. */
  aiConfigured: boolean;
  usingClientKeys: boolean;
  /** Refresh status; returns the resolved status snapshot (or null on unexpected failure). */
  refreshAiStatus: () => Promise<AiStatusResponse | null>;
  testAiConnection: () => Promise<boolean>;
  structureAnalysis: StructureAnalysisState;
  analyzeStructure: () => Promise<void>;
  closeStructureAnalysis: () => void;
}

const FALLBACK_AI_STATUS: AiStatusResponse = {
  configured: false,
  active_provider: null,
  available_providers: [],
  models: {},
  max_output_tokens: 2048,
  max_context_chars: 24000,
  server_provider: "auto",
};

function resolveClientAiStatus(keys: AiKeysSettings): AiStatusResponse {
  if (hasAnyClientKey(keys.keys)) {
    return buildClientAiStatus(keys.keys);
  }
  return FALLBACK_AI_STATUS;
}

function isAiConfigured(keys: AiKeysSettings, status: AiStatusResponse | null): boolean {
  // BYOK with browser keys, or platform /.env (status from /api/ai/status).
  if (!prefersPlatformAi() && hasAnyClientKey(keys.keys)) return true;
  return Boolean(status?.configured);
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `ai-${Date.now()}-${msgCounter}`;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const workflow = useWorkflow();
  const { resolvedLocale } = useLocale();

  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastContext, setLastContext] = useState<AiPlatformContext | null>(null);
  const [extensions, setExtensions] = useState<ContextExtensionSlice[]>([]);
  const [explainPopover, setExplainPopover] = useState<AssistantContextValue["explainPopover"]>(null);
  const [structureAnalysis, setStructureAnalysis] = useState<StructureAnalysisState>({
    panelOpen: false,
    active: null,
  });
  const [aiSettings, setAiSettings] = useState<AiClientSettings>(() => loadAiClientSettings());
  const [aiKeysSettings, setAiKeysSettings] = useState<AiKeysSettings>(() => loadAiKeysSettings());

  const viewerRef = useRef(viewer);
  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  const phaeleonAgentDepsRef = useRef<PhaeleonAgentExecutorDeps | null>(null);

  /** Routing trail of the most recent runChat call (for fallback UI hints). */
  const lastRoutingRef = useRef<RoutingMeta | null>(null);

  const mergedExtensions = useMemo(() => {
    const out: ContextExtensionSlice = {};
    for (const ext of extensions) {
      if (ext.domain) out.domain = ext.domain;
      if (ext.mutation) out.mutation = ext.mutation;
      if (ext.input_drafts) out.input_drafts = ext.input_drafts;
      if (ext.annotations) out.annotations = ext.annotations;
      if (ext.platform_generated_analysis) out.platform_generated_analysis = ext.platform_generated_analysis;
      if (ext.workstation_id) out.workstation_id = ext.workstation_id;
      if (ext.ui_locale) out.ui_locale = ext.ui_locale;
    }
    return out;
  }, [extensions]);

  const buildContext = useCallback((): AiPlatformContext => {
    return buildAiPlatformContext({
      proteinSelection: viewer.proteinSelection,
      structureModel: viewer.structureModel,
      selectedResidueKey: viewer.selectedResidueKey,
      viewportPickDetail: viewer.viewportPickDetail,
      isolateChainId: viewer.isolateChainId,
      hoverChainId: viewer.hoverChainId,
      polymerContextSnapshot: viewer.polymerContextSnapshot,
      representation: viewer.representation,
      colorScheme: viewer.colorScheme,
      contextContactRadiusAngstrom: viewer.contextContactRadiusAngstrom,
      polymerInteractionOverlayEnabled: viewer.polymerInteractionOverlayEnabled,
      nucleicBackboneAccentEnabled: viewer.nucleicBackboneAccentEnabled,
      renderOptions: { ...viewer.renderOptions },
      measurementMode: viewer.measurementMode,
      focusResidueQuery: viewer.focusResidueQuery,
      selectedSequencePolymerKind: viewer.selectedSequencePolymerKind,
      workflow: {
        focusedStage: workflow.focusedStage,
        stageStatuses: workflow.stageStatuses,
        contextualHint: workflow.contextualHint,
        runningJobs: workflow.runningJobs,
        queueDepth: workflow.queueDepth,
        workflowSourceSummary: workflow.workflowSourceSummary,
      },
      // Always attach UI locale so responseLanguage "auto" follows the app language
      // (Helix has no Phaeleon-style bridge; without this, English prompts force English answers).
      extensions: {
        ...mergedExtensions,
        ui_locale: mergedExtensions.ui_locale ?? resolvedLocale,
      },
      contextOptions: {
        includeFullSequences: aiSettings.includeFullSequences,
        compactContext: aiSettings.compactContext,
      },
    });
  }, [
    viewer,
    workflow,
    mergedExtensions,
    resolvedLocale,
    aiSettings.includeFullSequences,
    aiSettings.compactContext,
  ]);

  const registerContextExtension = useCallback((slice: ContextExtensionSlice) => {
    setExtensions((prev) => [...prev, slice]);
    return () => {
      setExtensions((prev) => prev.filter((s) => s !== slice));
    };
  }, []);

  const registerPhaeleonAgentDeps = useCallback((deps: PhaeleonAgentExecutorDeps | null) => {
    phaeleonAgentDepsRef.current = deps;
    return () => {
      if (phaeleonAgentDepsRef.current === deps) {
        phaeleonAgentDepsRef.current = null;
      }
    };
  }, []);

  const refreshAiStatus = useCallback(async (): Promise<AiStatusResponse | null> => {
    setStatusLoading(true);
    try {
      const latestKeys = loadAiKeysSettings();
      setAiKeysSettings(latestKeys);

      // Platform (default): always resolve from server /.env status.
      // BYOK: browser keys when present; otherwise still probe server as fallback.
      if (!prefersPlatformAi() && hasAnyClientKey(latestKeys.keys)) {
        const clientStatus = buildClientAiStatus(latestKeys.keys);
        setStatus(clientStatus);
        return clientStatus;
      }

      try {
        const server = await fetchAiStatus();
        setStatus(server);
        return server;
      } catch {
        const fallback = hasAnyClientKey(latestKeys.keys)
          ? buildClientAiStatus(latestKeys.keys)
          : FALLBACK_AI_STATUS;
        setStatus(fallback);
        return fallback;
      }
    } catch {
      setStatus(FALLBACK_AI_STATUS);
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAnyClientKey(aiKeysSettings.keys) && !prefersPlatformAi()) {
      setStatus(resolveClientAiStatus(aiKeysSettings));
    }
  }, [aiKeysSettings]);

  useEffect(() => {
    void refreshAiStatus();
  }, [refreshAiStatus]);

  useEffect(() => {
    const onSetupChanged = () => {
      void refreshAiStatus();
    };
    window.addEventListener(AI_SETUP_CHANGED_EVENT, onSetupChanged);
    return () => window.removeEventListener(AI_SETUP_CHANGED_EVENT, onSetupChanged);
  }, [refreshAiStatus]);

  const updateAiKeysSettings = useCallback((patch: Partial<AiKeysSettings>) => {
    setAiKeysSettings((prev) => {
      const next: AiKeysSettings = {
        ...prev,
        ...patch,
        keys: patch.keys ? { ...prev.keys, ...patch.keys } : prev.keys,
      };
      saveAiKeysSettings(next);
      if (hasAnyClientKey(next.keys) && !prefersPlatformAi()) {
        setStatus(buildClientAiStatus(next.keys));
      }
      return next;
    });
  }, []);

  const clearAiKeys = useCallback(() => {
    const next = { ...DEFAULT_AI_KEYS, keys: { ...DEFAULT_AI_KEYS.keys } };
    setAiKeysSettings(next);
    saveAiKeysSettings(next);
    setStatus(FALLBACK_AI_STATUS);
    void refreshAiStatus();
  }, [refreshAiStatus]);

  const updateAiSettings = useCallback((patch: Partial<AiClientSettings>) => {
    setAiSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAiClientSettings(next);
      return next;
    });
  }, []);

  const resetAiSettings = useCallback(() => {
    const next = { ...DEFAULT_AI_CLIENT_SETTINGS };
    setAiSettings(next);
    saveAiClientSettings(next);
  }, []);

  const usingClientKeys = hasAnyClientKey(aiKeysSettings.keys) && !prefersPlatformAi();
  const aiConfigured = isAiConfigured(aiKeysSettings, status);

  const runChat = useCallback(
    async (userText: string, intent: AiExplainIntent, history: AssistantUiMessage[]) => {
      if (!isAiConfigured(aiKeysSettings, status)) {
        toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
          description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
        });
        return null;
      }

      const context = buildContext();
      setLastContext(context);

      const chatHistory: AiChatMessage[] = [
        ...history
          .filter((m) => !m.pending && !m.error && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
      ];

      const tokenCap = Math.max(CLIENT_MAX_OUTPUT_TOKENS, aiSettings.maxOutputTokens);
      const explainIntent =
        intent !== "general" && intent !== "agent";
      const requestedTokens = explainIntent
        ? Math.max(aiSettings.maxOutputTokens, 2048)
        : aiSettings.maxOutputTokens;

      const response = await sendAiChat({
        messages: chatHistory,
        context,
        intent,
        provider: aiSettings.preferredProvider,
        generation: {
          temperature: aiSettings.temperature,
          maxOutputTokens: Math.min(requestedTokens, tokenCap),
          responseLanguage: aiSettings.responseLanguage,
        },
        clientKeys: aiKeysSettings.keys,
        useOwnApiKeys: !prefersPlatformAi(),
      });
      lastRoutingRef.current = {
        fellBack: Boolean(response.fell_back),
        provider: response.provider,
        model: response.model,
      };
      return response.message;
    },
    [buildContext, aiKeysSettings, aiSettings, status],
  );

  const explain = useCallback(
    async ({
      intent,
      prompt,
      openChat = false,
      popoverOnly = false,
      globalPopover = true,
    }: {
      intent: AiExplainIntent;
      prompt: string;
      openChat?: boolean;
      popoverOnly?: boolean;
      globalPopover?: boolean;
    }) => {
      const shouldOpenChat = !popoverOnly && (openChat || aiSettings.autoOpenChatOnExplain);

      if (globalPopover) {
        setExplainPopover({
          open: true,
          title: intent === "residue" || intent === "agent" ? "BOA5" : intent.charAt(0).toUpperCase() + intent.slice(1),
          content: null,
          loading: true,
          intent,
        });
      }

      if (shouldOpenChat) setChatOpen(true);

      setIsSending(true);
      try {
        const answer = await runChat(prompt, intent, []);
        if (answer) {
          if (globalPopover) {
            setExplainPopover((prev) =>
              prev ? { ...prev, content: answer, loading: false } : prev,
            );
          }
          if (shouldOpenChat) {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "user", content: prompt },
              { id: nextId(), role: "assistant", content: answer },
            ]);
          }
        } else if (globalPopover) {
          setExplainPopover(null);
        }
        return answer;
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        if (globalPopover) {
          setExplainPopover((prev) =>
            prev ? { ...prev, content: notice, loading: false } : prev,
          );
          toast.error(i18n.t("toasts.explainUnavailable", { ns: "assistant" }), { description: notice });
        }
        return globalPopover ? null : notice;
      } finally {
        setIsSending(false);
      }
    },
    [runChat, aiSettings.autoOpenChatOnExplain],
  );

  const testAiConnection = useCallback(async () => {
    if (!isAiConfigured(aiKeysSettings, status)) {
      toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
        description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
      });
      return false;
    }
    try {
      const context = buildContext();
      await sendAiChat({
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        context,
        intent: "general",
        provider: aiSettings.preferredProvider,
        generation: {
          temperature: 0,
          maxOutputTokens: 16,
          responseLanguage: "en",
        },
        clientKeys: aiKeysSettings.keys,
        useOwnApiKeys: !prefersPlatformAi(),
      });
      toast.success(i18n.t("toasts.connectionOk", { ns: "assistant" }));
      return true;
    } catch (e) {
      const notice = e instanceof AiRequestError
        ? formatAiUserNotice(e.code, e.message)
        : noticeFromUnknownError(e);
      toast.error(i18n.t("toasts.connectionFailed", { ns: "assistant" }), { description: notice });
      return false;
    }
  }, [aiKeysSettings, buildContext, aiSettings.preferredProvider, status]);

  const closeStructureAnalysis = useCallback(() => {
    setStructureAnalysis((prev) => ({ ...prev, panelOpen: false }));
  }, []);

  const analyzeStructure = useCallback(async () => {
    const selection = viewer.proteinSelection;
    if (!selection || !viewer.structureModel) {
      toast.message(i18n.t("toastTitles.viewport", { ns: "viewport" }), {
        description: i18n.t("toasts.noStructure", { ns: "viewport" }),
      });
      return;
    }
    if (!isAiConfigured(aiKeysSettings, status)) {
      toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
        description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
      });
      return;
    }

    const proteinKey = proteinSelectionKey(selection);
    const proteinLabel =
      selection.label.length > 80 ? `${selection.label.slice(0, 77)}…` : selection.label;
    const entryId = `sa-${Date.now()}`;
    const promptLabel = i18n.t("structureAnalysis.runLabel", { ns: "assistant" });

    setStructureAnalysis({
      panelOpen: true,
      active: { entryId, phase: "loading", content: null },
    });

    const answer = await explain({
      intent: "structure",
      prompt: STRUCTURE_ANALYSIS_PROMPT,
      popoverOnly: true,
      globalPopover: false,
    });

    if (!answer) {
      const notice = formatAiUserNotice("AI_UNKNOWN", i18n.t("structureAnalysis.failed", { ns: "assistant" }));
      appendStructureAnalysisHistory(proteinKey, {
        id: entryId,
        proteinKey,
        proteinLabel,
        prompt: promptLabel,
        answer: notice,
        error: true,
        createdAt: new Date().toISOString(),
      });
      setStructureAnalysis({
        panelOpen: true,
        active: { entryId, phase: "error", content: notice },
      });
      return;
    }

    const isError = answer.includes("(AI_");
    appendStructureAnalysisHistory(proteinKey, {
      id: entryId,
      proteinKey,
      proteinLabel,
      prompt: promptLabel,
      answer,
      error: isError,
      createdAt: new Date().toISOString(),
    });
    setStructureAnalysis({
      panelOpen: true,
      active: {
        entryId,
        phase: isError ? "error" : "ready",
        content: answer,
      },
    });
  }, [
    viewer.proteinSelection,
    viewer.structureModel,
    status,
    aiKeysSettings,
    explain,
  ]);

  const runAgent = useCallback(
    async (userText: string, history: AssistantUiMessage[], pendingId: string) => {
      const ctx = buildContext();
      const onPhaeleon = ctx.workstation_id === "phaeleon" || ctx.domain?.startsWith("phaeleon");

      const raw = await runChat(userText, "agent", history);
      if (!raw) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        return;
      }
      const routing = lastRoutingRef.current;

      const plan = onPhaeleon
        ? boostPhaeleonAgentPlan(userText, parsePhaeleonAgentPlan(raw))
        : boostAgentPlan(userText, parseAgentPlan(raw));
      const displayReply = userFacingAgentReply(raw, plan);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content: displayReply,
                pending: false,
                agentExecuting: plan.actions.length > 0,
                agentSteps: plan.actions.length > 0 ? [] : undefined,
                fellBack: routing?.fellBack,
                servedBy: routing
                  ? { provider: routing.provider, model: routing.model }
                  : undefined,
              }
            : m,
        ),
      );

      if (!plan.actions.length) return;

      if (onPhaeleon) {
        const deps = phaeleonAgentDepsRef.current;
        if (!deps) return;

        try {
          await executePhaeleonAgentPlan(plan, {
            ...deps,
            onStepUpdate: (steps) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === pendingId ? { ...m, agentSteps: steps, agentExecuting: true } : m,
                ),
              );
            },
          });
        } finally {
          setMessages((prev) =>
            prev.map((m) => (m.id === pendingId ? { ...m, agentExecuting: false } : m)),
          );
        }
        return;
      }

      const uiLocale = i18n.language?.split("-")[0] ?? "en";
      const acceptLanguage = acceptLanguageForSearch(uiLocale);

      const explainResidue = async (params: { chain: string; resno: number; prompt?: string }) => {
        const prompt =
          params.prompt ??
          `Explain the biological function and structural role of residue ${params.chain}:${params.resno} in the loaded structure.`;
        return runChat(prompt, "residue", []);
      };

      try {
        const { appendReply } = await executeAgentPlan(plan, {
          getViewer: () => ({
            proteinSelection: viewerRef.current.proteinSelection,
            structureModel: viewerRef.current.structureModel,
          }),
          setProteinSelection: viewerRef.current.setProteinSelection,
          setRepresentation: viewerRef.current.setRepresentation,
          setColorScheme: viewerRef.current.setColorScheme,
          setIsolateChainId: viewerRef.current.setIsolateChainId,
          setSpinEnabled: viewerRef.current.setSpinEnabled,
          setSelectedResidueKey: viewerRef.current.setSelectedResidueKey,
          runViewerCommand: viewerRef.current.runViewerCommand,
          analyzeStructure,
          explainResidue,
          acceptLanguage,
          t: (key, opts) => i18n.t(key, { ns: "assistant", ...opts }),
          onStepUpdate: (steps) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId ? { ...m, agentSteps: steps, agentExecuting: true } : m,
              ),
            );
          },
        });

        if (appendReply) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...m, content: `${displayReply}\n\n${appendReply}` } : m,
            ),
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, agentExecuting: false } : m)),
        );
      }
    },
    [runChat, analyzeStructure, buildContext],
  );

  const runAgentQuery = useCallback(
    async (
      text: string,
      options?: { mode?: "full" | "ask"; share?: boolean },
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: "empty" };
      if (!isAiConfigured(aiKeysSettings, status)) {
        return { ok: false, error: formatAiUserNotice("AI_NOT_CONFIGURED") };
      }

      const askMode = options?.mode === "ask";
      const share = options?.share !== false;
      /** Dedicated workstation→BOA5 chat (not an already-existing Binary thread). */
      const sharedHistory = loadBoa5WorkstationSharedMessages().slice(-40);

      const finish = (result: {
        ok: boolean;
        reply?: string;
        steps?: AgentStepResult[];
        error?: string;
      }) => {
        if (share && result.ok && result.reply?.trim()) {
          appendBoa5SharedTurn(trimmed, result.reply.trim());
        }
        return result;
      };

      try {
        const ctx = buildContext();
        const onPhaeleon = ctx.workstation_id === "phaeleon" || ctx.domain?.startsWith("phaeleon");
        const raw = await runChat(trimmed, "agent", sharedHistory);
        if (!raw) return { ok: false, error: "no_response" };

        const plan = onPhaeleon
          ? boostPhaeleonAgentPlan(trimmed, parsePhaeleonAgentPlan(raw))
          : (() => {
              const helixPlan = boostAgentPlan(trimmed, parseAgentPlan(raw));
              return askMode
                ? { ...helixPlan, actions: filterAskSafeAgentActions(helixPlan.actions) }
                : helixPlan;
            })();
        const displayReply = userFacingAgentReply(raw, plan);
        if (!plan.actions.length) {
          return finish({ ok: true, reply: displayReply, steps: [] });
        }

        if (onPhaeleon) {
          const deps = phaeleonAgentDepsRef.current;
          if (!deps) return finish({ ok: true, reply: displayReply, steps: [] });
          const { steps } = await executePhaeleonAgentPlan(plan, deps);
          return finish({ ok: true, reply: displayReply, steps });
        }

        const uiLocale = i18n.language?.split("-")[0] ?? "en";
        const acceptLanguage = acceptLanguageForSearch(uiLocale);
        const explainResidue = async (params: { chain: string; resno: number; prompt?: string }) => {
          const prompt =
            params.prompt ??
            `Explain the biological function and structural role of residue ${params.chain}:${params.resno} in the loaded structure.`;
          return runChat(prompt, "residue", sharedHistory);
        };

        const { steps, appendReply } = await executeAgentPlan(plan, {
          getViewer: () => ({
            proteinSelection: viewerRef.current.proteinSelection,
            structureModel: viewerRef.current.structureModel,
          }),
          setProteinSelection: viewerRef.current.setProteinSelection,
          setRepresentation: viewerRef.current.setRepresentation,
          setColorScheme: viewerRef.current.setColorScheme,
          setIsolateChainId: viewerRef.current.setIsolateChainId,
          setSpinEnabled: viewerRef.current.setSpinEnabled,
          setSelectedResidueKey: viewerRef.current.setSelectedResidueKey,
          runViewerCommand: viewerRef.current.runViewerCommand,
          analyzeStructure,
          explainResidue,
          acceptLanguage,
          t: (key, opts) => i18n.t(key, { ns: "assistant", ...opts }),
        });

        const reply = appendReply ? `${displayReply}\n\n${appendReply}` : displayReply;
        return finish({ ok: true, reply, steps });
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        return { ok: false, error: notice };
      }
    },
    [runChat, status, aiKeysSettings, analyzeStructure, buildContext],
  );

  const sendMessage = useCallback(
    async (text: string, intent: AiExplainIntent = "agent") => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: AssistantUiMessage = { id: nextId(), role: "user", content: trimmed };
      const pendingId = nextId();
      setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", content: "", pending: true }]);
      setIsSending(true);

      try {
        if (intent === "agent") {
          await runAgent(trimmed, messages, pendingId);
          return;
        }

        const answer = await runChat(trimmed, intent, messages);
        if (!answer) {
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          return;
        }
        const routing = lastRoutingRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  content: answer,
                  pending: false,
                  fellBack: routing?.fellBack,
                  servedBy: routing
                    ? { provider: routing.provider, model: routing.model }
                    : undefined,
                }
              : m,
          ),
        );
      } catch (e) {
        const notice = e instanceof AiRequestError
          ? formatAiUserNotice(e.code, e.message)
          : noticeFromUnknownError(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, content: notice, pending: false, error: true } : m,
          ),
        );
        toast.error(i18n.t("toasts.unavailable", { ns: "assistant" }), { description: notice });
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, runAgent, runChat],
  );

  useEffect(() => {
    setStructureAnalysis((prev) => ({ ...prev, active: null }));
  }, [viewer.proteinSelection]);

  const showAssistantHud = useCallback(
    (opts: {
      title: string;
      content?: string | null;
      loading?: boolean;
      intent?: AiExplainIntent;
    }) => {
      setExplainPopover({
        open: true,
        title: opts.title,
        content: opts.content ?? null,
        loading: opts.loading ?? false,
        intent: opts.intent ?? "general",
      });
    },
    [],
  );
  const closeExplainPopover = useCallback(() => setExplainPopover(null), []);
  const clearMessages = useCallback(() => setMessages([]), []);
  const replaceMessages = useCallback((next: AssistantUiMessage[]) => {
    setMessages(next);
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      messages,
      status,
      statusLoading,
      chatOpen,
      setChatOpen,
      isSending,
      lastContext,
      buildContext,
      sendMessage,
      runAgentQuery,
      explain,
      clearMessages,
      replaceMessages,
      registerContextExtension,
      registerPhaeleonAgentDeps,
      explainPopover,
      showAssistantHud,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      aiKeysSettings,
      updateAiKeysSettings,
      clearAiKeys,
      aiConfigured,
      usingClientKeys,
      refreshAiStatus,
      testAiConnection,
      structureAnalysis,
      analyzeStructure,
      closeStructureAnalysis,
    }),
    [
      messages,
      status,
      statusLoading,
      chatOpen,
      isSending,
      lastContext,
      buildContext,
      sendMessage,
      runAgentQuery,
      explain,
      clearMessages,
      replaceMessages,
      registerContextExtension,
      registerPhaeleonAgentDeps,
      explainPopover,
      showAssistantHud,
      closeExplainPopover,
      aiSettings,
      updateAiSettings,
      resetAiSettings,
      aiKeysSettings,
      updateAiKeysSettings,
      clearAiKeys,
      aiConfigured,
      usingClientKeys,
      refreshAiStatus,
      testAiConnection,
      structureAnalysis,
      analyzeStructure,
      closeStructureAnalysis,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}

export function useAssistantOptional() {
  return useContext(AssistantContext);
}
