import React, { useEffect } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getMsaAlignmentText, getMsaAlignmentsByChain } from "@/lib/biolabsJobResult";
import { analyzeMsaAlignment, parseFastaA3m } from "@/lib/msa";
import { buildResidueToMsaColumnMap } from "@/lib/msa/mapStructure";
import type { ChainMsaVizSlice, MsaVizBinding } from "@/lib/msa/msaVizBinding";

function proteinChainsSorted(model: { chains: Array<{ id: string; entityKind: string }> }) {
  return model.chains.filter((c) => c.entityKind === "protein").sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * When MSA + structure are both available, map columns to residues and expose {@link MsaVizBinding} for NGL colormakers.
 */
export default function MsaResultLoader() {
  const { lastMsaResult } = useAiJobs();
  const { structureModel, setMsaVizBinding } = useViewer();

  useEffect(() => {
    if (!lastMsaResult || !structureModel) {
      setMsaVizBinding(null);
      return;
    }

    let perChainA3m: Record<string, string> = { ...getMsaAlignmentsByChain(lastMsaResult) };
    if (Object.keys(perChainA3m).length === 0) {
      const single = getMsaAlignmentText(lastMsaResult);
      const primary = proteinChainsSorted(structureModel)[0]?.id;
      if (single?.trim() && primary) {
        perChainA3m = { [primary]: single };
      }
    }

    if (Object.keys(perChainA3m).length === 0) {
      setMsaVizBinding(null);
      return;
    }

    const chainsPayload: Record<string, ChainMsaVizSlice> = {};

    for (const ch of proteinChainsSorted(structureModel)) {
      const text = perChainA3m[ch.id];
      if (!text?.trim()) continue;

      const bundle = parseFastaA3m(text);
      const analysis = analyzeMsaAlignment(bundle.alignment, {
        maxRows: bundle.alignment.rows.length,
        maxCols: bundle.alignment.width,
        rowCapHit: bundle.rowCapHit,
        colCapHit: bundle.colCapHit,
      });

      const seq = structureModel.sequenceByChain[ch.id] ?? "";
      if (!seq.length) continue;

      const queryRow = bundle.alignment.rows[bundle.alignment.queryIndex]?.matchStates ?? "";
      const ordMap = buildResidueToMsaColumnMap(ch.id, seq, queryRow);

      const resnos = structureModel.residueResnosByChain[ch.id];
      const residueKeyToColumn: Record<string, number> = {};

      if (resnos && resnos.length === seq.length) {
        for (let i = 0; i < seq.length; i++) {
          const ordKey = `${ch.id}:${i + 1}`;
          const col = ordMap.residueKeyToColumn[ordKey];
          if (col !== undefined) {
            residueKeyToColumn[`${ch.id}:${resnos[i]!}`] = col;
          }
        }
      } else {
        Object.assign(residueKeyToColumn, ordMap.residueKeyToColumn);
      }

      let entropyMin = Infinity;
      let entropyMax = -Infinity;
      for (const c of Object.values(residueKeyToColumn)) {
        const e = analysis.columns[c]?.entropy ?? 0;
        entropyMin = Math.min(entropyMin, e);
        entropyMax = Math.max(entropyMax, e);
      }
      if (!Number.isFinite(entropyMin)) entropyMin = 0;
      if (!Number.isFinite(entropyMax)) entropyMax = 1;

      chainsPayload[ch.id] = {
        analysis,
        residueKeyToColumn,
        entropyMin,
        entropyMax,
        identityFraction: ordMap.identityFraction,
        exactQueryMatch: ordMap.exactQueryMatch,
      };
    }

    if (Object.keys(chainsPayload).length === 0) {
      setMsaVizBinding(null);
      return;
    }

    const binding: MsaVizBinding = { chains: chainsPayload };
    setMsaVizBinding(binding);
  }, [lastMsaResult, structureModel, setMsaVizBinding]);

  return null;
}
