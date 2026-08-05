import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ChevronDown, KeyRound, Loader2, Plus, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import SecureApiKeyModal, { BYOK_PROVIDER_META } from "@/components/ai/SecureApiKeyModal";
import { useAssistant } from "@/contexts/AssistantContext";
import {
  AI_SETUP_CHANGED_EVENT,
  completeAiOnboarding,
  getAiSetupChoice,
  isAiOnboardingComplete,
  prefersPlatformAi,
} from "@/lib/ai/aiOnboardingStorage";
import {
  hasAnyClientKey,
  loadAiKeysSettings,
  type ByokProviderId,
} from "@/lib/ai/aiKeysStorage";
import { consumeBinaryPendingPrompt } from "@/lib/ai/binaryPendingPrompt";
import {
  BOA5_TRANSITION_END_EVENT,
  clearAiSetupViaChat,
  clearGreetingHandoff,
  endBoa5Transition,
  peekBoa5Transition,
  peekGreetingHandoff,
} from "@/lib/ai/greetingHandoff";
import { cn } from "@/lib/utils";

type SetupStep = "root" | "providers";

const BYOK_PROVIDERS: ByokProviderId[] = ["openai", "anthropic", "gemini"];

const PAGE_X = "px-4 sm:px-8 md:px-12";
const CONTENT_MAX = "mx-auto w-full max-w-4xl";

function nextMsgId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function needsSetupChoice(): boolean {
  const keys = loadAiKeysSettings().keys;
  if (hasAnyClientKey(keys)) return false;
  if (getAiSetupChoice() === "platform") return false;
  return !isAiOnboardingComplete() || getAiSetupChoice() === "byok" || getAiSetupChoice() == null;
}

/**
 * BOA5 home — visual language aligned with the landing hub (pill ask, hero type, padding).
 */
export default function BinaryHome({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useTranslation("assistant");
  const { t: tl } = useTranslation("landing");
  const {
    messages,
    isSending,
    aiConfigured,
    status,
    aiSettings,
    sendMessage,
    replaceMessages,
    updateAiKeysSettings,
    updateAiSettings,
    refreshAiStatus,
  } = useAssistant();
  const [draft, setDraft] = useState("");
  const [askFocused, setAskFocused] = useState(false);
  const [setupChoosing, setSetupChoosing] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>("root");
  const [keyModalProvider, setKeyModalProvider] = useState<ByokProviderId | null>(null);
  /** First-visit Hello / “Say, hello” cue — off after AI type is chosen. */
  const [showHelloCue, setShowHelloCue] = useState(() => !isAiOnboardingComplete());
  /** Soft blur-in after mount / after greeting morph — not a route wipe. */
  const awaitingMorph = useRef(Boolean(peekBoa5Transition() || peekGreetingHandoff()));
  const [pageIn, setPageIn] = useState(() => !awaitingMorph.current);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingHandledRef = useRef(false);

  const hasThread = messages.length > 0;
  const sendDisabled = isSending || !aiConfigured || !draft.trim() || setupChoosing;
  const sourceLabel =
    status?.active_provider ?? aiSettings.preferredProvider ?? (prefersPlatformAi() ? "platform" : "AI");

  useEffect(() => {
    const syncHelloCue = () => setShowHelloCue(!isAiOnboardingComplete());
    syncHelloCue();
    window.addEventListener(AI_SETUP_CHANGED_EVENT, syncHelloCue);
    return () => window.removeEventListener(AI_SETUP_CHANGED_EVENT, syncHelloCue);
  }, []);

  useEffect(() => {
    if (!awaitingMorph.current) {
      setPageIn(true);
      return;
    }
    const reveal = () => setPageIn(true);
    window.addEventListener(BOA5_TRANSITION_END_EVENT, reveal);
    // Fallback if overlay never fires end.
    const fallback = window.setTimeout(reveal, 1000);
    return () => {
      window.removeEventListener(BOA5_TRANSITION_END_EVENT, reveal);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!hasThread) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, hasThread, setupChoosing]);

  useEffect(() => {
    const handoff = peekGreetingHandoff();
    if (!handoff) {
      // No greeting handoff — drop any leftover overlay immediately.
      if (peekBoa5Transition()) endBoa5Transition();
      return;
    }

    replaceMessages([
      { id: nextMsgId("user"), role: "user", content: handoff.userText },
      { id: nextMsgId("assistant"), role: "assistant", content: t("binary.setupPrompt") },
    ]);
    setSetupChoosing(needsSetupChoice());
    setSetupStep("root");
    pendingHandledRef.current = true;
    // Overlay owns endBoa5Transition after the ask morph docks.
  }, [replaceMessages, t]);

  useEffect(() => {
    if (pendingHandledRef.current || peekGreetingHandoff() || !aiConfigured || isSending) return;
    const timer = window.setTimeout(() => {
      if (pendingHandledRef.current || peekGreetingHandoff()) return;
      const pending = consumeBinaryPendingPrompt();
      if (!pending) {
        pendingHandledRef.current = true;
        return;
      }
      pendingHandledRef.current = true;
      void sendMessage(pending, "general");
    }, 120);
    return () => window.clearTimeout(timer);
  }, [aiConfigured, isSending, sendMessage]);

  /** After chat setup, drop Hello / setup transcript — toast only, fresh empty home. */
  const finishChatSetup = () => {
    clearAiSetupViaChat();
    clearGreetingHandoff();
    setSetupChoosing(false);
    setSetupStep("root");
    setKeyModalProvider(null);
    setShowHelloCue(false);
    setAskFocused(false);
    replaceMessages([]);
  };

  const choosePlatform = async () => {
    updateAiKeysSettings({ useOwnApiKeys: false });
    completeAiOnboarding("platform");
    window.dispatchEvent(new CustomEvent(AI_SETUP_CHANGED_EVENT));
    finishChatSetup();
    const next = await refreshAiStatus();
    if (next?.configured) {
      toast.success(t("binary.setupReady"));
    } else {
      toast.error(t("toasts.notConfigured"), {
        description: t("toasts.notConfiguredPlatformHint"),
      });
    }
  };

  const saveByokKey = (provider: ByokProviderId, apiKey: string) => {
    const prev = loadAiKeysSettings();
    updateAiKeysSettings({
      useOwnApiKeys: true,
      keys: { ...prev.keys, [provider]: apiKey },
    });
    updateAiSettings({ preferredProvider: provider });

    completeAiOnboarding("byok");
    window.dispatchEvent(new CustomEvent(AI_SETUP_CHANGED_EVENT));
    finishChatSetup();
    toast.success(t("binary.setupReady"));
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || sendDisabled) return;
    setDraft("");
    clearGreetingHandoff();
    await sendMessage(text, "general");
  };

  /** Empty dashboard and active thread share one compact assistant composer. */
  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        "relative z-10 flex w-full items-center gap-2 rounded-[20px] border border-border/80 bg-card px-2.5 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition-[border-color,background-color] focus-within:border-accent focus-within:bg-card/95",
        hasThread ? "max-w-3xl" : "max-w-2xl",
      )}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={t("binary.sidebar.openMenu")}
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => {
          if (showHelloCue) setAskFocused(true);
        }}
        onBlur={() => setAskFocused(false)}
        disabled={isSending || setupChoosing}
        placeholder={tl("askPlaceholder")}
        className="min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        aria-label={tl("askPlaceholder")}
      />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("biolabs:open-ai-settings"))}
        className="hidden max-w-36 shrink-0 items-center gap-1 truncate rounded-full px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
        title={sourceLabel}
        aria-label={t("binary.sidebar.openSettings")}
      >
        <span className="truncate">{sourceLabel}</span>
        <ChevronDown size={11} className="shrink-0" strokeWidth={1.5} />
      </button>
      <button
        type="submit"
        disabled={sendDisabled}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
          !sendDisabled
            ? "bg-foreground text-background hover:opacity-90"
            : "bg-muted text-muted-foreground",
        )}
        aria-label={t("binary.send")}
      >
        {isSending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
      </button>
    </form>
  );

  const setupChoices = setupChoosing ? (
    <div
      className={cn(
        "mt-5 flex w-fit max-w-[220px] flex-col gap-3",
        pageIn && "boa5-setup-in",
      )}
    >
      {setupStep === "root" ? (
        <>
          <button
            type="button"
            onClick={() => setSetupStep("providers")}
            className="flex items-center gap-3 rounded-full border border-border bg-card px-[18px] py-3 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <KeyRound size={16} className="shrink-0 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-tight text-foreground">
              {t("binary.setupByok")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void choosePlatform()}
            className="flex items-center gap-3 rounded-full border border-accent/50 bg-accent/10 px-[18px] py-3 text-left transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Sparkles size={16} className="shrink-0 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-tight text-foreground">
              {t("binary.setupPlatform")}
            </span>
          </button>
        </>
      ) : (
        <>
          {BYOK_PROVIDERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setKeyModalProvider(id)}
              className="flex items-center justify-center rounded-full border border-border bg-card px-[18px] py-3 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="text-sm font-medium tracking-tight text-foreground">
                {t(BYOK_PROVIDER_META[id].labelKey)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSetupStep("root")}
            className="px-2 py-1 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("binary.setupBack")}
          </button>
        </>
      )}
    </div>
  ) : null;

  const emptyHeroTitle = (
    <h1 className="landing-hero-title relative z-10 grid max-w-3xl place-items-center text-center text-[26px] font-normal leading-tight tracking-[-0.025em] sm:text-[30px] md:text-[34px]">
      {showHelloCue ? (
        <>
          <span
            aria-hidden={askFocused}
            className={cn("landing-hero-title__layer", askFocused ? "is-exit-bottom" : "is-shown")}
          >
            <span className="landing-hero-title__sharp">{t("binary.greeting")}</span>
            <span className="landing-hero-title__soft" aria-hidden>
              {t("binary.greeting")}
            </span>
          </span>
          <span
            aria-hidden={!askFocused}
            className={cn("landing-hero-title__layer", askFocused ? "is-shown" : "is-enter-top")}
          >
            <span className="landing-hero-title__sharp">{tl("hero.titleActive")}</span>
            <span className="landing-hero-title__soft" aria-hidden>
              {tl("hero.titleActive")}
            </span>
          </span>
        </>
      ) : (
        <span className="landing-hero-title__layer is-shown">
          <span className="landing-hero-title__sharp">{t("binary.greeting")}</span>
          <span className="landing-hero-title__soft" aria-hidden>
            {t("binary.greeting")}
          </span>
        </span>
      )}
    </h1>
  );

  if (!hasThread) {
    return (
      <div
        className={cn(
          "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
          pageIn && "boa5-page-in",
        )}
      >
        <div className="boa5-dashboard-grid pointer-events-none absolute inset-0" aria-hidden />
        <section className={cn(PAGE_X, "relative grid min-h-0 flex-1 place-content-center pb-[14vh] pt-8 text-center sm:pb-[10vh]")}>
          <div className="relative flex w-[min(44rem,calc(100vw-2rem))] max-w-full flex-col items-center gap-7 sm:gap-8">
            <div className="boa5-dashboard-glow pointer-events-none absolute left-1/2 top-[62%] z-0 h-72 w-[min(56rem,110vw)] -translate-x-1/2 -translate-y-1/2" aria-hidden />
            {emptyHeroTitle}
            {!aiConfigured && !setupChoosing ? (
              <p className="relative z-10 max-w-xl text-center font-mono text-[10px] leading-snug text-muted-foreground">
                {getAiSetupChoice() === "byok"
                  ? t("binary.sendDisabledByok")
                  : t("binary.sendDisabledPlatform")}
              </p>
            ) : null}
            <div className="relative z-10 flex w-full justify-center">{composer}</div>
          </div>
        </section>
      </div>
    );
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="boa5-dashboard-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        ref={scrollRef}
        className={cn("relative z-10 min-h-0 flex-1 overflow-y-auto", !pageIn && "opacity-0")}
      >
        <div className={cn(CONTENT_MAX, PAGE_X, "mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12 pt-20 sm:pt-24")}>
          {messages.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                "text-sm leading-relaxed sm:text-base",
                pageIn && "boa5-msg-in",
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-[20px] border border-border/70 bg-card px-[18px] py-2.5"
                  : "mr-auto w-full max-w-full",
              )}
              style={
                pageIn
                  ? { animationDelay: `${Math.min(i, 4) * 55}ms` }
                  : undefined
              }
            >
              {m.role === "assistant" ? (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                    BOA5
                  </p>
                  <div className="prose prose-invert prose-sm max-w-none text-foreground sm:prose-base [&_*]:text-inherit">
                    {m.pending ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t("assistant.thinking")}
                      </span>
                    ) : (
                      <Streamdown>{m.content}</Streamdown>
                    )}
                  </div>
                  {m.fellBack && m.servedBy && !m.pending && !m.error ? (
                    <p
                      className="mt-2 font-mono text-[10px] text-muted-foreground"
                      title={t("fallback.tooltip")}
                    >
                      {t("fallback.servedBy", {
                        provider: m.servedBy.provider,
                        model: m.servedBy.model,
                      })}
                    </p>
                  ) : null}
                  {setupChoosing && m.id === lastAssistantId ? setupChoices : null}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
              {m.error ? (
                <p className="mt-1 font-mono text-[10px] text-destructive">{m.content}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={cn(CONTENT_MAX, PAGE_X, "relative z-20 flex w-full shrink-0 justify-center border-t border-border/30 bg-background/90 pb-4 pt-3 sm:pb-5")}>
        <div className="flex w-full max-w-3xl flex-col items-center gap-2">
          {!aiConfigured && !setupChoosing ? (
            <p className="max-w-xl text-center font-mono text-[10px] leading-snug text-muted-foreground">
              {getAiSetupChoice() === "byok" ||
              (!prefersPlatformAi() && hasAnyClientKey(loadAiKeysSettings().keys))
                ? t("binary.sendDisabledByok")
                : t("binary.sendDisabledPlatform")}
            </p>
          ) : null}
          {composer}
        </div>
      </div>

      <SecureApiKeyModal
        open={keyModalProvider != null}
        provider={keyModalProvider}
        onOpenChange={(open) => {
          if (!open) setKeyModalProvider(null);
        }}
        onSave={saveByokKey}
      />
    </div>
  );
}
