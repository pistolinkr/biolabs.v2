/** Single parsed sequence row from FASTA / A3M. */
export interface MsaSequenceRow {
  id: string;
  /** Raw sequence as stored in file (may include a3m lowercase inserts). */
  raw: string;
  /** Match-state columns only (a3m lowercase inserts stripped). */
  matchStates: string;
}

export interface ParsedMsaAlignment {
  rows: MsaSequenceRow[];
  /** Width in match-state columns (after stripping lowercase inserts). */
  width: number;
  /** 0-based index of row treated as query (first by default). */
  queryIndex: number;
}

/** Per match-state column: Shannon entropy (bits), gap fraction, simple diversity. */
export interface MsaColumnStats {
  entropy: number;
  gapFraction: number;
  /** exp(entropy) — rough “effective number of states” at site. */
  neffLike: number;
  consensus: string;
}

export interface MsaAnalysis {
  alignment: ParsedMsaAlignment;
  columns: MsaColumnStats[];
  /** Mean entropy over non-all-gap columns. */
  meanEntropy: number;
  /** Truncation / caps applied during parse. */
  truncated: { maxRows: number; maxCols: number; rowCapHit: boolean; colCapHit: boolean };
}
