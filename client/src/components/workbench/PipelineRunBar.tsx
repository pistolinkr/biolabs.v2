import React, { useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import type { CreateAiJobBody } from "@/lib/aiApi";
import { postAiPipelineRun } from "@/lib/aiApi";
import { minimalLiveInput } from "@/lib/nimJobDefaults";

const PIPELINE_DEMO_SEQUENCE = "MKTVRQERLKSIVR";
const PIPELINE_DEMO_PAIRED = { A: "MKTVRQERLKSIVR", B: "MKTVRQERLKSIVRK" };

/** Pipeline-first control strip — explicit dry vs live NVIDIA submission. */
export default function PipelineRunBar() {
  const { pipelines, submitJob, apiKeyConfigured, trackJobStream } = useAiJobs();
  const { structureModel } = useViewer();

  const pairedPipelineSequences = useMemo(() => {
    if (!structureModel) return PIPELINE_DEMO_PAIRED;
    const prot = structureModel.chains
      .filter((c) => c.entityKind === "protein")
      .sort((a, b) => a.id.localeCompare(b.id));
    const out: Record<string, string> = {};
    for (const c of prot) {
      const s = structureModel.sequenceByChain[c.id]?.replace(/\s/g, "").toUpperCase();
      if (s?.length) out[c.id] = s;
    }
    return Object.keys(out).length >= 2 ? out : PIPELINE_DEMO_PAIRED;
  }, [structureModel]);

  const dry = async (service: CreateAiJobBody["service"]) => {
    await submitJob({ service, input: { note: "biolabs-ui-dry" }, dryRun: true });
  };

  const live = async (service: CreateAiJobBody["service"]) => {
    if (apiKeyConfigured !== true) {
      toast.error("Live inference unavailable", {
        description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server. Dry runs still work.",
      });
      return;
    }
    await submitJob({
      service,
      input: { note: "biolabs-ui-live", ...minimalLiveInput(service) },
      dryRun: false,
    });
  };

  const runFastaMsaAf3 = async (dryRun: boolean) => {
    if (!dryRun && apiKeyConfigured !== true) {
      toast.error("Live inference unavailable", {
        description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server. Dry runs still work.",
      });
      return;
    }
    toast.message("Pipeline MSA → AF3", {
      description: dryRun ? "Dry stub (instant MSA + fold stubs)." : "Server waits for MSA, then queues OpenFold3 (minutes).",
    });
    try {
      const out = await postAiPipelineRun("fasta_msa_af3", {
        sequence: PIPELINE_DEMO_SEQUENCE,
        dryRun,
      });
      if (!out.ok) {
        toast.error(out.error);
        return;
      }
      trackJobStream(out.msaJob.id);
      trackJobStream(out.foldJob.id);
      toast.success("Pipeline jobs created", {
        description: `MSA ${out.msaJob.id.slice(0, 8)}… · AF3 ${out.foldJob.id.slice(0, 8)}…`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline request failed");
    }
  };

  const runPairedMsaBoltz2 = async (dryRun: boolean) => {
    if (!dryRun && apiKeyConfigured !== true) {
      toast.error("Live inference unavailable", {
        description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server. Dry runs still work.",
      });
      return;
    }
    toast.message("Pipeline Paired MSA → Boltz-2", {
      description: dryRun ? "Dry stub (instant paired MSA + Boltz stubs)." : "Server waits for paired MSA, then queues Boltz-2.",
    });
    try {
      const out = await postAiPipelineRun("paired_msa_boltz2", {
        sequences: pairedPipelineSequences,
        dryRun,
      });
      if (!out.ok) {
        toast.error(out.error);
        return;
      }
      trackJobStream(out.msaJob.id);
      trackJobStream(out.foldJob.id);
      toast.success("Pipeline jobs created", {
        description: `Paired MSA ${out.msaJob.id.slice(0, 8)}… · Boltz ${out.foldJob.id.slice(0, 8)}…`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline request failed");
    }
  };

  return (
    <div className="shrink-0 border-b border-[#2A2A2A] bg-[#101010] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[#8A8A8A]">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 text-[#6A6A6A]">Pipeline</span>
        {pipelines.slice(0, 3).map((p, i) => {
          const preset = p as { id?: string; label?: string };
          if (preset.id === "fasta_msa_af3") {
            return (
              <span
                key={preset.id ?? i}
                className="inline-flex flex-wrap items-center gap-0.5 border border-[#2A2A2A] px-1 py-0.5 text-[#9A9A9A]"
                title="Runs on server: ColabFold MSA then OpenFold3 with A3M"
              >
                <span className="max-w-[140px] truncate">{preset.label ?? "MSA→AF3"}</span>
                <button
                  type="button"
                  onClick={() => void runFastaMsaAf3(true)}
                  className="border border-[#1A1A1A] px-1 text-[7px] text-[#8A8A8A] hover:border-[#4A4A4A]"
                >
                  D
                </button>
                <button
                  type="button"
                  onClick={() => void runFastaMsaAf3(false)}
                  className="border border-[#1A1A1A] px-1 text-[7px] text-[#8A9A8A] hover:border-[#4A4A4A]"
                >
                  L
                </button>
              </span>
            );
          }
          if (preset.id === "paired_msa_boltz2") {
            return (
              <span
                key={preset.id ?? i}
                className="inline-flex flex-wrap items-center gap-0.5 border border-[#2A2A4A] px-1 py-0.5 text-[#9A9AAA]"
                title="Paired ColabFold MSA (multimer) then Boltz-2 with per-chain A3M"
              >
                <span className="max-w-[150px] truncate">{preset.label ?? "Paired→Boltz"}</span>
                <button
                  type="button"
                  onClick={() => void runPairedMsaBoltz2(true)}
                  className="border border-[#1A1A1A] px-1 text-[7px] text-[#8A8A9A] hover:border-[#4A4A5A]"
                >
                  D
                </button>
                <button
                  type="button"
                  onClick={() => void runPairedMsaBoltz2(false)}
                  className="border border-[#1A1A1A] px-1 text-[7px] text-[#8A8ABA] hover:border-[#4A4A6A]"
                >
                  L
                </button>
              </span>
            );
          }
          return (
            <span key={preset.id ?? i} className="border border-[#2A2A2A] px-1.5 py-0.5 text-[#9A9A9A]" title="Preset">
              {preset.label ?? `preset-${i}`}
            </span>
          );
        })}
        <span className="mx-1 h-3 w-px bg-[#2A2A2A]" />
        <span className="text-[#5A5A5A]">PV</span>
        <Link
          href="/msa-search"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A9A7A] hover:border-[#3A3A3A] hover:text-[#A8DCA8]"
        >
          MSA
        </Link>
        <Link
          href="/openfold"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A9A7A] hover:border-[#3A3A3A] hover:text-[#A8DCA8]"
        >
          OF3
        </Link>
        <Link
          href="/evo2"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A9A7A] hover:border-[#3A3A3A] hover:text-[#A8DCA8]"
        >
          EVO2
        </Link>
        <Link
          href="/boltz2"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A9A7A] hover:border-[#3A3A3A] hover:text-[#A8DCA8]"
        >
          Boltz
        </Link>
        <Link
          href="/genmol"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A9A7A] hover:border-[#3A3A3A] hover:text-[#A8DCA8]"
        >
          GenMol
        </Link>
        <Link
          href="/api-tech"
          className="border border-[#1A1A1A] px-1 py-0.5 text-[#7A8A9A] hover:border-[#3A3A3A] hover:text-[#B8C8DC]"
          title="BFF + NIM reference"
        >
          API
        </Link>
        <span className="mx-1 h-3 w-px bg-[#2A2A2A]" />
        <span className="text-[#5A5A5A]">Dry</span>
        <button
          type="button"
          onClick={() => void dry("msa_search")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          MSA
        </button>
        <button
          type="button"
          onClick={() => void dry("msa_search_paired")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          MSA×2
        </button>
        <button
          type="button"
          onClick={() => void dry("alphafold3")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          AF3
        </button>
        <button
          type="button"
          onClick={() => void dry("evo2_40b")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          EVO2
        </button>
        <button
          type="button"
          onClick={() => void dry("boltz2")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          Boltz
        </button>
        <button
          type="button"
          onClick={() => void dry("genmol")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          GenMol
        </button>
        <span className="mx-1 h-3 w-px bg-[#2A2A2A]" />
        <span className="text-[#5A5A5A]">Live</span>
        <button
          type="button"
          onClick={() => void live("msa_search")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          MSA
        </button>
        <button
          type="button"
          onClick={() => void live("msa_search_paired")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          MSA×2
        </button>
        <button
          type="button"
          onClick={() => void live("alphafold3")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          AF3
        </button>
        <button
          type="button"
          onClick={() => void live("evo2_40b")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          EVO2
        </button>
        <button
          type="button"
          onClick={() => void live("boltz2")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          Boltz
        </button>
        <button
          type="button"
          onClick={() => void live("genmol")}
          className="border border-[#2A2A2A] px-1.5 py-0.5 hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
        >
          GenMol
        </button>
        <span className="ml-auto text-[#5A5A5A]">
          {apiKeyConfigured === false ? "server key missing — live disabled" : apiKeyConfigured === true ? "" : ""}
        </span>
      </div>
    </div>
  );
}
