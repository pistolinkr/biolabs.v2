import type { MsaSequenceRow, ParsedMsaAlignment } from "./types";

/** HH-suite / ColabFold style: lowercase letters are inserts (not match-state columns). */
export function stripA3mInserts(seq: string): string {
  let out = "";
  for (const ch of seq) {
    if (ch >= "a" && ch <= "z") continue;
    out += ch;
  }
  return out;
}

function normalizeHeader(line: string): string {
  const h = line.slice(1).trim();
  const space = h.indexOf(" ");
  return space === -1 ? h : h.slice(0, space);
}

export interface ParseMsaOptions {
  maxRows?: number;
  maxCols?: number;
  /** 0-based row index to treat as query; columns derived from row widths after strip. */
  queryRowIndex?: number;
}

const DEFAULT_MAX_ROWS = 512;
const DEFAULT_MAX_COLS = 4096;

/**
 * Parse FASTA / A3M text into match-state alignment.
 * Assumes records are interleaved classic FASTA: `>id` then one or more sequence lines.
 */
export interface ParsedMsaBundle {
  alignment: ParsedMsaAlignment;
  rowCapHit: boolean;
  colCapHit: boolean;
  maxRowsLimit: number;
  maxColsLimit: number;
}

export function parseFastaA3m(text: string, options: ParseMsaOptions = {}): ParsedMsaBundle {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const maxCols = options.maxCols ?? DEFAULT_MAX_COLS;
  const queryRowIndex = options.queryRowIndex ?? 0;

  const lines = text.split(/\r?\n/);
  const rows: MsaSequenceRow[] = [];
  let curId: string | null = null;
  let curSeq = "";

  const flush = () => {
    if (curId == null) return;
    const raw = curSeq.replace(/\s+/g, "");
    const matchStates = stripA3mInserts(raw).toUpperCase();
    rows.push({ id: curId, raw, matchStates });
    curId = null;
    curSeq = "";
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith(">")) {
      flush();
      curId = normalizeHeader(t);
      curSeq = "";
    } else if (curId != null) {
      curSeq += t;
    }
  }
  flush();

  const rowCapHit = rows.length > maxRows;
  let capped = rows.slice(0, maxRows);

  let width = 0;
  for (const r of capped) {
    width = Math.max(width, r.matchStates.length);
  }
  const colCapHit = width > maxCols;
  if (colCapHit) {
    width = maxCols;
    capped = capped.map((r) => ({
      ...r,
      matchStates:
        r.matchStates.length > maxCols ? r.matchStates.slice(0, maxCols) : r.matchStates,
    }));
  }

  const padRow = (s: string) => s.padEnd(width, "-").slice(0, width);

  capped = capped.map((r) => ({
    ...r,
    matchStates: padRow(r.matchStates.length < width ? r.matchStates : r.matchStates.slice(0, width)),
  }));

  const queryIndex = Math.min(Math.max(0, queryRowIndex), Math.max(0, capped.length - 1));

  return {
    alignment: { rows: capped, width, queryIndex },
    rowCapHit,
    colCapHit,
    maxRowsLimit: maxRows,
    maxColsLimit: maxCols,
  };
}
