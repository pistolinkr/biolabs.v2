import { Search, RefreshCw, Upload } from "lucide-react";
import React, { startTransition, useEffect, useRef, useState } from "react";
import {
  type ProteinSearchHit,
  type ProteinSearchSource,
  type ProteinSelection,
  proteinHitToSelection,
  searchRcsb,
  searchUniProt,
} from "@/lib/proteinApis";
import { loadSourceSearchFromSession, saveSourceSearchToSession } from "@/lib/sourceSearchStorage";
import { useViewer } from "@/contexts/ViewerContext";

const STRUCTURE_ACCEPT = ".pdb,.cif,.mmcif,.ent";

export default function ProteinSourcePanel() {
  const { setProteinSelection } = useViewer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = loadSourceSearchFromSession();
  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);
  const [searchSource, setSearchSource] = useState<ProteinSearchSource>(initial.searchSource);
  const [hits, setHits] = useState<ProteinSearchHit[]>(initial.hits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveSourceSearchToSession({ searchQuery, searchSource, hits, error });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchQuery, searchSource, hits, error]);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setHits([]);
    try {
      const next = searchSource === "uniprot" ? await searchUniProt(q) : await searchRcsb(q);
      startTransition(() => {
        setHits(next);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHit = (hit: ProteinSearchHit, preferred?: "experimental" | "alphafold") => {
    setProteinSelection(proteinHitToSelection(hit, preferred ? { preferredStructure: preferred } : undefined));
  };

  const handleLocalStructurePick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".pdb") &&
      !lower.endsWith(".cif") &&
      !lower.endsWith(".mmcif") &&
      !lower.endsWith(".ent")
    ) {
      setError("Choose a .pdb / .cif / .mmcif / .ent file");
      return;
    }
    setError(null);
    const structureObjectUrl = URL.createObjectURL(file);
    const sel: ProteinSelection = {
      source: "file",
      id: file.name.replace(/\.[^.]+$/, ""),
      label: file.name,
      fileName: file.name,
      structureObjectUrl,
    };
    setProteinSelection(sel);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="space-y-2 border-b border-[#2A2A2A] p-2">
        <div className="flex gap-1">
          {(
            [
              { id: "rcsb" as const, label: "RCSB" },
              { id: "uniprot" as const, label: "UniProt" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSearchSource(tab.id);
                setHits([]);
                setError(null);
              }}
              className={`flex-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${
                searchSource === tab.id
                  ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
                  : "border-[#2A2A2A] bg-[#111111] text-[#8A8A8A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form onSubmit={runSearch} className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[#6A6A6A]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchSource === "rcsb" ? "PDB ID / text" : "ACCESSION / TEXT"}
              className="w-full border border-[#2A2A2A] bg-[#0A0A0A] py-1.5 pl-7 pr-2 font-mono text-[10px] uppercase text-[#F2F2F2] placeholder:text-[#5A5A5A] focus:outline-none focus:border-[#5A5A5A]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="border border-[#2A2A2A] bg-[#111111] px-2 font-mono text-[10px] uppercase text-[#F2F2F2] hover:border-[#5A5A5A] disabled:opacity-50"
          >
            {loading ? <RefreshCw className="size-3 animate-spin" /> : "Run"}
          </button>
        </form>
        {error ? (
          <div className="border border-[#5A3A3A] bg-[#1A1010] px-2 py-1 font-mono text-[10px] text-[#E88]">
            {error}
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept={STRUCTURE_ACCEPT}
          className="hidden"
          aria-hidden
          onChange={(e) => {
            handleLocalStructurePick(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1 border border-[#2A2A2A] bg-[#111111] py-1 font-mono text-[10px] uppercase text-[#8A8A8A] hover:border-[#5A5A5A] hover:text-[#C8C8C8]"
        >
          <Upload className="size-3" />
          Import file
        </button>
      </div>
      {hits.length ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="space-y-1 overflow-hidden p-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#8A8A8A]">
              Results {hits.length}
            </div>
            {hits.map((hit) => (
              <div key={`${hit.source}-${hit.id}`} className="border border-[#2A2A2A] bg-[#111111]">
                <button
                  type="button"
                  onClick={() => handleSelectHit(hit)}
                  className="w-full px-2 py-1.5 text-left hover:bg-[#171717]"
                >
                  <div className="truncate font-mono text-[10px] text-[#F2F2F2]">{hit.title}</div>
                  {hit.subtitle ? (
                    <div className="truncate font-mono text-[9px] text-[#8A8A8A]">{hit.subtitle}</div>
                  ) : null}
                </button>
                {hit.source === "uniprot" && hit.pdbIds?.length ? (
                  <div className="flex gap-1 border-t border-[#2A2A2A] px-2 py-1">
                    <button
                      type="button"
                      className="flex-1 border border-[#2A2A2A] py-0.5 font-mono text-[9px] uppercase text-[#B0B0B0] hover:border-[#5A5A5A]"
                      onClick={() => handleSelectHit(hit, "experimental")}
                    >
                      PDB
                    </button>
                    <button
                      type="button"
                      className="flex-1 border border-[#2A2A2A] py-0.5 font-mono text-[9px] uppercase text-[#B0B0B0] hover:border-[#5A5A5A]"
                      onClick={() => handleSelectHit(hit, "alphafold")}
                    >
                      AlphaFold
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
