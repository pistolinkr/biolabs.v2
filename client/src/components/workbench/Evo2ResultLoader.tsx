import React, { useEffect } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";
import { useViewer } from "@/contexts/ViewerContext";
import { getEvo2Sections } from "@/lib/biolabsJobResult";

/**
 * When an Evo2 job completes, focus the first section that carries a `residueRef` (chain:resno), matching {@link SequenceStrip}.
 */
export default function Evo2ResultLoader() {
  const { lastEvo2Result } = useAiJobs();
  const { setSelectedResidueKey } = useViewer();

  useEffect(() => {
    if (!lastEvo2Result) return;
    const sections = getEvo2Sections(lastEvo2Result);
    const ref = sections.find((s) => s.residueRef?.trim())?.residueRef?.trim();
    if (!ref) return;
    setSelectedResidueKey(ref);
  }, [lastEvo2Result, setSelectedResidueKey]);

  return null;
}
