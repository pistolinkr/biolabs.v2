import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, MessageSquarePlus, Settings, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import SecureApiKeyModal, { BYOK_PROVIDER_META } from "@/components/ai/SecureApiKeyModal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAssistant } from "@/contexts/AssistantContext";
import {
  AI_SETUP_CHANGED_EVENT,
  completeAiOnboarding,
  getAiSetupChoice,
  prefersPlatformAi,
} from "@/lib/ai/aiOnboardingStorage";
import {
  hasAnyClientKey,
  loadAiKeysSettings,
  maskApiKey,
  type ByokProviderId,
} from "@/lib/ai/aiKeysStorage";
import {
  createBinaryChatThread,
  deleteBinaryChatThread,
  listBinaryChatThreads,
  switchBinaryChatThread,
  type BinaryChatThreadMeta,
} from "@/lib/ai/binaryChatThreads";
import {
  clearAiSetupViaChat,
  clearGreetingHandoff,
} from "@/lib/ai/greetingHandoff";
import { HELIX_PATH, PHAELEON_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

const BYOK_PROVIDERS: ByokProviderId[] = ["openai", "anthropic", "gemini"];

export interface BinarySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
}

/**
 * BOA5 left drawer — New chat, recent threads, AI source / keys, settings.
 */
export default function BinarySidebar({ open, onOpenChange, onOpenSettings }: BinarySidebarProps) {
  const { t } = useTranslation("assistant");
  const [, setLocation] = useLocation();
  const {
    clearMessages,
    replaceMessages,
    updateAiKeysSettings,
    updateAiSettings,
    refreshAiStatus,
  } = useAssistant();
  const [threads, setThreads] = useState<BinaryChatThreadMeta[]>([]);
  const [keyModalProvider, setKeyModalProvider] = useState<ByokProviderId | null>(null);
  const [keysTick, setKeysTick] = useState(0);

  const refreshThreads = () => setThreads(listBinaryChatThreads());

  useEffect(() => {
    if (!open) return;
    refreshThreads();
  }, [open]);

  useEffect(() => {
    const onSetup = () => setKeysTick((n) => n + 1);
    window.addEventListener(AI_SETUP_CHANGED_EVENT, onSetup);
    return () => window.removeEventListener(AI_SETUP_CHANGED_EVENT, onSetup);
  }, []);

  const keys = loadAiKeysSettings().keys;
  void keysTick;
  const platform = prefersPlatformAi();
  const setupChoice = getAiSetupChoice();

  const close = () => onOpenChange(false);

  const startNewChat = () => {
    createBinaryChatThread();
    clearMessages();
    clearGreetingHandoff();
    clearAiSetupViaChat();
    refreshThreads();
    close();
  };

  const openThread = (id: string) => {
    const msgs = switchBinaryChatThread(id);
    replaceMessages(msgs);
    clearGreetingHandoff();
    refreshThreads();
    close();
  };

  const removeThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const msgs = deleteBinaryChatThread(id);
    replaceMessages(msgs);
    refreshThreads();
  };

  const setPlatform = async () => {
    updateAiKeysSettings({ useOwnApiKeys: false });
    completeAiOnboarding("platform");
    window.dispatchEvent(new CustomEvent(AI_SETUP_CHANGED_EVENT));
    setKeysTick((n) => n + 1);
    const next = await refreshAiStatus();
    if (!next?.configured) {
      toast.error(t("toasts.notConfigured"), {
        description: t("toasts.notConfiguredPlatformHint"),
      });
    }
  };

  const setByok = () => {
    updateAiKeysSettings({ useOwnApiKeys: true });
    completeAiOnboarding("byok");
    window.dispatchEvent(new CustomEvent(AI_SETUP_CHANGED_EVENT));
    setKeysTick((n) => n + 1);
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
    setKeysTick((n) => n + 1);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(300px,88vw)] gap-0 rounded-r-2xl border-r border-border/70 bg-background p-0 sm:max-w-[300px]"
        >
          <SheetHeader className="border-b border-border/50 px-[18px] py-4 text-left">
            <SheetTitle className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">
              <Sparkles size={15} className="text-accent" strokeWidth={1.5} />
              {t("binary.sidebar.title")}
            </SheetTitle>
            <SheetDescription className="font-mono text-[10px] text-muted-foreground">
              {t("binary.sidebar.subtitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="border-b border-border/50 px-[18px] py-3">
              <button
                type="button"
                onClick={startNewChat}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <MessageSquarePlus size={15} className="shrink-0 text-accent" strokeWidth={1.5} />
                <span className="text-sm font-medium tracking-tight text-foreground">
                  {t("binary.sidebar.newChat")}
                </span>
              </button>
            </div>

            <section className="border-b border-border/50 px-[18px] py-3 sm:hidden">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocation(HELIX_PATH)}
                  className="flex-1 rounded-lg border border-border/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  Helix
                </button>
                <button
                  type="button"
                  onClick={() => setLocation(PHAELEON_PATH)}
                  className="flex-1 rounded-lg border border-border/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  Phaeleon
                </button>
              </div>
            </section>

            <section className="border-b border-border/50 px-[18px] py-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("binary.sidebar.recent")}
              </p>
              {threads.length === 0 ? (
                <p className="font-mono text-[10px] text-muted-foreground">
                  {t("binary.sidebar.recentEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {threads.map((thread) => (
                    <li key={thread.id} className="group flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openThread(thread.id)}
                        className={cn(
                          "min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm tracking-tight transition-colors",
                          thread.active
                            ? "rounded-lg bg-accent/15 text-foreground"
                            : "rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {thread.title === "New chat"
                          ? t("binary.sidebar.newChatTitle")
                          : thread.title}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeThread(thread.id, e)}
                        className="shrink-0 p-2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                        aria-label={t("binary.sidebar.deleteChat")}
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border-b border-border/50 px-[18px] py-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("binary.sidebar.aiSource")}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void setPlatform()}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    platform || setupChoice === "platform"
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Sparkles size={14} className="shrink-0 text-accent" strokeWidth={1.5} />
                  <span className="text-sm tracking-tight">{t("binary.setupPlatform")}</span>
                </button>
                <button
                  type="button"
                  onClick={setByok}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    !platform && (setupChoice === "byok" || hasAnyClientKey(keys))
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <KeyRound size={14} className="shrink-0 text-accent" strokeWidth={1.5} />
                  <span className="text-sm tracking-tight">{t("binary.setupByok")}</span>
                </button>
              </div>
            </section>

            <section className="border-b border-border/50 px-[18px] py-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("binary.sidebar.apiKeys")}
              </p>
              <ul className="flex flex-col gap-1">
                {BYOK_PROVIDERS.map((id) => {
                  const label = t(BYOK_PROVIDER_META[id].labelKey);
                  const saved = keys[id]?.trim();
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setKeyModalProvider(id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-left transition-colors hover:border-accent"
                      >
                        <span className="text-sm tracking-tight text-foreground">{label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {saved
                            ? maskApiKey(saved)
                            : t("binary.sidebar.addKey")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="px-[18px] py-3">
              <button
                type="button"
                onClick={() => {
                  close();
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings size={14} strokeWidth={1.5} />
                <span className="text-sm tracking-tight">{t("binary.sidebar.openSettings")}</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SecureApiKeyModal
        open={keyModalProvider != null}
        provider={keyModalProvider}
        onOpenChange={(next) => {
          if (!next) setKeyModalProvider(null);
        }}
        onSave={saveByokKey}
      />
    </>
  );
}
