import React from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getBiolabsBlock, getEvo2Sections } from "@/lib/biolabsJobResult";

/**
 * EVO2 / reasoning output — structured annotations, not chat bubbles.
 */
export default function Evo2AnnotationPanel() {
  const { lastEvo2Result } = useAiJobs();
  const { setSelectedResidueKey } = useViewer();

  if (lastEvo2Result == null) {
    return (
      <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2 font-mono text-[9px] leading-snug text-[#6A6A6A]">
        Run an <span className="text-[#9A9A9A]">evo2_40b</span> job to populate residue-linked analysis.
      </div>
    );
  }

  const sections = getEvo2Sections(lastEvo2Result);
  const bio = getBiolabsBlock(lastEvo2Result);
  const summary = typeof bio?.summary === "string" ? bio.summary : null;

  if (sections.length === 0) {
    return (
      <div className="space-y-1 border border-[#2A2A2A] bg-[#0A0A0A] p-2 font-mono text-[9px] text-[#C8C8C8]">
        <div className="text-[8px] uppercase tracking-[0.14em] text-[#8A8A8A]">EVO2 · Raw</div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-[9px]">
          {JSON.stringify(lastEvo2Result, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2 border border-[#2A2A2A] bg-[#0A0A0A] p-2 font-mono text-[9px] text-[#C8C8C8]">
      <div className="text-[8px] uppercase tracking-[0.14em] text-[#8A8A8A]">EVO2 · Structured</div>
      {summary ? <div className="border border-[#2A2A2A] bg-[#0D0D0D] p-1.5 text-[#B8B8B8]">{summary}</div> : null}
      <div className="space-y-1.5">
        {sections.map((s, i) => (
          <div key={i} className="border border-[#2A2A2A] bg-[#0D0D0D] p-1.5">
            <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#9A9A9A]">{s.title}</div>
            <div className="whitespace-pre-wrap text-[#C8C8C8]">{s.body}</div>
            {s.residueRef ? (
              <button
                type="button"
                onClick={() => setSelectedResidueKey(s.residueRef ?? null)}
                className="mt-1 border border-[#2A2A2A] px-1 py-0.5 text-[8px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
              >
                Focus {s.residueRef}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
