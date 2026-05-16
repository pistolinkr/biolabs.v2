import React, { useState } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getGenerativeCandidates } from "@/lib/biolabsJobResult";

function CandidateList({
  title,
  service,
  result,
}: {
  title: string;
  service: "boltz2" | "genmol";
  result: unknown | null;
}) {
  const { setProteinSelection } = useViewer();
  if (result == null) {
    return (
      <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8A8A8A]">{title}</div>
        <div className="font-mono text-[9px] text-[#6A6A6A]">No generation run — ranking / variant comparison placeholder.</div>
      </div>
    );
  }
  const rows = getGenerativeCandidates(result, service);
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8A8A8A]">{title}</div>
        <pre className="max-h-32 overflow-auto font-mono text-[9px] text-[#B0B0B0]">
          {JSON.stringify(result, null, 2).slice(0, 2000)}
        </pre>
      </div>
    );
  }

  return (
    <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2">
      <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8A8A8A]">{title}</div>
      <ul className="max-h-40 space-y-1 overflow-auto font-mono text-[9px]">
        {rows.map((r) => {
          const exp = openId === r.id;
          return (
            <li key={r.id} className="border border-[#2A2A2A] bg-[#0D0D0D]">
              <button
                type="button"
                onClick={() => setOpenId(exp ? null : r.id)}
                className="flex w-full items-start justify-between px-1.5 py-1 text-left hover:bg-[#141414]"
              >
                <span className="text-[#E0E0E0]">
                  {r.rank != null ? `#${r.rank} ` : ""}
                  {r.label}
                </span>
                <span className="text-[#6A6A6A]">{exp ? "−" : "+"}</span>
              </button>
              {exp ? (
                <div className="space-y-1 border-t border-[#2A2A2A] px-1.5 py-1 text-[#B0B0B0]">
                  {r.smiles ? (
                    <div>
                      <span className="text-[#6A6A6A]">SMILES · </span>
                      <span className="break-all">{r.smiles}</span>
                    </div>
                  ) : null}
                  {r.notes ? <div className="text-[#8A8A8A]">{r.notes}</div> : null}
                  {r.structureText ? (
                    <div className="text-[7px] text-[#7A7A7A]">Inline structure ({r.structureText.length} chars)</div>
                  ) : null}
                  {r.structureUrl ? (
                    <a
                      href={r.structureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block border border-[#3A3A3A] px-1 py-0.5 text-[8px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
                    >
                      Open structure URL (mmCIF / download)
                    </a>
                  ) : null}
                  {service === "boltz2" && r.structureText ? (
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([r.structureText!], { type: "chemical/x-mmcif" });
                        const u = URL.createObjectURL(blob);
                        setProteinSelection({
                          source: "file",
                          id: `boltz-${r.id}`,
                          label: `Boltz-2 · ${r.label}`,
                          structureObjectUrl: u,
                          fileName: `boltz-${r.id}.cif`,
                        });
                      }}
                      className="mt-1 border border-[#3A3A3A] px-1 py-0.5 text-[8px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
                    >
                      Load structure in viewer
                    </button>
                  ) : null}
                  <div className="text-[7px] text-[#5A5A5A]">GenMol URL loads use the link above; Boltz mmCIF can load inline.</div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Boltz-2 + GenMol candidate shelf / gallery (minimal). */
export default function GenerativeWorkspacePanel() {
  const { lastBoltzResult, lastGenmolResult } = useAiJobs();

  return (
    <div className="space-y-2">
      <CandidateList title="Boltz-2 · Candidates" service="boltz2" result={lastBoltzResult} />
      <CandidateList title="GenMol · Molecule shelf" service="genmol" result={lastGenmolResult} />
    </div>
  );
}
