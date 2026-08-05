import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { Streamdown } from "streamdown";
import FloatingPanelResizeHandles from "@/components/assistant/FloatingPanelResizeHandles";
import { useAssistant } from "@/contexts/AssistantContext";
import { useViewerOptional } from "@/contexts/ViewerContext";
import { useFloatingPanelLayout } from "@/hooks/useFloatingPanelLayout";
import { cn } from "@/lib/utils";

const DEFAULT_W = 420;
const DEFAULT_H = 360;

export default function ExplainPopover() {
  const { t } = useTranslation("assistant");
  const { explainPopover, closeExplainPopover, setChatOpen } = useAssistant();
  const viewer = useViewerOptional();
  const containerRef = useRef<HTMLDivElement>(null);
  const positionedRef = useRef(false);

  const {
    position,
    setPosition,
    size,
    dragging,
    resizing,
    dragHandleProps,
    getResizeHandleProps,
  } = useFloatingPanelLayout(containerRef, {
    defaultSize: { width: DEFAULT_W, height: DEFAULT_H },
    minSize: { width: 280, height: 200 },
    maxSize: { width: 560, height: 720 },
  });

  useLayoutEffect(() => {
    if (positionedRef.current || !explainPopover?.open) return;
    const overlay = containerRef.current?.getBoundingClientRect();
    if (!overlay) return;

    const anchor = viewer?.viewportPickAnchor;
    const shell = viewer?.viewportShellRef?.current?.getBoundingClientRect();
    if (anchor && shell) {
      const left = Math.min(
        Math.max(8, shell.left + anchor.x + 12),
        Math.max(8, overlay.width - DEFAULT_W - 8),
      );
      const top = Math.min(
        Math.max(8, shell.top + anchor.y + 12),
        Math.max(8, overlay.height - DEFAULT_H - 8),
      );
      setPosition({ left, top });
    } else {
      setPosition({
        left: Math.max(8, overlay.width - DEFAULT_W - 16),
        top: Math.max(8, overlay.height - DEFAULT_H - 16),
      });
    }
    positionedRef.current = true;
  }, [explainPopover?.open, setPosition, viewer?.viewportPickAnchor, viewer?.viewportShellRef]);

  useEffect(() => {
    if (!explainPopover?.open) positionedRef.current = false;
  }, [explainPopover?.open]);

  if (!explainPopover?.open) return null;

  const { title, content, loading } = explainPopover;

  return (
    <div ref={containerRef} data-slot="explain-popover" className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className={cn(
          "pointer-events-auto absolute relative flex flex-col overflow-hidden border border-border bg-card shadow-lg",
          (dragging || resizing) && "select-none",
        )}
        style={{
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border">
          <div
            title={t("dragPanel")}
            {...dragHandleProps}
            className={cn(
              "min-w-0 flex-1 touch-none px-3 py-2",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-foreground">
              {title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 pr-1">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="font-mono text-[8px] uppercase text-muted-foreground hover:text-foreground"
            >
              {t("explainPopover.openChat")}
            </button>
            <button
              type="button"
              onClick={closeExplainPopover}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[11px] leading-relaxed text-card-foreground">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("explainPopover.analyzing")}
            </div>
          ) : content ? (
            <Streamdown>{content}</Streamdown>
          ) : null}
        </div>

        <FloatingPanelResizeHandles
          title={t("resizePanel")}
          resizing={resizing}
          getHandleProps={getResizeHandleProps}
        />
      </div>
    </div>
  );
}
