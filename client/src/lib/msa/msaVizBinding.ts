import type { MsaAnalysis } from "@/lib/msa/types";

/** Per-chain MSA stats mapped onto structure residues (NGL atom keys `chainname:resno`). */
export interface ChainMsaVizSlice {
  analysis: MsaAnalysis;
  residueKeyToColumn: Record<string, number>;
  entropyMin: number;
  entropyMax: number;
  identityFraction: number;
  exactQueryMatch: boolean;
}

/** MSA column stats mapped onto loaded structure(s) for custom NGL colormakers. */
export interface MsaVizBinding {
  chains: Record<string, ChainMsaVizSlice>;
}

export function msaVizHasResidueMaps(b: MsaVizBinding | null | undefined): boolean {
  if (!b) return false;
  return Object.values(b.chains).some((s) => Object.keys(s.residueKeyToColumn).length > 0);
}
