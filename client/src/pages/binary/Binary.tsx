import React, { useEffect, useState } from "react";
import { History, PanelLeft, Settings, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import BinaryContextBridge from "@/components/binary/BinaryContextBridge";
import BinaryHome from "@/components/binary/BinaryHome";
import BinarySessionHistoryBridge from "@/components/binary/BinarySessionHistoryBridge";
import BinarySidebar from "@/components/binary/BinarySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { ViewerProvider } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";
import { consumeOpenAiSettingsRequest } from "@/lib/ai/aiOnboardingStorage";
import { HELIX_PATH, PHAELEON_PATH } from "@/lib/routes";

/**
 * BOA5 — bioengineering-specialized AI home (no workstation canvas).
 * Chat persists in cookie-scoped localStorage. Helix/Phaeleon turns open a
 * dedicated new thread (they never append into an already-existing BOA5 chat).
 */
export default function Binary() {
  return (
    <ViewerProvider>
      <WorkflowProvider>
        <AssistantProvider>
          <BinaryChrome />
        </AssistantProvider>
      </WorkflowProvider>
    </ViewerProvider>
  );
}

function BinaryChrome() {
  const { t } = useTranslation("assistant");
  const [, setLocation] = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (consumeOpenAiSettingsRequest()) {
      setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    const onOpenAiSettings = () => {
      consumeOpenAiSettingsRequest();
      setSettingsOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("biolabs:open-ai-settings", onOpenAiSettings);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("biolabs:open-ai-settings", onOpenAiSettings);
    };
  }, []);

  return (
    <div className="relative flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <BinaryContextBridge />
      <BinarySessionHistoryBridge />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-foreground transition-colors hover:bg-secondary/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t("binary.sidebar.openMenu")}
        >
          <Sparkles size={16} className="text-accent" strokeWidth={1.5} />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]">
            BOA5
          </span>
        </button>

        <nav
          className="pointer-events-auto hidden items-center gap-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:flex"
          aria-label="BOA5 workstations"
        >
          <button
            type="button"
            onClick={() => setLocation(HELIX_PATH)}
            className="transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Helix
          </button>
          <button
            type="button"
            onClick={() => setLocation(PHAELEON_PATH)}
            className="transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Phaeleon
          </button>
        </nav>
      </header>

      <aside className="pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-12 flex-col items-center justify-between border-r border-border/35 pb-3 pt-16 sm:flex">
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={t("binary.sidebar.openMenu")}
          >
            <PanelLeft size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={t("binary.sidebar.recent")}
          >
            <History size={15} strokeWidth={1.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="pointer-events-auto flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t("binary.sidebar.openSettings")}
        >
          <Settings size={15} strokeWidth={1.5} />
        </button>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-14 sm:pl-12 sm:pt-0">
        <BinaryHome onOpenMenu={() => setSidebarOpen(true)} />
      </div>

      <BinarySidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <CommandPalette
        scope="landing"
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <SettingsPanel
        workstation="helix"
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab="ai"
      />
    </div>
  );
}
