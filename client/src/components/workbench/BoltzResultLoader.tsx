import React, { useEffect, useRef } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { pickBestGenerativeStructureCandidate } from "@/lib/biolabsJobResult";
import { extFromUrlPath } from "@/lib/chemStructureBlob";

/**
 * When a Boltz-2 job completes with mmCIF (inline or URL) on the best-ranked candidate, load it into the viewer.
 */
export default function BoltzResultLoader() {
  const { lastBoltzResult } = useAiJobs();
  const { setProteinSelection } = useViewer();
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastBoltzResult) return undefined;
    const candidate = pickBestGenerativeStructureCandidate(lastBoltzResult, "boltz2");
    if (!candidate) return undefined;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (candidate.structureText) {
      const blob = new Blob([candidate.structureText], { type: "chemical/x-mmcif" });
      const u = URL.createObjectURL(blob);
      blobUrlRef.current = u;
      setProteinSelection({
        source: "file",
        id: `boltz-${candidate.id}`,
        label: `Boltz-2 · ${candidate.label}`,
        structureObjectUrl: u,
        fileName: `boltz-${candidate.id}.cif`,
      });
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }

    if (candidate.structureUrl) {
      const ext = extFromUrlPath(candidate.structureUrl);
      const fileName =
        ext === ".pdb"
          ? `boltz-${candidate.id}.pdb`
          : ext === ".cif" || ext === ".mmcif"
            ? `boltz-${candidate.id}.cif`
            : `boltz-${candidate.id}${ext ?? ".cif"}`;
      setProteinSelection({
        source: "file",
        id: `boltz-${candidate.id}`,
        label: `Boltz-2 · ${candidate.label}`,
        remoteStructureUrl: candidate.structureUrl,
        fileName,
      });
    }

    return undefined;
  }, [lastBoltzResult, setProteinSelection]);

  return null;
}
