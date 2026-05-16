import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

/** Max AA buttons — long chains use a virtualized horizontal window. */
const WINDOW_RESIDUES = 420;
const APPROX_CHAR_PX = 8;

export default function SequenceStrip() {
  const { structureModel, selectedResidueKey, setSelectedResidueKey, focusResidueQuery, setFocusResidueQuery, hoverChainId } =
    useViewer();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const primaryChain = useMemo(() => {
    if (!structureModel?.chains.length) return undefined;
    const prot = structureModel.chains.find((c) => c.entityKind === "protein");
    return prot?.id ?? structureModel.chains[0].id;
  }, [structureModel]);
  const seq = primaryChain ? structureModel?.sequenceByChain[primaryChain] ?? "" : "";

  const sequencesSkipped =
    !!structureModel &&
    !!primaryChain &&
    seq.length === 0 &&
    (structureModel.chains[0]?.residueCount ?? 0) > 0;

  const totalLen =
    sequencesSkipped && structureModel?.chains[0]
      ? structureModel.chains[0].residueCount
      : seq.length;

  const useVirtual = seq.length > WINDOW_RESIDUES;
  const [sliceStart, setSliceStart] = useState(0);

  useEffect(() => {
    setSliceStart(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [seq, primaryChain]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !useVirtual) return;
    const start = Math.min(
      Math.max(0, seq.length - WINDOW_RESIDUES),
      Math.max(0, Math.floor(el.scrollLeft / APPROX_CHAR_PX)),
    );
    setSliceStart(start);
  }, [seq.length, useVirtual]);

  const { slice, start } = useMemo(() => {
    if (!useVirtual) return { slice: seq, start: 0 };
    const s = Math.min(sliceStart, Math.max(0, seq.length - WINDOW_RESIDUES));
    return { slice: seq.slice(s, s + WINDOW_RESIDUES), start: s };
  }, [seq, useVirtual, sliceStart]);

  const filteredIdx = useMemo(() => {
    if (!focusResidueQuery.trim() || !seq.length) return null;
    const n = parseInt(focusResidueQuery, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= seq.length) return n - 1;
    return null;
  }, [focusResidueQuery, seq]);

  if (!structureModel || !primaryChain) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#6A6A6A]">
        Sequence · no polymer loaded
      </div>
    );
  }

  if (sequencesSkipped) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#111111] px-2 py-1.5 font-mono text-[9px] leading-snug text-[#8A8A8A]">
        <div className="uppercase tracking-widest text-[#6A6A6A]">SEQ {primaryChain}</div>
        <div>
          Sequence map omitted (large structure, {totalLen.toLocaleString()} residues). Use{" "}
          <span className="text-[#C8C8C8]">RES #</span> to jump.
        </div>
      </div>
    );
  }

  if (!seq.length) {
    return (
      <div className="shrink-0 border-t border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#6A6A6A]">
        Sequence · no polymer loaded
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 border-t border-[#2A2A2A] bg-[#111111]",
        hoverChainId && hoverChainId === primaryChain && "ring-1 ring-[#6A737C] ring-inset",
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-2 py-0.5">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#8A8A8A]">
          SEQ {primaryChain}
        </span>
        <input
          value={focusResidueQuery}
          onChange={(e) => setFocusResidueQuery(e.target.value)}
          placeholder="RES #"
          className="w-16 border border-[#2A2A2A] bg-[#0A0A0A] px-1 py-0.5 font-mono text-[10px] text-[#F2F2F2] focus:outline-none"
        />
        {useVirtual ? (
          <span className="ml-auto font-mono text-[8px] text-[#6A6A6A]">
            {start + 1}–{start + slice.length} / {seq.length.toLocaleString()}
          </span>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        onScroll={useVirtual ? onScroll : undefined}
        className="max-h-[72px] overflow-x-auto overflow-y-hidden px-2 py-1"
      >
        {useVirtual ? (
          <div
            className="relative font-mono text-[11px] leading-none tracking-tight text-[#C8C8C8]"
            style={{ width: seq.length * APPROX_CHAR_PX, minHeight: 22 }}
          >
            <div className="absolute top-0 flex gap-px" style={{ left: start * APPROX_CHAR_PX }}>
              {slice.split("").map((aa: string, i: number) => {
                const globalIdx = start + i;
                const hi =
                  hoverIdx === globalIdx ||
                  filteredIdx === globalIdx ||
                  selectedResidueKey === `${primaryChain}:${globalIdx + 1}`;
                return (
                  <button
                    key={globalIdx}
                    type="button"
                    title={`${primaryChain} ${globalIdx + 1} ${aa}`}
                    className={`min-w-[10px] border px-[1px] py-0.5 ${
                      hi
                        ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
                        : "border-transparent text-[#A8A8A8] hover:border-[#3A3A3A]"
                    }`}
                    onMouseEnter={() => setHoverIdx(globalIdx)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onClick={() => setSelectedResidueKey(`${primaryChain}:${globalIdx + 1}`)}
                  >
                    {aa}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-w-max gap-px font-mono text-[11px] leading-none tracking-tight text-[#C8C8C8]">
            {slice.split("").map((aa: string, i: number) => {
              const globalIdx = i;
              const hi =
                hoverIdx === globalIdx ||
                filteredIdx === globalIdx ||
                selectedResidueKey === `${primaryChain}:${globalIdx + 1}`;
              return (
                <button
                  key={globalIdx}
                  type="button"
                  title={`${primaryChain} ${globalIdx + 1} ${aa}`}
                  className={`min-w-[10px] border px-[1px] py-0.5 ${
                    hi
                      ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
                      : "border-transparent text-[#A8A8A8] hover:border-[#3A3A3A]"
                  }`}
                  onMouseEnter={() => setHoverIdx(globalIdx)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => setSelectedResidueKey(`${primaryChain}:${globalIdx + 1}`)}
                >
                  {aa}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-2 pb-1 font-mono text-[8px] uppercase tracking-wider text-[#6A6A6A]">
        Domains / SS overlay — not annotated (stub)
      </div>
    </div>
  );
}
