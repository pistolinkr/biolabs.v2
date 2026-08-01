import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import BinaryContextBridge from "@/components/binary/BinaryContextBridge";
import BinaryHome from "@/components/binary/BinaryHome";
import BinarySessionHistoryBridge from "@/components/binary/BinarySessionHistoryBridge";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import ToolShellHeader from "@/components/ToolShellHeader";
import { AssistantProvider } from "@/contexts/AssistantContext";
import { ViewerProvider } from "@/contexts/ViewerContext";
import { WorkflowProvider } from "@/contexts/WorkflowContext";

/**
 * Binary — bioengineering-specialized AI home (no workstation canvas).
 * Chat persists in cookie-scoped localStorage; not linked to Helix/Phaeleon yet.
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
  const { t } = useTranslation("landing");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-full max-h-full flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <ToolShellHeader
        toolName={t("tools.binary.name")}
        icon={<Sparkles size={14} className="text-accent" />}
        showAssistant={false}
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <BinaryContextBridge />
      <BinarySessionHistoryBridge />
      <BinaryHome />
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
