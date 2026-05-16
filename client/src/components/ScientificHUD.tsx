import React, { useState, useEffect, useRef, type RefObject, useLayoutEffect } from "react";
import { GripVertical } from "lucide-react";
import { useViewer } from "@/contexts/ViewerContext";

interface HUDMetrics {
  fps: number;
  atomCount: number;
  chainCount: number;
  mode: string;
  color: string;
  temperature: number;
  selectedResidue: string;
}

interface ScientificHUDProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  metrics?: Partial<HUDMetrics>;
  /** Bounds — drag keeps HUD fully inside; hard clamp, no animation. */
  canvasRef?: RefObject<HTMLElement | null>;
  /**
   * When true, HUD is `absolute` in the panel (needs a `relative` ancestor).
   * When false, HUD is `fixed` to the viewport.
   */
  dockInsidePanel?: boolean;
}

/**
 * Biolabs Scientific HUD
 * 
 * Minimal terminal-like overlay for real-time metrics
 * - FPS counter
 * - Atom/chain count
 * - Simulation state
 * - Temperature and energy
 * - Selected residue info
 */
const HUD_CLAIM_PADDING = 8;

function clampOffsetIntoBounds(
  bounds: DOMRectReadOnly,
  hudRect: DOMRectReadOnly,
  offset: { x: number; y: number },
): { x: number; y: number } {
  const minLeft = bounds.left + HUD_CLAIM_PADDING;
  const minTop = bounds.top + HUD_CLAIM_PADDING;
  const maxLeft = bounds.right - HUD_CLAIM_PADDING - hudRect.width;
  const maxTop = bounds.bottom - HUD_CLAIM_PADDING - hudRect.height;

  const loLeft = Math.min(minLeft, maxLeft);
  const hiLeft = Math.max(minLeft, maxLeft);
  const loTop = Math.min(minTop, maxTop);
  const hiTop = Math.max(minTop, maxTop);

  const targetLeft = Math.min(Math.max(hudRect.left, loLeft), hiLeft);
  const targetTop = Math.min(Math.max(hudRect.top, loTop), hiTop);
  const ddx = targetLeft - hudRect.left;
  const ddy = targetTop - hudRect.top;

  return { x: offset.x + ddx, y: offset.y + ddy };
}

export default function ScientificHUD({
  visible = true,
  position = "top-right",
  metrics: customMetrics,
  canvasRef,
  dockInsidePanel = false,
}: ScientificHUDProps) {
  const { structureModel, representation, colorScheme, selectedResidueKey, molecularFocus, msaVizBinding } =
    useViewer();
  const [fps, setFps] = useState(60);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragActive = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const hudWrapRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(dragOffset);

  dragOffsetRef.current = dragOffset;

  /** After offset paints, snap HUD so it stays inside panel (no spring). */
  useLayoutEffect(() => {
    if (!canvasRef?.current || !hudWrapRef.current) return;
    const boundsEl = canvasRef.current;
    const hudEl = hudWrapRef.current;
    const bounds = boundsEl.getBoundingClientRect();
    const hudRect = hudEl.getBoundingClientRect();
    const clamped = clampOffsetIntoBounds(bounds, hudRect, dragOffset);
    if (Math.abs(clamped.x - dragOffset.x) > 0.01 || Math.abs(clamped.y - dragOffset.y) > 0.01) {
      dragOffsetRef.current = clamped;
      setDragOffset(clamped);
    }
  }, [dragOffset, canvasRef]);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = Date.now();
    const rafRef = { id: 0 as number };

    const loop = () => {
      frameCount += 1;
      rafRef.id = requestAnimationFrame(loop);
    };
    rafRef.id = requestAnimationFrame(loop);

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 1) {
        setFps(Math.min(240, Math.round(frameCount / elapsed)));
        frameCount = 0;
        lastTime = now;
      }
    }, 250);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafRef.id);
    };
  }, []);

  const defaultMetrics: HUDMetrics = {
    fps,
    atomCount: structureModel?.atomCount ?? 0,
    chainCount: structureModel?.chains.length ?? 0,
    mode: representation.toUpperCase(),
    color: colorScheme.toUpperCase(),
    temperature: 310,
    selectedResidue: molecularFocus?.primary.label ?? selectedResidueKey ?? "—",
  };

  const displayMetrics = { ...defaultMetrics, ...customMetrics };

  const handleHudPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive.current = true;
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      ox: dragOffsetRef.current.x,
      oy: dragOffsetRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHudPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragActive.current) return;
    const d = dragStart.current;
    const next = {
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
    };
    dragOffsetRef.current = next;
    setDragOffset(next);
  };

  const handleHudPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragActive.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!visible) return null;

  const positionClasses = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
  };

  const posMode = dockInsidePanel ? 'absolute' : 'fixed';

  return (
    <div
      ref={hudWrapRef}
      className={`${posMode} ${positionClasses[position]} z-40 pointer-events-none`}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <div className="space-y-1 pointer-events-none border border-[#2A2A2A] bg-[#171717]/95 p-2 font-mono text-[10px] text-[#8A8A8A]">
        {/* Header — drag by top-right grip */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="select-none font-medium uppercase tracking-[0.12em] text-[#F2F2F2]">HUD</div>
          <button
            type="button"
            className="pointer-events-auto -m-1 -mr-0.5 shrink-0 cursor-grab touch-none select-none p-1 text-[#8A8A8A] outline-none hover:text-[#F2F2F2] active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-[#3A3A3A]"
            aria-label="HUD move"
            title="Drag"
            onPointerDown={handleHudPointerDown}
            onPointerMove={handleHudPointerMove}
            onPointerUp={handleHudPointerUp}
            onPointerCancel={handleHudPointerUp}
          >
            <GripVertical className="size-3.5 opacity-80" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">FPS</span>
            <span className="text-[#F2F2F2]">{displayMetrics.fps}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">Atoms</span>
            <span className="text-[#F2F2F2]">{displayMetrics.atomCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">Chains</span>
            <span className="text-[#F2F2F2]">{displayMetrics.chainCount}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">Mode</span>
            <span className="text-[#F2F2F2]">{displayMetrics.mode}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">Color</span>
            <span className="text-[#F2F2F2]">{displayMetrics.color}</span>
          </div>
          {msaVizBinding && (colorScheme === "msa_entropy" || colorScheme === "msa_gap") ? (
            <div className="max-w-[200px] text-[9px] leading-tight text-[#6A9A6A]">
              {Object.entries(msaVizBinding.chains)
                .map(
                  ([cid, s]) =>
                    `${cid}: ${(s.identityFraction * 100).toFixed(0)}% id · ${s.analysis.columns.length} cols`,
                )
                .join(" · ")}
              <span className="block pt-0.5 text-[#5A5A5A]">Blue → conserved / low gap · Yellow → variable / high gap</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-6">
            <span className="uppercase tracking-wide">Temp</span>
            <span className="text-[#F2F2F2]">{displayMetrics.temperature}K</span>
          </div>
        </div>

        <div className="my-1.5 border-t border-[#2A2A2A]" />

        <div className="flex justify-between gap-6">
          <span className="uppercase tracking-wide">Focus</span>
          <span className="max-w-[160px] truncate text-right text-[#F2F2F2]" title={molecularFocus?.primary.label}>
            {molecularFocus ? `${molecularFocus.radiusAngstrom}Å ctx` : "—"}
          </span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="uppercase tracking-wide">Pick</span>
          <span className="max-w-[140px] truncate text-right text-[#F2F2F2]">{displayMetrics.selectedResidue}</span>
        </div>
      </div>
    </div>
  );
}
