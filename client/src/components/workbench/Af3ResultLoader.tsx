import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getAlphafold3Payload } from "@/lib/biolabsJobResult";

/**
 * When an `alphafold3` job completes with mmCIF in the normalized result, load it into the viewer.
 */
export default function Af3ResultLoader() {
  const { lastAlphafold3Result, lastAlphafold3JobId } = useAiJobs();
  const { setProteinSelection } = useViewer();
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastAlphafold3Result) return undefined;
    const payload = getAlphafold3Payload(lastAlphafold3Result);
    if (!payload) return undefined;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const labelTail = payload.plddtSummary ? ` · ${payload.plddtSummary}` : "";

    if (payload.mmcifText) {
      const blob = new Blob([payload.mmcifText], { type: "chemical/x-mmcif" });
      const u = URL.createObjectURL(blob);
      blobUrlRef.current = u;
      setProteinSelection({
        source: "file",
        id: "af3-inference",
        label: `OpenFold3 / AF3 inference${labelTail}`,
        structureObjectUrl: u,
        fileName: "af3-model.cif",
      });
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }

    if (payload.mmcifBase64) {
      try {
        const bin = atob(payload.mmcifBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: "chemical/x-mmcif" });
        const u = URL.createObjectURL(blob);
        blobUrlRef.current = u;
        setProteinSelection({
          source: "file",
          id: "af3-inference",
          label: `OpenFold3 / AF3 inference${labelTail}`,
          structureObjectUrl: u,
          fileName: "af3-model.cif",
        });
      } catch {
        toast.error("Could not decode AF3 mmCIF payload", {
          description: lastAlphafold3JobId ? `Job ${lastAlphafold3JobId.slice(0, 12)}…` : undefined,
        });
      }
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }

    if (payload.mmcifUrl) {
      setProteinSelection({
        source: "file",
        id: "af3-inference",
        label: `AlphaFold3 inference${labelTail}`,
        remoteStructureUrl: payload.mmcifUrl,
        fileName: "af3-model.cif",
      });
    }

    return undefined;
  }, [lastAlphafold3Result, lastAlphafold3JobId, setProteinSelection]);

  return null;
}
