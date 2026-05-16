import React from "react";
import { toast } from "sonner";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getMsaAlignmentText, isMsaSearchEnvelope } from "@/lib/biolabsJobResult";
import { msaVizHasResidueMaps } from "@/lib/msa/msaVizBinding";
import { analyzeMsaText } from "@/lib/msa";

/**
 * MSA / alignment rail — dense bioinformatics strip under sequence.
 * Renders normalized alignment text when present; otherwise JSON preview.
 */
export default function MsaWorkflowStrip() {
  const { lastMsaResult, submitJob, apiKeyConfigured } = useAiJobs();
  const { setColorScheme, msaVizBinding, structureModel } = useViewer();
  const hasData = lastMsaResult != null;
  const alignment = hasData ? getMsaAlignmentText(lastMsaResult) : null;
  const msaEnvelopeNoAlignment = hasData && isMsaSearchEnvelope(lastMsaResult) && !alignment;

  const pairedFromStructure =
    structureModel?.chains
      .filter((c) => c.entityKind === "protein")
      .sort((a, b) => a.id.localeCompare(b.id))
      .reduce(
        (acc, c) => {
          const s = structureModel.sequenceByChain[c.id]?.replace(/\s/g, "").toUpperCase();
          if (s?.length) acc[c.id] = s;
          return acc;
        },
        {} as Record<string, string>,
      ) ?? {};
  const pairedDemo =
    Object.keys(pairedFromStructure).length >= 2
      ? pairedFromStructure
      : { A: "MKTVRQERLKSIVR", B: "MKTVRQERLKSIVRK" };
  const jsonFallback =
    hasData && !alignment && !msaEnvelopeNoAlignment ? JSON.stringify(lastMsaResult, null, 2).slice(0, 1200) : null;

  let quickStats: { cols: number; meanH: number; truncated: boolean } | null = null;
  if (alignment) {
    try {
      const a = analyzeMsaText(alignment, { maxRows: 256, maxCols: 2048 });
      quickStats = {
        cols: a.alignment.width,
        meanH: a.meanEntropy,
        truncated: a.truncated.rowCapHit || a.truncated.colCapHit,
      };
    } catch {
      quickStats = null;
    }
  }

  return (
    <div className="shrink-0 border-t border-[#2A2A2A] bg-[#0D0D0D]">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#8A8A8A]">
        <span>MSA / Homolog retrieval (ColabFold-style · paired for multimers)</span>
        <div className="flex flex-wrap gap-1">
          <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              void submitJob({
                service: "msa_search",
                input: { sequence: "MKTVRQERLKSIVR", output_alignment_formats: ["a3m"] },
                dryRun: true,
              })
            }
            className="border border-[#2A2A2A] px-1 text-[8px] hover:border-[#5A5A5A]"
          >
            Dry
          </button>
          <button
            type="button"
            onClick={() => {
              if (apiKeyConfigured !== true) {
                toast.error("Live inference unavailable", {
                  description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server.",
                });
                return;
              }
              void submitJob({
                service: "msa_search",
                input: { sequence: "MKTVRQERLKSIVR", output_alignment_formats: ["a3m"] },
                dryRun: false,
              });
            }}
            className="border border-[#2A2A2A] px-1 text-[8px] hover:border-[#5A5A5A]"
          >
            Live
          </button>
          </div>
          <div className="flex gap-1 border-l border-[#2A2A2A] pl-1">
            <button
              type="button"
              title="NVIDIA paired MSA — species-matched rows per chain"
              onClick={() =>
                void submitJob({
                  service: "msa_search_paired",
                  input: { sequences: pairedDemo, pairing_strategy: "greedy" },
                  dryRun: true,
                })
              }
              className="border border-[#3A3A5A] px-1 text-[8px] hover:border-[#5A5A8A]"
            >
              Paired dry
            </button>
            <button
              type="button"
              title="Paired MSA live (needs API key)"
              onClick={() => {
                if (apiKeyConfigured !== true) {
                  toast.error("Live inference unavailable", {
                    description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server.",
                  });
                  return;
                }
                void submitJob({
                  service: "msa_search_paired",
                  input: { sequences: pairedDemo, pairing_strategy: "greedy" },
                  dryRun: false,
                });
              }}
              className="border border-[#3A3A5A] px-1 text-[8px] hover:border-[#5A5A8A]"
            >
              Paired live
            </button>
          </div>
        </div>
      </div>
      <div className="max-h-[88px] overflow-auto px-2 py-1 font-mono text-[9px] text-[#B0B0B0]">
        {quickStats ? (
          <div className="mb-1 flex flex-wrap items-center gap-2 border-b border-[#1A1A1A] pb-1 text-[8px] text-[#7A9A9A]">
            <span>
              {quickStats.cols} cols · mean entropy {quickStats.meanH.toFixed(2)} bits
              {quickStats.truncated ? " · truncated" : ""}
            </span>
            <button
              type="button"
              disabled={!structureModel || !msaVizHasResidueMaps(msaVizBinding)}
              onClick={() => setColorScheme("msa_entropy")}
              className="border border-[#2A5A2A] px-1 text-[8px] uppercase tracking-wide text-[#A8DCA8] hover:border-[#4A8A4A] disabled:opacity-40"
            >
              Viewport · entropy
            </button>
            <button
              type="button"
              disabled={!structureModel || !msaVizHasResidueMaps(msaVizBinding)}
              onClick={() => setColorScheme("msa_gap")}
              className="border border-[#2A4A5A] px-1 text-[8px] uppercase tracking-wide text-[#A8C8DC] hover:border-[#4A7A9A] disabled:opacity-40"
            >
              Viewport · gaps
            </button>
          </div>
        ) : null}
        {alignment ? (
          <pre className="whitespace-pre font-mono text-[8px] leading-tight text-[#A8DCA8]">{alignment}</pre>
        ) : msaEnvelopeNoAlignment ? (
          <div className="text-[#8A8A8A]">
            MSA job returned normalized <span className="text-[#A8A8A8]">biolabs</span> payload but no alignment block
            was found (vendor shape may have changed). Check <span className="text-[#A8A8A8]">raw</span> on the job in
            the API or logs.
          </div>
        ) : jsonFallback ? (
          <pre className="whitespace-pre-wrap break-all">{jsonFallback}</pre>
        ) : (
          <div className="text-[#5A5A5A]">
            No MSA loaded — conservation heatmap / mutation frequency (placeholder). Run MSA Search via pipeline or
            API.
          </div>
        )}
      </div>
    </div>
  );
}
