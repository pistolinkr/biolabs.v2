import React, { useEffect, useRef } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { pickBestGenerativeStructureCandidate } from "@/lib/biolabsJobResult";
import { extFromUrlPath, guessChemBlobTypeFromText } from "@/lib/chemStructureBlob";

/**
 * When a GenMol job completes with structure text or URL on the best-ranked candidate, load it into the viewer.
 */
export default function GenmolResultLoader() {
  const { lastGenmolResult } = useAiJobs();
  const { setProteinSelection } = useViewer();
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastGenmolResult) return undefined;
    const candidate = pickBestGenerativeStructureCandidate(lastGenmolResult, "genmol");
    if (!candidate) return undefined;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (candidate.structureText) {
      const { mime, ext } = guessChemBlobTypeFromText(candidate.structureText);
      const blob = new Blob([candidate.structureText], { type: mime });
      const u = URL.createObjectURL(blob);
      blobUrlRef.current = u;
      setProteinSelection({
        source: "file",
        id: `genmol-${candidate.id}`,
        label: `GenMol · ${candidate.label}`,
        structureObjectUrl: u,
        fileName: `genmol-${candidate.id}${ext}`,
      });
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }

    if (candidate.structureUrl) {
      const urlExt = extFromUrlPath(candidate.structureUrl);
      const fileName = urlExt ? `genmol-${candidate.id}${urlExt}` : `genmol-${candidate.id}.sdf`;
      setProteinSelection({
        source: "file",
        id: `genmol-${candidate.id}`,
        label: `GenMol · ${candidate.label}`,
        remoteStructureUrl: candidate.structureUrl,
        fileName,
      });
    }

    return undefined;
  }, [lastGenmolResult, setProteinSelection]);

  return null;
}
