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
import { useTranslation } from "react-i18next";
import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useAssistant } from "@/contexts/AssistantContext";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

const MAX_MENTIONS = 6;

export type Boa5Mention = {
  id: string;
  chain: string;
  resno: number;
  resname: string;
};

type Boa5AskActions = {
  /** True while input focused, drafting, mentions, reply, or busy — swaps trailing chrome to Send. */
  active: boolean;
  busy: boolean;
  canSend: boolean;
  submit: () => void;
  sendLabel: string;
};

const Boa5AskActionsContext = createContext<Boa5AskActions | null>(null);

function mentionId(m: Pick<Boa5Mention, "chain" | "resno" | "resname">): string {
  return `${m.chain}:${m.resno}:${m.resname}`;
}

function mentionLabel(m: Pick<Boa5Mention, "chain" | "resno" | "resname">): string {
  return `@${m.chain}:${m.resno} ${m.resname}`;
}

interface Boa5AskProviderProps {
  /** Trailing chrome: send vs settings (focus, draft, mentions, reply, busy). */
  active: boolean;
  onActiveChange: (active: boolean) => void;
  /** Input caret active — bottom bar stays open even if the pointer leaves. */
  focused: boolean;
  onFocusedChange: (focused: boolean) => void;
  children: ReactNode;
}

/** Holds ask state so the send control can live in the pill's Save/trailing slot. */
export function Boa5AskProvider({
  active,
  onActiveChange,
  focused: focusedProp,
  onFocusedChange,
  children,
}: Boa5AskProviderProps) {
  const { t } = useTranslation("header");
  const { t: ta } = useTranslation("assistant");
  const { runAgentQuery, isSending, aiConfigured } = useAssistant();
  const { viewportPickDetail } = useViewer();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mentions, setMentions] = useState<Boa5Mention[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [focused, setFocusedState] = useState(false);

  const setFocused = useCallback(
    (next: boolean) => {
      setFocusedState(next);
      if (next !== focusedProp) onFocusedChange(next);
    },
    [focusedProp, onFocusedChange],
  );

  const pickCandidate = useMemo(() => {
    if (!viewportPickDetail) return null;
    return {
      id: mentionId(viewportPickDetail),
      chain: viewportPickDetail.chain,
      resno: viewportPickDetail.resno,
      resname: viewportPickDetail.resname,
    } satisfies Boa5Mention;
  }, [viewportPickDetail]);

  useEffect(() => {
    if (!pickCandidate) return;
    setMentions((prev) => {
      if (prev.some((m) => m.id === pickCandidate.id)) return prev;
      return [...prev, pickCandidate].slice(-MAX_MENTIONS);
    });
  }, [pickCandidate]);

  const busy = sending || isSending;
  const engaged =
    focused || Boolean(draft.trim()) || mentions.length > 0 || Boolean(reply) || busy;

  useEffect(() => {
    if (engaged !== active) onActiveChange(engaged);
  }, [engaged, active, onActiveChange]);

  useEffect(() => {
    if (focused !== focusedProp) onFocusedChange(focused);
  }, [focused, focusedProp, onFocusedChange]);

  const buildQuery = useCallback(() => {
    const q = draft.trim();
    if (!mentions.length) return q;
    const tags = mentions.map(mentionLabel).join(", ");
    return q ? `${q}\n\nMentions: ${tags}` : `Explain ${tags} in the loaded structure.`;
  }, [draft, mentions]);

  const submit = useCallback(async () => {
    const q = buildQuery();
    if (!q || sending || isSending) return;
    if (!aiConfigured) {
      toast.error(ta("assistant.notConfiguredEnv"));
      return;
    }

    setSending(true);
    setReply(null);
    try {
      // Ask mode: answer without isolate/reload/repr swaps that blank the NGL canvas.
      const result = await runAgentQuery(q, { mode: "ask" });
      if (result.ok) {
        setReply(result.reply?.trim() || null);
        setDraft("");
      } else {
        const err = result.error ?? ta("couldNotAnalyze");
        setReply(err);
        toast.error(err);
      }
    } finally {
      setSending(false);
    }
  }, [aiConfigured, buildQuery, isSending, runAgentQuery, sending, ta]);

  const canSend = Boolean(draft.trim() || mentions.length);

  const actions = useMemo<Boa5AskActions>(
    () => ({
      active: engaged,
      busy,
      canSend,
      submit: () => {
        void submit();
      },
      sendLabel: t("ask.send"),
    }),
    [busy, canSend, engaged, submit, t],
  );

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      mentions,
      removeMention: (id: string) => setMentions((prev) => prev.filter((m) => m.id !== id)),
      reply,
      setReply,
      busy,
      submit,
      focused,
      setFocused,
      actions,
    }),
    [actions, busy, draft, focused, mentions, reply, submit],
  );

  return (
    <Boa5AskStateContext.Provider value={value}>
      <Boa5AskActionsContext.Provider value={actions}>{children}</Boa5AskActionsContext.Provider>
    </Boa5AskStateContext.Provider>
  );
}

type Boa5AskState = {
  draft: string;
  setDraft: (v: string) => void;
  mentions: Boa5Mention[];
  removeMention: (id: string) => void;
  reply: string | null;
  setReply: (v: string | null) => void;
  busy: boolean;
  submit: () => Promise<void>;
  focused: boolean;
  setFocused: (v: boolean) => void;
  actions: Boa5AskActions;
};

const Boa5AskStateContext = createContext<Boa5AskState | null>(null);

function useBoa5AskState(): Boa5AskState {
  const ctx = useContext(Boa5AskStateContext);
  if (!ctx) throw new Error("Boa5AskBar requires Boa5AskProvider");
  return ctx;
}

/** Send control — place in the pill trailing/Save slot. */
export function Boa5AskSendButton({ className }: { className?: string }) {
  const actions = useContext(Boa5AskActionsContext);
  if (!actions) return null;
  const { busy, canSend, submit, sendLabel, active } = actions;
  return (
    <button
      type="button"
      data-boa5-ask-send=""
      tabIndex={active ? 0 : -1}
      onClick={() => void submit()}
      disabled={busy || !canSend || !active}
      title={sendLabel}
      aria-label={sendLabel}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/40 text-foreground transition-colors hover:border-accent hover:bg-background/60 disabled:cursor-not-allowed",
        active && "disabled:opacity-40",
        className,
      )}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
    </button>
  );
}

/** Reply card — render above the ask pill (outside the composer shell). */
export function Boa5AskReplyPanel({ className }: { className?: string }) {
  const { t } = useTranslation("header");
  const ctx = useContext(Boa5AskStateContext);
  if (!ctx?.reply) return null;
  const { reply, setReply } = ctx;

  return (
    <div
      data-boa5-reply=""
      className={cn(
        "absolute bottom-full left-0 right-0 z-30 mb-2 flex max-h-[min(40vh,16rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-lg",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-2.5 pt-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          BOA5
        </span>
        <button
          type="button"
          onClick={() => setReply(null)}
          className="p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={t("ask.replyDismiss")}
        >
          <X size={12} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2.5 pt-0.5 text-[11px] leading-snug text-foreground [&_h1]:mb-1 [&_h1]:mt-1.5 [&_h1]:text-[12px] [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-1.5 [&_h2]:text-[12px] [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1 [&_h3]:text-[11px] [&_h3]:font-semibold [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
        <Streamdown>{reply}</Streamdown>
      </div>
    </div>
  );
}

interface Boa5AskBarProps {
  className?: string;
}

/**
 * Always-on composer (BOA5 + mentions + input). Same before/after — only trailing
 * chrome swaps when the input is focused or has content. Reply: {@link Boa5AskReplyPanel}.
 */
export default function Boa5AskBar({ className }: Boa5AskBarProps) {
  const { t } = useTranslation("header");
  const {
    draft,
    setDraft,
    mentions,
    removeMention,
    reply,
    setReply,
    busy,
    submit,
    setFocused,
  } = useBoa5AskState();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (reply) {
        setReply(null);
        return;
      }
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reply, setReply]);

  return (
    <div
      ref={rootRef}
      data-boa5-ask=""
      className={cn("relative flex min-w-0 flex-1 items-center gap-2", className)}
    >
      <Sparkles size={14} className="shrink-0 text-accent" aria-hidden />
      <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground sm:inline">
        BOA5
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pr-1">
        {mentions.map((m) => (
          <span
            key={m.id}
            className="inline-flex max-w-[7.5rem] shrink-0 items-center gap-0.5 rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
          >
            <span className="truncate" title={mentionLabel(m)}>
              {mentionLabel(m)}
            </span>
            <button
              type="button"
              onClick={() => removeMention(m.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("ask.mentionRemove", { label: mentionLabel(m) })}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={busy}
          placeholder={t("ask.expandedPlaceholder")}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className="min-w-0 flex-1 truncate bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:truncate placeholder:text-muted-foreground disabled:opacity-50"
        />
      </div>
    </div>
  );
}
