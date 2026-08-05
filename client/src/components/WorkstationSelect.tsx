import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkstationSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface WorkstationSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: WorkstationSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  /** Kept for API compat — panel is always pinned to the trigger box. */
  align?: "start" | "center" | "end";
  "aria-label"?: string;
}

const GAP = 4;
const MAX_PANEL_H = 224; // max-h-56
const ITEM_H = 28;
const EXIT_MS = 150;

type PanelBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

function estimatePanelHeight(optionCount: number): number {
  return Math.min(MAX_PANEL_H, Math.max(ITEM_H, optionCount * ITEM_H));
}

function collisionBounds(trigger: HTMLElement): { ceiling: number; floor: number } {
  const panel = trigger.closest("[data-settings-panel]");
  const header = panel?.querySelector("[data-settings-panel-header]");
  const footer = panel?.querySelector("[data-settings-panel-footer]");
  const ceiling = header?.getBoundingClientRect().bottom ?? 8;
  const floor = footer?.getBoundingClientRect().top ?? window.innerHeight - 8;
  return { ceiling, floor };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Biolabs workstation dropdown.
 * Pinned to the trigger box; flips above when it would hit the settings footer (or viewport).
 */
export default function WorkstationSelect({
  value,
  onValueChange,
  options,
  placeholder = "—",
  disabled,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: WorkstationSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<PanelBox | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<number | null>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  const clearExitTimer = () => {
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    clearExitTimer();
    setMounted(true);
    setOpen(true);
  }, []);

  const syncBox = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const { ceiling, floor } = collisionBounds(el);
    const estimated = estimatePanelHeight(options.length);
    const spaceBelow = floor - r.bottom - GAP;
    const spaceAbove = r.top - ceiling - GAP;

    const fitsBelow = spaceBelow >= estimated;
    const placement: "top" | "bottom" =
      fitsBelow || spaceBelow >= spaceAbove ? "bottom" : "top";

    if (placement === "bottom") {
      setBox({
        left: r.left,
        width: r.width,
        top: r.bottom + GAP,
        maxHeight: Math.min(MAX_PANEL_H, Math.max(0, spaceBelow)),
        placement: "bottom",
      });
      return;
    }

    const maxHeight = Math.min(MAX_PANEL_H, Math.max(0, spaceAbove));
    const h = Math.min(estimated, maxHeight);
    setBox({
      left: r.left,
      width: r.width,
      top: r.top - GAP - h,
      maxHeight,
      placement: "top",
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    syncBox();
  }, [open, syncBox, label]);

  // Keep panel mounted through exit animation, then unmount.
  useEffect(() => {
    if (open) {
      clearExitTimer();
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const delay = prefersReducedMotion() ? 0 : EXIT_MS;
    exitTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setBox(null);
      exitTimerRef.current = null;
    }, delay);
    return clearExitTimer;
  }, [open, mounted]);

  // After mount, snap upward panels to the real measured height.
  useLayoutEffect(() => {
    if (!open || !box || box.placement !== "top") return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const r = trigger.getBoundingClientRect();
    const h = Math.min(panel.scrollHeight, box.maxHeight);
    const nextTop = r.top - GAP - h;
    if (Math.abs(nextTop - box.top) > 1) {
      setBox((prev) => (prev ? { ...prev, top: nextTop } : prev));
    }
  }, [open, box, options]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onReposition = () => syncBox();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, syncBox, closeMenu]);

  const panel =
    mounted && box && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            data-slot="select-content"
            data-state={open ? "open" : "closed"}
            data-placement={box.placement}
            style={{
              position: "fixed",
              top: box.top,
              left: box.left,
              width: box.width,
              maxWidth: box.width,
              maxHeight: box.maxHeight,
            }}
            className={cn(
              "z-[80] overflow-x-hidden overflow-y-auto border border-border bg-popover text-popover-foreground shadow-none duration-150",
              open
                ? cn(
                    "animate-in fade-in-0",
                    box.placement === "bottom" ? "slide-in-from-top-2" : "slide-in-from-bottom-2",
                  )
                : cn(
                    "pointer-events-none animate-out fade-out-0 fill-mode-forwards",
                    box.placement === "bottom" ? "slide-out-to-top-1" : "slide-out-to-bottom-1",
                  ),
              contentClassName,
            )}
          >
            {options.map((opt) => {
              const checked = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  disabled={opt.disabled || !open}
                  data-slot="select-item"
                  onClick={() => {
                    if (opt.disabled || !open) return;
                    onValueChange(opt.value);
                    closeMenu();
                  }}
                  className={cn(
                    "relative flex w-full min-w-0 items-center overflow-hidden py-1.5 pr-7 pl-2.5 text-left font-mono text-[10px] text-foreground outline-none",
                    "hover:bg-secondary focus:bg-secondary",
                    checked && "bg-secondary/70",
                    "disabled:pointer-events-none disabled:opacity-40",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {checked ? <Check className="absolute right-2 size-3 text-accent" /> : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-slot="select-trigger"
        data-state={open ? "open" : "closed"}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={cn(
          "flex h-7 w-fit min-w-[140px] items-center justify-between gap-2 border border-border bg-input px-2 font-mono text-[10px] text-foreground outline-none transition-colors",
          "hover:border-accent/60 data-[state=open]:border-accent",
          "focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/40",
          "disabled:cursor-not-allowed disabled:opacity-40",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="min-w-0 truncate text-left">{label}</span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground opacity-80" />
      </button>
      {panel}
    </>
  );
}
