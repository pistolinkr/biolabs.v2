import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useViewer, type ChainModel } from "@/contexts/ViewerContext";
import {
  entityKindLabel,
  entityKindSortKey,
  groupChainsByEntityKind,
  type BiomolecularEntityKind,
} from "@/lib/biomolecularEntities";

/**
 * Structure hierarchy grouped by biomolecular entity kind (OpenFold-style lanes).
 */
export default function StructureHierarchyPanel() {
  const {
    structureModel,
    proteinSelection,
    isolateChainId,
    setIsolateChainId,
    setChainVisibilityNGL,
    setHoverChainId,
  } = useViewer();
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState("");
  const [chainOpen, setChainOpen] = useState<Record<string, boolean>>({});
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const title = structureModel?.title ?? proteinSelection?.label ?? "— No structure";
  const chains = structureModel?.chains ?? [];

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return chains;
    return chains.filter((c: ChainModel) => c.id.toUpperCase().includes(q));
  }, [chains, filter]);

  const grouped = useMemo(() => groupChainsByEntityKind(filtered), [filtered]);
  const groupKeys = useMemo(
    () =>
      (Object.keys(grouped) as BiomolecularEntityKind[]).sort(
        (a, b) => entityKindSortKey(a) - entityKindSortKey(b),
      ),
    [grouped],
  );

  if (!proteinSelection && !structureModel) {
    return (
      <div className="border-b border-[#2A2A2A] px-2 py-3 font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A]">
        Load an entry to populate hierarchy
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-[#2A2A2A]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 border-b border-[#2A2A2A] bg-[#111111] px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-widest text-[#8A8A8A] hover:bg-[#171717]"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Chain hierarchy
      </button>
      {open ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-2">
          <div className="font-mono text-[10px] leading-tight text-[#F2F2F2]">{title}</div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="FILTER CHAIN…"
            className="border border-[#2A2A2A] bg-[#0A0A0A] px-1.5 py-1 font-mono text-[10px] uppercase text-[#F2F2F2] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#5A5A5A]"
          />
          <div className="min-h-0 flex-1 overflow-y-auto font-mono text-[10px] leading-snug">
            {groupKeys.map((gk) => {
              const list = grouped[gk];
              if (!list?.length) return null;
              const go = groupOpen[gk] ?? true;
              return (
                <div key={gk} className="mb-1 border border-[#2A2A2A]/80">
                  <button
                    type="button"
                    onClick={() => setGroupOpen((s) => ({ ...s, [gk]: !go }))}
                    className="flex w-full items-center gap-1 bg-[#141414] px-1.5 py-1 text-left text-[9px] uppercase tracking-widest text-[#8A8A8A]"
                  >
                    {go ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    {entityKindLabel(gk)}
                    <span className="ml-auto text-[#5A5A5A]">{list.length}</span>
                  </button>
                  {go
                    ? list.map((c: ChainModel, idx: number) => {
                        const rowKey = `${gk}:${idx}`;
                        const co = chainOpen[rowKey] ?? false;
                        return (
                          <div
                            key={rowKey}
                            className="border-t border-[#2A2A2A]/50 py-1 pl-1"
                            onMouseEnter={() => setHoverChainId(c.id)}
                            onMouseLeave={() => setHoverChainId(null)}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="text-[#8A8A8A] hover:text-[#F2F2F2]"
                                onClick={() => setChainOpen((s) => ({ ...s, [rowKey]: !co }))}
                              >
                                {co ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                              </button>
                              <span className="text-[#F2F2F2]">CHAIN {c.id}</span>
                              <span className="text-[#6A6A6A]">{entityKindLabel(c.entityKind)}</span>
                              {isolateChainId === c.id ? (
                                <span className="text-[#8A8A8A]">[ISO]</span>
                              ) : null}
                              <button
                                type="button"
                                title="Isolate chain"
                                className="ml-auto border border-transparent px-1 text-[9px] uppercase text-[#8A8A8A] hover:border-[#2A2A2A] hover:text-[#F2F2F2]"
                                onClick={() => setIsolateChainId(isolateChainId === c.id ? null : c.id)}
                              >
                                Iso
                              </button>
                              <button
                                type="button"
                                title="Toggle visibility"
                                className="text-[#8A8A8A] hover:text-[#F2F2F2]"
                                onClick={() => setChainVisibilityNGL(c.id, !c.visible)}
                              >
                                {c.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                              </button>
                            </div>
                            {co ? (
                              <div className="mt-1 pl-5 text-[#8A8A8A]">
                                <div>RESIDUES {c.residueCount}</div>
                                <div>ATOMS {c.atomCount}</div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
