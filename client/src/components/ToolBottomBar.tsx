import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import Boa5AskBar, {
  Boa5AskProvider,
  Boa5AskReplyPanel,
  Boa5AskSendButton,
} from "@/components/Boa5AskBar";
import ToolBottomBarQuickSettings from "@/components/ToolBottomBarQuickSettings";
import type { WorkstationId } from "@/lib/settings/workstationTypes";
import { cn } from "@/lib/utils";

const BOTTOM_REVEAL_PX = 28;
const BOTTOM_HIDE_PX = 96;
const REVEAL_MOTION =
  "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const HOST_MOVE_SPRING = { type: "spring" as const, stiffness: 380, damping: 36, mass: 0.85 };
const HOST_MOVE_REDUCED = { type: "tween" as const, duration: 0 };

/** Drop keyboard focus so ask chrome doesn't stay "active" after the bar hides. */
function blurBoa5AskInput(): void {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.closest("[data-boa5-ask]")) {
    el.blur();
  }
}

type HostBox = { left: number; width: number; top: number; height: number };

/** Survives Helix ↔ Phaeleon remounts so the floating host can ease into place. */
let rememberedHostBox: HostBox | null = null;

function rememberHostBox(box: HostBox | null): void {
  if (!box || box.width < 8) return;
  rememberedHostBox = box;
}

function peekRememberedHostBox(): HostBox | null {
  return rememberedHostBox;
}

function boxFromElement(el: Element): HostBox {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    width: Math.max(0, r.width),
    top: r.top,
    height: Math.max(0, r.height),
  };
}

function publishHostElementBox(el: Element | null): void {
  if (!el) return;
  rememberHostBox(boxFromElement(el));
}

function boxesNearlyEqual(a: HostBox, b: HostBox): boolean {
  return (
    Math.abs(a.left - b.left) < 2 &&
    Math.abs(a.width - b.width) < 2 &&
    Math.abs(a.top - b.top) < 2 &&
    Math.abs(a.height - b.height) < 2
  );
}

/** Shared pill geometry — same for Helix dock + Phaeleon floating. */
const BAR_SHELL_CLASS = "relative w-full max-w-full";
const BAR_SHELL_HEIGHT = {
  hidden: "h-8 overflow-hidden",
  shown: "h-14 overflow-hidden",
  /** Composer open — reply floats above the pill (overflow visible). */
  expanded: "h-auto min-h-14 overflow-visible",
} as const;
const BAR_PILL_LAYER =
  "absolute inset-x-0 bottom-0 flex justify-center px-2 pb-1";
const BAR_PILL_LAYER_EXPANDED =
  "relative flex justify-center px-2 py-1";
/** Floating host — geometry animated via framer-motion when anchored. */
const BAR_FLOATING_HOST = "pointer-events-none fixed z-40 flex justify-center";

/** Horizontal I-beam grip — sharp, thin steel-frame silhouette. */
function ToolBottomBarGrip({
  width,
  visible,
  className,
}: {
  width: number;
  visible: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center text-muted-foreground",
        "transition-opacity duration-200 motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      style={{ width }}
    >
      <span className="h-2.5 w-px shrink-0 bg-current" />
      <span className="h-px min-w-0 flex-1 bg-current" />
      <span className="h-2.5 w-px shrink-0 bg-current" />
    </div>
  );
}

interface ToolBottomBarChrome {
  hidden: boolean;
  holdOpen: boolean;
  lineWidth: number;
  peek: () => void;
  releasePeek: () => void;
  reveal: () => void;
  retreat: () => void;
  registerPill: (el: HTMLDivElement | null) => void;
}

interface ToolBottomBarSlotValue {
  onSettingsOpen: () => void;
  onQuickSettingsOpenChange: (open: boolean) => void;
  askExpanded: boolean;
  onAskExpandedChange: (open: boolean) => void;
  askFocused: boolean;
  onAskFocusedChange: (focused: boolean) => void;
  workstation: WorkstationId;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const ToolBottomBarChromeContext = createContext<ToolBottomBarChrome | null>(null);
const ToolBottomBarSlotContext = createContext<ToolBottomBarSlotValue | null>(null);

/** Viewport grip / dock hosts use this to share hide/reveal state. */
export function useToolBottomBarChrome(): ToolBottomBarChrome | null {
  return useContext(ToolBottomBarChromeContext);
}

function useToolBottomBarSlot(): ToolBottomBarSlotValue | null {
  return useContext(ToolBottomBarSlotContext);
}

interface ToolBottomBarPillProps {
  onSettingsOpen: () => void;
  onQuickSettingsOpenChange: (open: boolean) => void;
  askExpanded: boolean;
  onAskExpandedChange: (open: boolean) => void;
  askFocused: boolean;
  onAskFocusedChange: (focused: boolean) => void;
  workstation: WorkstationId;
  leading?: ReactNode;
  trailing?: ReactNode;
  pillRef?: React.Ref<HTMLDivElement>;
  className?: string;
}

function ToolBottomBarPill({
  onSettingsOpen,
  onQuickSettingsOpenChange,
  askExpanded,
  onAskExpandedChange,
  askFocused,
  onAskFocusedChange,
  workstation,
  leading,
  trailing,
  pillRef,
  className,
}: ToolBottomBarPillProps) {
  const helixAsk = workstation === "helix";

  const pill = (
    <div
      ref={pillRef}
      className={cn(
        "relative flex h-12 max-w-full items-center gap-3 rounded-full border border-border/50 px-4 shadow-lg",
        "bg-background",
        // Helix: full width always — before/after differ only in trailing control.
        helixAsk
          ? "w-full"
          : cn("inline-flex w-auto", askExpanded && "w-full"),
        className,
      )}
    >
      {leading ? (
        <div className="flex min-w-0 items-center gap-1">{leading}</div>
      ) : null}

      {helixAsk ? <Boa5AskBar className="min-w-0 flex-1" /> : null}

      {/*
        Idle: settings/Save in flow. Active (focus/draft): they leave flow so the
        input reaches the send control; only w-8 reserved.
      */}
      <div
        className={cn(
          "relative flex h-8 shrink-0 items-center",
          askExpanded && "w-8",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0",
            askExpanded
              ? "pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0"
              : "opacity-100",
          )}
          aria-hidden={askExpanded}
        >
          <ToolBottomBarQuickSettings
            workstation={workstation}
            onOpenFullSettings={onSettingsOpen}
            onOpenChange={onQuickSettingsOpenChange}
          />
          {trailing ? (
            <>
              <div aria-hidden className="h-5 w-px shrink-0 bg-border/60" />
              <div className="flex min-w-0 items-center justify-end gap-1">{trailing}</div>
            </>
          ) : null}
        </div>

        {helixAsk ? (
          <div
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0",
              askExpanded
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <Boa5AskSendButton className="disabled:opacity-40" />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!helixAsk) return pill;

  return (
    <Boa5AskProvider
      active={askExpanded}
      onActiveChange={onAskExpandedChange}
      focused={askFocused}
      onFocusedChange={onAskFocusedChange}
    >
      <div className="relative w-full max-w-full">
        <Boa5AskReplyPanel />
        {pill}
      </div>
    </Boa5AskProvider>
  );
}

/** Shared Helix-style show/hide: grip fades, pill slides up from below. */
function ToolBottomBarReveal({
  hidden,
  lineWidth,
  showGrip,
  onReveal,
  onRetreat,
  holdOpen,
  askExpanded,
  bordered,
  className,
  hostRef,
  children,
}: {
  hidden: boolean;
  lineWidth: number;
  showGrip: boolean;
  onReveal: () => void;
  onRetreat: () => void;
  /** Keep shell open (e.g. settings / command palette / quick menu). */
  holdOpen?: boolean;
  /** Grow shell with composer / mention chips / compact reply. */
  askExpanded?: boolean;
  bordered?: boolean;
  className?: string;
  hostRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const collapsed = hidden && !holdOpen;

  return (
    <div
      ref={hostRef}
      data-tool-bottom-bar-shell=""
      className={cn(
        BAR_SHELL_CLASS,
        bordered && "border-t border-transparent bg-transparent",
        "transition-[height]",
        REVEAL_MOTION,
        collapsed
          ? BAR_SHELL_HEIGHT.hidden
          : askExpanded
            ? BAR_SHELL_HEIGHT.expanded
            : BAR_SHELL_HEIGHT.shown,
        className,
      )}
      onMouseEnter={onReveal}
      onMouseLeave={() => {
        if (!holdOpen) onRetreat();
      }}
    >
      {showGrip ? <ToolBottomBarGrip width={lineWidth} visible={collapsed} /> : null}

      <div
        className={cn(
          askExpanded ? BAR_PILL_LAYER_EXPANDED : BAR_PILL_LAYER,
          "transition-transform will-change-transform",
          REVEAL_MOTION,
          collapsed ? "pointer-events-none translate-y-full" : "translate-y-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ToolBottomBarControls({
  pillRef,
  onSettingsOpen,
  onQuickSettingsOpenChange,
  askExpanded,
  onAskExpandedChange,
  askFocused,
  onAskFocusedChange,
  workstation,
  leading,
  trailing,
}: {
  pillRef: (el: HTMLDivElement | null) => void;
  onSettingsOpen: () => void;
  onQuickSettingsOpenChange: (open: boolean) => void;
  askExpanded: boolean;
  onAskExpandedChange: (open: boolean) => void;
  askFocused: boolean;
  onAskFocusedChange: (focused: boolean) => void;
  workstation: WorkstationId;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <ToolBottomBarPill
      pillRef={pillRef}
      onSettingsOpen={onSettingsOpen}
      onQuickSettingsOpenChange={onQuickSettingsOpenChange}
      askExpanded={askExpanded}
      onAskExpandedChange={onAskExpandedChange}
      askFocused={askFocused}
      onAskFocusedChange={onAskFocusedChange}
      workstation={workstation}
      leading={leading}
      trailing={trailing}
    />
  );
}

/** Renders the docked tool bar inside the viewport bottom strip (Helix). */
export function ToolBottomBarDock() {
  const slot = useToolBottomBarSlot();
  const chrome = useToolBottomBarChrome();
  const { t } = useTranslation("header");
  const reduceMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const arrivalFromRef = useRef<HostBox | null>(peekRememberedHostBox());
  const [targetBox, setTargetBox] = useState<HostBox | null>(null);
  const [arriving, setArriving] = useState(() => {
    if (reduceMotion) return false;
    return peekRememberedHostBox() != null;
  });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const sync = () => {
      const box = boxFromElement(el);
      setTargetBox(box);
      if (!arriving) publishHostElementBox(el);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      publishHostElementBox(el);
      ro.disconnect();
    };
  }, [arriving]);

  useEffect(() => {
    if (!arriving || !targetBox || !arrivalFromRef.current) return;
    if (boxesNearlyEqual(arrivalFromRef.current, targetBox)) {
      setArriving(false);
    }
  }, [arriving, targetBox]);

  if (!slot || !chrome) return null;

  const { hidden, holdOpen, lineWidth, reveal, retreat, registerPill } = chrome;
  const from = arrivalFromRef.current;
  const showTravel = arriving && from && targetBox;

  const dockReveal = (
    <ToolBottomBarReveal
      bordered
      hostRef={hostRef}
      hidden={hidden}
      holdOpen={holdOpen}
      askExpanded={slot.askExpanded}
      lineWidth={lineWidth}
      showGrip
      onReveal={reveal}
      onRetreat={retreat}
      className="shrink-0"
    >
      {!showTravel ? (
        <ToolBottomBarControls
          pillRef={registerPill}
          onSettingsOpen={slot.onSettingsOpen}
          onQuickSettingsOpenChange={slot.onQuickSettingsOpenChange}
          askExpanded={slot.askExpanded}
          onAskExpandedChange={slot.onAskExpandedChange}
          askFocused={slot.askFocused}
          onAskFocusedChange={slot.onAskFocusedChange}
          workstation={slot.workstation}
          leading={slot.leading}
          trailing={slot.trailing}
        />
      ) : null}
    </ToolBottomBarReveal>
  );

  return (
    <>
      <div className={cn(showTravel && "pointer-events-none invisible")}>{dockReveal}</div>

      {showTravel ? (
        <motion.div
          className="pointer-events-auto fixed z-50 overflow-hidden border-t border-border bg-background"
          initial={{
            left: from.left,
            width: from.width,
            top: from.top,
            height: Math.max(from.height, 32),
          }}
          animate={{
            left: targetBox.left,
            width: targetBox.width,
            top: targetBox.top,
            height: Math.max(targetBox.height, 32),
          }}
          transition={reduceMotion ? HOST_MOVE_REDUCED : HOST_MOVE_SPRING}
          onUpdate={(latest) => {
            const left = typeof latest.left === "number" ? latest.left : null;
            const width = typeof latest.width === "number" ? latest.width : null;
            const top = typeof latest.top === "number" ? latest.top : null;
            const height = typeof latest.height === "number" ? latest.height : null;
            if (left != null && width != null && top != null && height != null) {
              rememberHostBox({ left, width, top, height });
            }
          }}
          onAnimationComplete={() => {
            setArriving(false);
            publishHostElementBox(hostRef.current);
          }}
        >
          <ToolBottomBarReveal
            bordered={false}
            hidden={hidden}
            holdOpen={holdOpen}
            askExpanded={slot.askExpanded}
            lineWidth={lineWidth}
            showGrip
            onReveal={reveal}
            onRetreat={retreat}
            className="h-full"
          >
            <ToolBottomBarControls
              pillRef={registerPill}
              onSettingsOpen={slot.onSettingsOpen}
              onQuickSettingsOpenChange={slot.onQuickSettingsOpenChange}
              askExpanded={slot.askExpanded}
              onAskExpandedChange={slot.onAskExpandedChange}
              askFocused={slot.askFocused}
              onAskFocusedChange={slot.onAskFocusedChange}
              workstation={slot.workstation}
              leading={slot.leading}
              trailing={slot.trailing}
            />
          </ToolBottomBarReveal>
        </motion.div>
      ) : null}

      <span className="sr-only">BOA5</span>
    </>
  );
}

interface ToolBottomBarProps {
  onSettingsOpen: () => void;
  workstation: WorkstationId;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * floating: fixed bottom chrome (Phaeleon).
   * docked: bar hosted in the viewport bottom strip via ToolBottomBarDock (Helix).
   */
  variant?: "floating" | "docked";
  /**
   * When false, the half-width cue line is not rendered.
   * Docked always shows its grip inside the strip.
   */
  showFloatingGrip?: boolean;
  /**
   * CSS selector for a layout region; floating bar x/width track that element's
   * bounding box so the pill centers inside it (e.g. Phaeleon analysis panel).
   */
  centerInSelector?: string;
  /** Keep the bar revealed (settings panel / command palette open). */
  holdOpen?: boolean;
  /** Wrap page chrome so docked slot / floating grips share state. */
  children?: ReactNode;
  className?: string;
}

/**
 * Tool chrome with shared auto-hide. Docked hosts render via ToolBottomBarDock.
 */
export default function ToolBottomBar({
  onSettingsOpen,
  workstation,
  leading,
  trailing,
  variant = "floating",
  showFloatingGrip = true,
  centerInSelector,
  holdOpen = false,
  children,
  className,
}: ToolBottomBarProps) {
  const reduceMotion = useReducedMotion();
  const [hidden, setHidden] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [askExpanded, setAskExpanded] = useState(false);
  const [askFocused, setAskFocused] = useState(false);
  const [lineWidth, setLineWidth] = useState(96);
  const [pillEl, setPillEl] = useState<HTMLDivElement | null>(null);
  const [anchorBox, setAnchorBox] = useState<HostBox | null>(null);
  /** Animated host geometry — starts at last Helix/Phaeleon box, eases to anchor. */
  const [hostBox, setHostBox] = useState<HostBox | null>(() => peekRememberedHostBox());
  const floatingHostRef = useRef<HTMLDivElement>(null);
  const hoveringRef = useRef(false);
  // Hold open while the ask input has caret focus (mouse may leave). Idle → hide on leave.
  const holdOpenEffective = holdOpen || quickSettingsOpen || askFocused;
  const holdOpenRef = useRef(holdOpenEffective);
  const quickSettingsOpenRef = useRef(quickSettingsOpen);
  const peekHoldRef = useRef(false);
  const peekReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQuickSettingsOpenChange = useCallback((open: boolean) => {
    setQuickSettingsOpen(open);
    if (open) {
      setHidden(false);
      setHovering(true);
      return;
    }
    // Soft close only — never force-hide here. Forcing hide while the pointer is still
    // over the shell re-triggers reveal ↔ collapse loops with the settings popover.
    peekHoldRef.current = false;
    window.setTimeout(() => {
      if (holdOpenRef.current) return;
      const shell = document.querySelector<HTMLElement>("[data-tool-bottom-bar-shell]");
      if (shell?.matches(":hover")) {
        setHovering(true);
        setHidden(false);
        return;
      }
      setHovering(false);
      setHidden(true);
    }, 0);
  }, []);

  const onAskExpandedChange = useCallback((open: boolean) => {
    setAskExpanded(open);
  }, []);

  const onAskFocusedChange = useCallback((focused: boolean) => {
    setAskFocused(focused);
    if (focused) {
      setHidden(false);
      return;
    }
    // Blurred: hide immediately if the pointer is no longer on the bar.
    window.setTimeout(() => {
      if (holdOpenRef.current) return;
      const shell = document.querySelector<HTMLElement>("[data-tool-bottom-bar-shell]");
      if (shell?.matches(":hover")) {
        setHovering(true);
        setHidden(false);
        return;
      }
      setHovering(false);
      setHidden(true);
    }, 0);
  }, []);

  const slot = useMemo(
    () => ({
      onSettingsOpen,
      onQuickSettingsOpenChange,
      askExpanded,
      onAskExpandedChange,
      askFocused,
      onAskFocusedChange,
      workstation,
      leading,
      trailing,
    }),
    [
      onSettingsOpen,
      onQuickSettingsOpenChange,
      askExpanded,
      onAskExpandedChange,
      askFocused,
      onAskFocusedChange,
      workstation,
      leading,
      trailing,
    ],
  );

  const registerPill = useCallback((el: HTMLDivElement | null) => {
    setPillEl(el);
  }, []);

  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  useEffect(() => {
    quickSettingsOpenRef.current = quickSettingsOpen;
  }, [quickSettingsOpen]);

  useEffect(() => {
    holdOpenRef.current = holdOpenEffective;
    if (holdOpenEffective) {
      setHidden(false);
      setHovering(true);
    }
  }, [holdOpenEffective]);

  useEffect(() => {
    if (!pillEl) return;

    const sync = () => {
      const w = pillEl.offsetWidth;
      if (w < 8) return;
      setLineWidth(Math.max(48, Math.round(w / 2)));
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(pillEl);
    return () => ro.disconnect();
  }, [pillEl, leading, trailing]);

  useEffect(() => {
    if (variant !== "floating" || !centerInSelector) {
      setAnchorBox(null);
      return;
    }

    let observed: Element | null = null;
    let ro: ResizeObserver | null = null;

    const sync = () => {
      if (!observed) return;
      const r = observed.getBoundingClientRect();
      // Only track x-range — height/top follow content to avoid show/hide jump loops.
      setAnchorBox({
        left: r.left,
        width: Math.max(0, r.width),
        top: window.innerHeight - 56,
        height: 56,
      });
    };

    const attach = (node: Element) => {
      if (observed === node) {
        sync();
        return;
      }
      ro?.disconnect();
      observed = node;
      sync();
      ro = new ResizeObserver(sync);
      ro.observe(node);
    };

    const find = () => {
      const node = document.querySelector(centerInSelector);
      if (node) attach(node);
    };

    find();
    window.addEventListener("resize", sync, { passive: true });
    const mo = new MutationObserver(find);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [variant, centerInSelector]);

  useEffect(() => {
    if (variant !== "floating") return;
    if (anchorBox) {
      setHostBox(anchorBox);
      rememberHostBox(anchorBox);
      return;
    }
    const remembered = peekRememberedHostBox();
    if (remembered) setHostBox(remembered);
  }, [variant, anchorBox]);

  useEffect(() => {
    if (variant !== "floating") return;
    return () => {
      publishHostElementBox(floatingHostRef.current);
    };
  }, [variant]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const fromBottom = window.innerHeight - e.clientY;
      const underAnchor =
        !anchorBox ||
        (e.clientX >= anchorBox.left && e.clientX <= anchorBox.left + anchorBox.width);

      if (holdOpenRef.current) {
        setHidden(false);
        return;
      }
      if (fromBottom <= BOTTOM_REVEAL_PX && underAnchor) {
        setHidden(false);
        return;
      }
      if (!hoveringRef.current && !peekHoldRef.current && fromBottom > BOTTOM_HIDE_PX) {
        blurBoa5AskInput();
        setHidden(true);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [anchorBox]);

  useEffect(
    () => () => {
      if (peekReleaseTimer.current) clearTimeout(peekReleaseTimer.current);
    },
    [],
  );

  const peek = useCallback(() => {
    if (peekReleaseTimer.current) {
      clearTimeout(peekReleaseTimer.current);
      peekReleaseTimer.current = null;
    }
    peekHoldRef.current = true;
    setHidden(false);
  }, []);

  const releasePeek = useCallback(() => {
    if (peekReleaseTimer.current) clearTimeout(peekReleaseTimer.current);
    peekReleaseTimer.current = setTimeout(() => {
      peekHoldRef.current = false;
      peekReleaseTimer.current = null;
      if (!hoveringRef.current && !holdOpenRef.current) setHidden(true);
    }, 450);
  }, []);

  const reveal = useCallback(() => {
    if (peekReleaseTimer.current) {
      clearTimeout(peekReleaseTimer.current);
      peekReleaseTimer.current = null;
    }
    peekHoldRef.current = false;
    setHovering(true);
    setHidden(false);
  }, []);

  const retreat = useCallback(() => {
    if (holdOpenRef.current) return;
    peekHoldRef.current = false;
    blurBoa5AskInput();
    setHovering(false);
    setHidden(true);
  }, []);

  const chrome = useMemo(
    () => ({
      hidden: hidden && !holdOpenEffective,
      holdOpen: holdOpenEffective,
      lineWidth,
      peek,
      releasePeek,
      reveal,
      retreat,
      registerPill,
    }),
    [hidden, holdOpenEffective, lineWidth, peek, releasePeek, reveal, retreat, registerPill],
  );

  return (
    <ToolBottomBarSlotContext.Provider value={slot}>
      <ToolBottomBarChromeContext.Provider value={chrome}>
        {children}
        {variant === "floating" ? (
          <motion.div
            ref={floatingHostRef}
            className={cn(BAR_FLOATING_HOST, "bottom-0", !hostBox && "inset-x-0", className)}
            initial={false}
            animate={
              hostBox
                ? { left: hostBox.left, width: hostBox.width }
                : { left: 0, width: "100%" }
            }
            transition={reduceMotion ? HOST_MOVE_REDUCED : HOST_MOVE_SPRING}
            onUpdate={() => {
              publishHostElementBox(floatingHostRef.current);
            }}
          >
            <div className="pointer-events-auto w-full">
              <ToolBottomBarReveal
                hidden={hidden}
                holdOpen={holdOpenEffective}
                askExpanded={askExpanded}
                lineWidth={lineWidth}
                showGrip={showFloatingGrip}
                onReveal={reveal}
                onRetreat={retreat}
              >
                <ToolBottomBarControls
                  pillRef={registerPill}
                  onSettingsOpen={onSettingsOpen}
                  onQuickSettingsOpenChange={onQuickSettingsOpenChange}
                  askExpanded={askExpanded}
                  onAskExpandedChange={onAskExpandedChange}
                  askFocused={askFocused}
                  onAskFocusedChange={onAskFocusedChange}
                  workstation={workstation}
                  leading={leading}
                  trailing={trailing}
                />
              </ToolBottomBarReveal>
            </div>
          </motion.div>
        ) : null}
      </ToolBottomBarChromeContext.Provider>
    </ToolBottomBarSlotContext.Provider>
  );
}
