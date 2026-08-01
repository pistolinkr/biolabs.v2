import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, Loader2, Trash2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAssistant } from "@/contexts/AssistantContext";
import { consumeBinaryPendingPrompt } from "@/lib/ai/binaryPendingPrompt";
import { cn } from "@/lib/utils";

/**
 * Binary AI home — empty greeting + message composer (MVP: no + / Tools / mic).
 * Matches ChatGPT-style centered empty state; Biolabs tokens otherwise.
 */
export default function BinaryHome() {
  const { t } = useTranslation("assistant");
  const {
    messages,
    isSending,
    aiConfigured,
    statusLoading,
    sendMessage,
    clearMessages,
  } = useAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasThread = messages.length > 0;
  const sendDisabled = isSending || !aiConfigured || !draft.trim();
  const pendingHandledRef = useRef(false);

  useEffect(() => {
    if (!hasThread) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, hasThread]);

  /** Landing hero handoff — send once after AI is ready (history hydrate settles first). */
  useEffect(() => {
    if (pendingHandledRef.current || !aiConfigured || isSending) return;
    const timer = window.setTimeout(() => {
      if (pendingHandledRef.current) return;
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

  const submit = async () => {
    const text = draft.trim();
    if (!text || sendDisabled) return;
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(text, "general");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const onDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        "w-full max-w-2xl border border-border bg-card",
        "rounded-2xl",
      )}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={onDraftChange}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={isSending}
        placeholder={t("binary.placeholder")}
        className="min-h-[52px] w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        aria-label={t("binary.placeholder")}
      />
      <div className="flex items-center justify-end px-3 pb-3">
        <button
          type="submit"
          disabled={sendDisabled}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors",
            sendDisabled
              ? "bg-muted text-muted-foreground"
              : "bg-foreground text-background hover:opacity-90",
          )}
          aria-label={t("binary.send")}
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
        </button>
      </div>
      {!aiConfigured && !statusLoading ? (
        <p className="border-t border-border px-4 py-2 font-mono text-[10px] text-muted-foreground">
          {t("assistant.notConfiguredEnv")}
        </p>
      ) : null}
    </form>
  );

  if (!hasThread) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <h2 className="text-center text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {t("binary.greeting")}
          </h2>
          {composer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-end px-4 py-2">
        <button
          type="button"
          onClick={clearMessages}
          className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          title={t("assistant.clearChat")}
        >
          <Trash2 size={12} />
          {t("assistant.clearChat")}
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "text-sm leading-relaxed",
                m.role === "user" ? "ml-8 self-end border border-border bg-card px-3 py-2" : "mr-4",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none text-foreground [&_*]:text-inherit">
                  {m.pending ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      {t("assistant.thinking")}
                    </span>
                  ) : (
                    <Streamdown>{m.content}</Streamdown>
                  )}
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
      <div className="flex w-full shrink-0 justify-center px-4 pb-6 pt-2">
        <div className="w-full max-w-2xl">{composer}</div>
      </div>
    </div>
  );
}
