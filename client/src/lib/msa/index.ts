import { analyzeMsaAlignment } from "./metrics";
import type { MsaAnalysis } from "./types";
import { parseFastaA3m } from "./parse";

/** Parse FASTA/A3M text and compute column statistics (entropy, gaps, consensus). */
export function analyzeMsaText(text: string, options?: import("./parse").ParseMsaOptions): MsaAnalysis {
  const bundle = parseFastaA3m(text, options);
  return analyzeMsaAlignment(bundle.alignment, {
    maxRows: bundle.alignment.rows.length,
    maxCols: bundle.alignment.width,
    rowCapHit: bundle.rowCapHit,
    colCapHit: bundle.colCapHit,
  });
}

export { parseFastaA3m, stripA3mInserts } from "./parse";
export type { ParseMsaOptions, ParsedMsaBundle } from "./parse";
export { analyzeMsaAlignment } from "./metrics";
export { buildResidueToMsaColumnMap, scoreSeqIdentity } from "./mapStructure";
export type { StructureMsaMapResult } from "./mapStructure";
export type * from "./types";
