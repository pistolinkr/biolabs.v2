/** Map structure residue keys `chain:resno` to MSA column indices for viewer coloring. */

export interface StructureMsaMapResult {
  /** residueKey -> MSA column index (0-based, match-state columns). */
  residueKeyToColumn: Record<string, number>;
  /** Fraction of aligned pairs that are identity matches (0–1). */
  identityFraction: number;
  /** True when structure sequence equals query without gaps (after strip). */
  exactQueryMatch: boolean;
}

const GAP = new Set(["-", ".", "~"]);

function queryNonGapColumns(queryRow: string): { columns: number[]; letters: string } {
  const columns: number[] = [];
  let letters = "";
  for (let j = 0; j < queryRow.length; j++) {
    const q = (queryRow[j] ?? "-").toUpperCase();
    if (GAP.has(q)) continue;
    columns.push(j);
    letters += q;
  }
  return { columns, letters };
}

/** Global alignment (Needleman-Wunsch) — match +2, mismatch -1, gap -2. Returns aligned pairs of (iStruct|-1, iQuery|-1). */
function needlemanWunsch(a: string, b: string): Array<{ i: number; j: number }> {
  const n = a.length;
  const m = b.length;
  const match = 2;
  const mis = -1;
  const gp = -2;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const bt: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0)); // 0 diag, 1 up, 2 left

  for (let i = 1; i <= n; i++) {
    dp[i]![0] = i * gp;
    bt[i]![0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    dp[0]![j] = j * gp;
    bt[0]![j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = a[i - 1] === b[j - 1] ? match : mis;
      const diag = dp[i - 1]![j - 1]! + s;
      const up = dp[i - 1]![j]! + gp;
      const left = dp[i]![j - 1]! + gp;
      const best = Math.max(diag, up, left);
      dp[i]![j] = best;
      if (best === diag) bt[i]![j] = 0;
      else if (best === up) bt[i]![j] = 1;
      else bt[i]![j] = 2;
    }
  }

  const pairs: Array<{ i: number; j: number }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bt[i]![j] === 0) {
      pairs.push({ i: i - 1, j: j - 1 });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || bt[i]![j] === 1)) {
      pairs.push({ i: i - 1, j: -1 });
      i--;
    } else if (j > 0) {
      pairs.push({ i: -1, j: j - 1 });
      j--;
    } else break;
  }
  pairs.reverse();
  return pairs;
}

export function scoreSeqIdentity(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const pairs = needlemanWunsch(a, b);
  let matches = 0;
  let aligned = 0;
  for (const p of pairs) {
    if (p.i >= 0 && p.j >= 0) {
      aligned++;
      if (a[p.i] === b[p.j]) matches++;
    }
  }
  return aligned ? matches / aligned : 0;
}

/**
 * @param chainId NGL chain id (e.g. "A")
 * @param structureSequence 1-letter sequence from structure (standard order, 1..N residues)
 * @param queryMatchStates query row from parsed MSA (match-state string, may include gaps)
 */
export function buildResidueToMsaColumnMap(
  chainId: string,
  structureSequence: string,
  queryMatchStates: string,
): StructureMsaMapResult {
  const struct = structureSequence.toUpperCase().replace(/[^A-Z]/g, "");
  const { columns: colIdx, letters: queryNoGaps } = queryNonGapColumns(queryMatchStates);

  const residueKeyToColumn: Record<string, number> = {};
  let identityFraction = 1;
  let exactQueryMatch = struct === queryNoGaps;

  if (exactQueryMatch) {
    const n = Math.min(struct.length, colIdx.length);
    for (let i = 0; i < n; i++) {
      residueKeyToColumn[`${chainId}:${i + 1}`] = colIdx[i]!;
    }
    return { residueKeyToColumn, identityFraction: 1, exactQueryMatch: true };
  }

  const pairs = needlemanWunsch(struct, queryNoGaps);
  let match = 0;
  let aligned = 0;
  for (const p of pairs) {
    if (p.i >= 0 && p.j >= 0) {
      aligned++;
      if (struct[p.i] === queryNoGaps[p.j]) match++;
      const col = colIdx[p.j];
      if (col !== undefined) {
        residueKeyToColumn[`${chainId}:${p.i + 1}`] = col;
      }
    }
  }
  identityFraction = aligned ? match / aligned : 0;

  return { residueKeyToColumn, identityFraction, exactQueryMatch: false };
}
