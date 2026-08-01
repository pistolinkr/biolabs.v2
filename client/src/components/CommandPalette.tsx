import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowLeftRight,
  Eye,
  Home,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
  Microscope,
  Monitor,
  Download,
  Orbit,
  Palette,
  Pill,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { useAssistantOptional } from "@/contexts/AssistantContext";
import { usePhaeleonOptional } from "@/contexts/PhaeleonContext";
import { useViewerOptional } from "@/contexts/ViewerContext";
import { LAYOUT_PRESET_EVENT, LAYOUT_RESET_EVENT } from "@/contexts/WorkstationLayoutContext";
import { commandsForWorkstation, type CommandCategory, type CommandPaletteScope } from "@/lib/commands/registry";
import { BINARY_PATH, HELIX_PATH, PHAELEON_PATH } from "@/lib/routes";
import { i18n } from "@/i18n";
import { buildCommandSearchBlob, rankCommandsByQuery } from "@/lib/commandSearch";
import type { LayoutPresetId } from "@/lib/workstationLayoutStorage";
import { runPhaeleonCommand } from "@/lib/phaeleon/phaeleonCommands";
import { cn } from "@/lib/utils";

function focusPhaeleonAssistantDock() {
  document.getElementById("phaeleon-assistant-dock")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  document
    .querySelector<HTMLTextAreaElement | HTMLInputElement>(
      "#phaeleon-assistant-dock textarea, #phaeleon-assistant-dock input[type='text']",
    )
    ?.focus();
}

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  cmdId: string;
  searchBlob: string;
}

type AiPanelPhase = "commands" | "loading" | "answer" | "error";

interface AiPanelState {
  phase: AiPanelPhase;
  question: string;
  answer?: string;
  error?: string;
}

interface CommandPaletteProps {
  /** Tool workstation or landing hub — drives which commands are listed. */
  scope: CommandPaletteScope;
  isOpen: boolean;
  onClose: () => void;
  onSettingsOpen?: () => void;
}

const INITIAL_AI_PANEL: AiPanelState = { phase: "commands", question: "" };

function iconForCommand(cmdId: string, category: CommandCategory): React.ReactNode {
  if (cmdId.startsWith("phaeleon.")) {
    if (cmdId.includes("analyze")) return <Pill size={14} />;
    if (cmdId.includes("search")) return <Search size={14} />;
    if (cmdId.includes("settings")) return <Settings size={14} />;
    if (cmdId.includes("swap")) return <ArrowLeftRight size={14} />;
    return <Pill size={14} />;
  }
  if (cmdId === "nav.binary") return <Sparkles size={14} />;
  if (cmdId === "nav.helix") return <Microscope size={14} />;
  if (cmdId === "nav.phaeleon") return <Pill size={14} />;
  if (cmdId.startsWith("nav.")) return <Home size={14} />;
  if (cmdId.startsWith("assistant.") || cmdId.includes("ai")) return <Sparkles size={14} />;
  if (cmdId.startsWith("layout.")) return <LayoutGrid size={14} />;
  if (cmdId.startsWith("repr.") || cmdId.startsWith("color.")) {
    return category === "display" && cmdId.startsWith("color.") ? <Palette size={14} /> : <Layers size={14} />;
  }
  if (cmdId.startsWith("isolate.")) return <Eye size={14} />;
  if (cmdId.startsWith("view.")) return cmdId.includes("spin") ? <Orbit size={14} /> : <Maximize2 size={14} />;
  if (cmdId.startsWith("export.") || cmdId === "screenshot") return <Download size={14} />;
  if (cmdId.startsWith("analysis.")) return <Microscope size={14} />;
  return <Monitor size={14} />;
}

export default function CommandPalette({
  scope,
  isOpen,
  onClose,
  onSettingsOpen,
}: CommandPaletteProps) {
  const { t } = useTranslation("commands");
  const viewer = useViewerOptional();
  const assistant = useAssistantOptional();
  const phaeleon = usePhaeleonOptional();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiPanel, setAiPanel] = useState<AiPanelState>(INITIAL_AI_PANEL);
  const inputRef = useRef<HTMLInputElement>(null);

  const runHelix = useCallback(
    (cmdId: string) => {
      if (cmdId.startsWith("layout.")) {
        if (cmdId === "layout.reset") {
          window.dispatchEvent(new Event(LAYOUT_RESET_EVENT));
        } else {
          const preset = cmdId.slice("layout.".length) as LayoutPresetId;
          window.dispatchEvent(new CustomEvent<LayoutPresetId>(LAYOUT_PRESET_EVENT, { detail: preset }));
        }
        return;
      }
      if (viewer) {
        viewer.runViewerCommand(cmdId);
      } else {
        console.warn(t("palette.requiresWorkspace"));
      }
    },
    [viewer, t],
  );

  const runPhaeleon = useCallback(
    (cmdId: string) => {
      if (!phaeleon) {
        console.warn(t("palette.requiresPhaeleon"));
        return;
      }
      if (cmdId === "nav.home") {
        setLocation("/");
        return;
      }
      if (cmdId === "nav.helix") {
        setLocation(HELIX_PATH);
        return;
      }
      runPhaeleonCommand(cmdId, {
        runAnalysis: phaeleon.runAnalysis,
        clearSession: phaeleon.clearSession,
        swapDrugs: phaeleon.swapDrugs,
        setActiveSlot: phaeleon.setActiveSlot,
        updateSettings: phaeleon.updateSettings,
        settings: phaeleon.settings,
        setLayoutPreset: phaeleon.setLayoutPreset,
        resetLayoutToPreset: phaeleon.resetLayoutToPreset,
        onSettingsOpen,
        focusAssistantDock: focusPhaeleonAssistantDock,
      });
    },
    [phaeleon, onSettingsOpen, setLocation, t],
  );

  const run = useCallback(
    (cmdId: string) => {
      if (cmdId.startsWith("nav.")) {
        if (cmdId === "nav.home") setLocation("/");
        else if (cmdId === "nav.binary") setLocation(BINARY_PATH);
        else if (cmdId === "nav.helix") setLocation(HELIX_PATH);
        else if (cmdId === "nav.phaeleon") setLocation(PHAELEON_PATH);
        return;
      }
      if (cmdId === "assistant.chat.open" && scope !== "phaeleon") {
        assistant?.setChatOpen(true);
        return;
      }
      if (cmdId.startsWith("phaeleon.") || (scope === "phaeleon" && cmdId.startsWith("assistant."))) {
        runPhaeleon(cmdId);
        return;
      }
      runHelix(cmdId);
    },
    [assistant, runHelix, runPhaeleon, setLocation, scope],
  );

  const commands: Command[] = useMemo(
    () =>
      commandsForWorkstation(scope).map((def) => ({
        id: def.id,
        cmdId: def.cmdId,
        icon: iconForCommand(def.cmdId, def.category),
        title: t(`items.${def.cmdId}.title`),
        description: t(`items.${def.cmdId}.description`),
        category: t(`categories.${def.category}`),
        searchBlob: buildCommandSearchBlob(i18n, def.cmdId, def.category),
      })),
    [t, scope, i18n.language],
  );

  const filteredCommands = useMemo(
    () => rankCommandsByQuery(commands, query),
    [commands, query],
  );

  const len = filteredCommands.length;
  const showingAi = aiPanel.phase !== "commands";

  const backToCommands = useCallback(() => {
    setAiPanel(INITIAL_AI_PANEL);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleAskAi = useCallback(async () => {
    const q = query.trim();
    if (!q || !assistant || assistant.isSending) return;

    if (!assistant.aiConfigured) {
      setAiPanel({ phase: "error", question: q, error: t("palette.aiNotConfigured") });
      return;
    }

    setAiPanel({ phase: "loading", question: q });

    const result = await assistant.runAgentQuery(q);

    if (result.ok && result.reply && !result.reply.includes("(AI_")) {
      setAiPanel({ phase: "answer", question: q, answer: result.reply });
      return;
    }

    setAiPanel({
      phase: "error",
      question: q,
      error: result.error ?? t("palette.aiFailed"),
    });
  }, [assistant, query, t]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
      setAiPanel(INITIAL_AI_PANEL);
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (showingAi) {
          e.preventDefault();
          backToCommands();
          return;
        }
        onClose();
        return;
      }

      if (showingAi) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev + 1) % len);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (len === 0) return;
        setSelectedIndex((prev) => (prev === 0 ? len - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          run(cmd.cmdId);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, len, onClose, run, showingAi, backToCommands]);

  useEffect(() => {
    setSelectedIndex((i) => (len === 0 ? 0 : Math.min(i, len - 1)));
  }, [len, query]);

  const askDisabled = !query.trim() || !assistant || assistant.isSending || assistant.statusLoading;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center pt-20",
        isOpen ? "bg-black/55" : "pointer-events-none hidden",
      )}
      onClick={isOpen && !showingAi ? onClose : undefined}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className="relative w-full max-w-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={showingAi ? t("palette.aiTitle") : t("palette.cmd")}
      >
        {showingAi ? (
          <div className="relative z-[60] flex max-h-[min(70vh,520px)] flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2 font-mono">
              <button
                type="button"
                onClick={backToCommands}
                className="flex items-center gap-1 border border-border px-2 py-1 text-[9px] uppercase tracking-wide text-secondary-foreground hover:border-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" />
                {t("palette.aiBack")}
              </button>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("palette.aiTitle")}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono">
              <div className="mb-3 border border-border bg-background px-2 py-1.5">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{t("palette.aiYouAsked")}</div>
                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                  {aiPanel.question}
                </p>
              </div>

              {aiPanel.phase === "loading" ? (
                <div className="flex items-center gap-2 py-6 text-[11px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {t("palette.aiThinking")}
                </div>
              ) : aiPanel.phase === "error" ? (
                <div className="border border-destructive/40 bg-destructive/10 px-2 py-2 text-[11px] leading-relaxed text-destructive">
                  {aiPanel.error}
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed text-foreground">
                  <Streamdown>{aiPanel.answer ?? ""}</Streamdown>
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-between border-t border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <span>{t("palette.aiEscHint")}</span>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                {t("palette.aiClose")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border p-2 font-mono">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("palette.cmd")}</span>
              <input
                ref={inputRef}
                type="text"
                placeholder={t(`palette.placeholder.${scope}`)}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground">ESC</span>
            </div>

            <div className="max-h-96 overflow-y-auto font-mono text-[12px]">
              {len === 0 ? (
                <div className="p-8 text-center text-muted-foreground">{t("palette.noMatch")}</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        run(cmd.cmdId);
                        onClose();
                      }}
                      className={`flex w-full items-start gap-2 px-2 py-1.5 text-left transition-colors ${
                        idx === selectedIndex ? "bg-secondary text-foreground" : "text-secondary-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-muted-foreground">{cmd.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium uppercase tracking-wide">{cmd.title}</div>
                        <div className="text-[10px] text-muted-foreground">{cmd.description}</div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground">
                        {cmd.category}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <span>{t("palette.navigate")}</span>
              <div className="flex items-center gap-2">
                <span>
                  {len} / {commands.length}
                </span>
                {assistant ? (
                  <button
                    type="button"
                    disabled={askDisabled}
                    onClick={() => void handleAskAi()}
                    title={askDisabled ? t("palette.askAiDisabledHint") : t("palette.askAiHint")}
                    className="inline-flex items-center gap-1 border border-border bg-secondary px-2 py-1 text-[9px] uppercase tracking-wide text-foreground hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {assistant.isSending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {t("palette.askAi")}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
