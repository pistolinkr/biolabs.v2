import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useAssistant } from "@/contexts/AssistantContext";
import { cn } from "@/lib/utils";

interface PhaeleonAskAIButtonProps {
  className?: string;
}

/** Focuses the docked assistant column (always visible in Phaeleon). */
export default function PhaeleonAskAIButton({ className }: PhaeleonAskAIButtonProps) {
  const { t } = useTranslation("phaeleon");
  const { status } = useAssistant();

  const openAssistant = () => {
    document.getElementById("phaeleon-assistant-dock")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document
      .querySelector<HTMLTextAreaElement | HTMLInputElement>(
        "#phaeleon-assistant-dock textarea, #phaeleon-assistant-dock input[type='text']",
      )
      ?.focus();
  };

  return (
    <button
      type="button"
      onClick={openAssistant}
      title={status?.configured ? t("assistant.openTitle") : t("assistant.notConfiguredTitle")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        !status?.configured && "opacity-60",
        className,
      )}
    >
      <Sparkles size={14} />
      <span>{t("assistant.askButton")}</span>
    </button>
  );
}
