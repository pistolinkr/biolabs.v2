import type { MsaAnalysis, MsaColumnStats, ParsedMsaAlignment } from "./types";

const AA = new Set("ACDEFGHIKLMNPQRSTVWY".split(""));

function isGap(ch: string): boolean {
  return ch === "-" || ch === "." || ch === "~";
}

/** Shannon entropy in bits over observed symbols (including gap as state). */
function columnEntropyAndConsensus(chars: string[]): Omit<MsaColumnStats, "gapFraction" | "neffLike"> {
  const counts = new Map<string, number>();
  for (const c of chars) {
    const u = c.toUpperCase();
    const key = isGap(u) ? "-" : AA.has(u) ? u : "X";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const n = chars.length;
  let h = 0;
  let best = "-";
  let bestC = 0;
  for (const [sym, k] of Array.from(counts.entries())) {
    const p = k / n;
    h -= p * Math.log2(p);
    if (k > bestC) {
      bestC = k;
      best = sym;
    }
  }
  return { entropy: h, consensus: best };
}

export function analyzeMsaAlignment(
  alignment: ParsedMsaAlignment,
  truncated?: MsaAnalysis["truncated"],
): MsaAnalysis {
  const { rows, width } = alignment;
  const columns: MsaColumnStats[] = [];
  let entropySum = 0;
  let counted = 0;

  for (let col = 0; col < width; col++) {
    const chars = rows.map((r) => r.matchStates[col] ?? "-");
    const gaps = chars.filter((c) => isGap(c.toUpperCase())).length;
    const gapFraction = chars.length ? gaps / chars.length : 1;
    const { entropy, consensus } = columnEntropyAndConsensus(chars);
    const neffLike = 2 ** Math.min(entropy, 4.6);
    columns.push({ entropy, gapFraction, neffLike, consensus });
    if (gapFraction < 1) {
      entropySum += entropy;
      counted += 1;
    }
  }

  const meanEntropy = counted > 0 ? entropySum / counted : 0;

  return {
    alignment,
    columns,
    meanEntropy,
    truncated: truncated ?? {
      maxRows: rows.length,
      maxCols: width,
      rowCapHit: false,
      colCapHit: false,
    },
  };
}
