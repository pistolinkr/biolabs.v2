/**
 * Read normalized MSA alignment text from a completed job result envelope.
 */

function msaBiolabsBlock(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const b = r.biolabs;
  if (!b || typeof b !== "object") return null;
  const blk = b as Record<string, unknown>;
  const svc = blk.service;
  if (svc !== "msa_search" && svc !== "msa_search_paired") return null;
  return blk;
}

export function extractMsaAlignmentFromResult(result: unknown): string | null {
  const blk = msaBiolabsBlock(result);
  if (!blk) return null;
  const t = blk.alignmentText;
  return typeof t === "string" && t.length > 0 ? t : null;
}

/** Per-chain A3M/FASTA from paired (or rich monomer) normalization. */
export function extractMsaAlignmentsByChainFromResult(result: unknown): Record<string, string> | null {
  const blk = msaBiolabsBlock(result);
  if (!blk) return null;
  const raw = blk.alignmentsByChain;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}
