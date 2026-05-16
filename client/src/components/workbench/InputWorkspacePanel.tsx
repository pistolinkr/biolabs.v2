import { Dna, FileStack, Layers } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useViewer } from "@/contexts/ViewerContext";
import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";

function parseFasta(text: string): { header: string; sequence: string } | null {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;
  const header = lines[0].startsWith(">") ? lines[0].slice(1).trim() : "sequence";
  const seqLines = lines[0].startsWith(">") ? lines.slice(1) : lines;
  const sequence = seqLines.join("").replace(/\s/g, "").toUpperCase();
  if (!sequence.length) return null;
  return { header, sequence };
}

/**
 * Workspace-style input rail: structure stack, file import, FASTA / MSA / preset placeholders.
 */
export default function InputWorkspacePanel() {
  const {
    proteinSelection,
    setProteinSelection,
    structureModel,
    setFocusResidueQuery,
  } = useViewer();
  const [fastaDraft, setFastaDraft] = useState("");
  const [fastaParsed, setFastaParsed] = useState<{ header: string; sequence: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".cif") && !lower.endsWith(".mmcif") && !lower.endsWith(".pdb") && !lower.endsWith(".ent")) {
        return;
      }
      const structureObjectUrl = URL.createObjectURL(file);
      const sel: ProteinSelection = {
        source: "file",
        id: file.name.replace(/\.[^.]+$/, ""),
        label: file.name,
        fileName: file.name,
        structureObjectUrl,
      };
      setProteinSelection(sel);
    },
    [setProteinSelection],
  );

  const parseFastaLocal = () => {
    const p = parseFasta(fastaDraft);
    setFastaParsed(p);
    if (p) setFocusResidueQuery("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 font-mono text-[10px] text-[#B0B0B0]">
      <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2">
        <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-[#8A8A8A]">
          <Layers className="size-3" />
          Entity stack
        </div>
        {proteinSelection ? (
          <div className="space-y-1 text-[#F2F2F2]">
            <div className="break-all">{proteinSelection.label}</div>
            <div className="text-[#8A8A8A]">
              {proteinSelection.source} · {proteinSelectionKey(proteinSelection)}
            </div>
            {structureModel ? (
              <div className="text-[#8A8A8A]">
                {structureModel.atomCount.toLocaleString()} atoms · {structureModel.chains.length} chains
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-[#6A6A6A]">No structure document — import or search in Source tab.</div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border border-dashed p-4 text-center transition-colors ${
          dragOver ? "border-[#7C8A99] bg-[#141414]" : "border-[#2A2A2A] bg-[#111111]"
        }`}
      >
        <FileStack className="mx-auto mb-2 size-6 text-[#6A6A6A]" />
        <div className="uppercase tracking-widest text-[#8A8A8A]">Structure import</div>
        <div className="mt-1 text-[#6A6A6A]">Drop PDB / mmCIF</div>
      </div>

      <div className="border border-[#2A2A2A] bg-[#111111] p-2">
        <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-[#8A8A8A]">
          <Dna className="size-3" />
          Sequence · FASTA
        </div>
        <textarea
          value={fastaDraft}
          onChange={(e) => setFastaDraft(e.target.value)}
          placeholder=">header MKFL..."
          className="mb-1 min-h-[72px] w-full border border-[#2A2A2A] bg-[#0A0A0A] p-1.5 text-[10px] text-[#F2F2F2] placeholder:text-[#5A5A5A] focus:outline-none"
        />
        <button
          type="button"
          onClick={parseFastaLocal}
          className="w-full border border-[#2A2A2A] bg-[#0A0A0A] py-1 uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A]"
        >
          Parse FASTA
        </button>
        {fastaParsed ? (
          <div className="mt-2 text-[#C8C8C8]">
            <div className="text-[#8A8A8A]">{fastaParsed.header}</div>
            <div className="line-clamp-2 break-all">{fastaParsed.sequence.slice(0, 120)}…</div>
            <div className="mt-1 text-[#6A6A6A]">Alignment / folding pipeline — not attached</div>
          </div>
        ) : null}
      </div>

      <div className="border border-[#2A2A2A] bg-[#111111] p-2 opacity-80">
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8A8A8A]">MSA attachment</div>
        <div className="mt-1 text-[#6A6A6A]">AIF / a3m / stockholm — drag-drop pending</div>
      </div>

      <div className="border border-[#2A2A2A] bg-[#111111] p-2 opacity-80">
        <div className="text-[9px] uppercase tracking-[0.14em] text-[#8A8A8A]">Simulation preset</div>
        <div className="mt-1 text-[#6A6A6A]">Relax · AF3-style · MD — placeholder slots</div>
      </div>
    </div>
  );
}
