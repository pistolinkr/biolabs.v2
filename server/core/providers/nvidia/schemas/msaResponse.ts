/**
 * ColabFold MSA Search — minimal vendor success shapes (expand as OpenAPI evolves).
 * Breaking changes: verify against https://docs.api.nvidia.com/nim/reference/healthcare-apis → msa-search OpenAPI.
 */

import { z } from "zod";

/** Record of DB → format → { alignment, format }. */
const alignmentLeafSchema = z
  .object({
    alignment: z.string().optional(),
    format: z.string().optional(),
  })
  .passthrough();

const dbBlockSchema = z.record(z.string(), z.unknown());

export const msaVendorBodySchema = z
  .object({
    alignments: dbBlockSchema.optional(),
    alignments_by_chain: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    query_id: z.string().optional(),
    queryId: z.string().optional(),
  })
  .passthrough();

export type MsaVendorBody = z.infer<typeof msaVendorBodySchema>;

function walkFmtBlock(fmtBlock: unknown): string | undefined {
  if (!fmtBlock || typeof fmtBlock !== "object") return undefined;
  for (const fmtVal of Object.values(fmtBlock as Record<string, unknown>)) {
    const p = alignmentLeafSchema.safeParse(fmtVal);
    if (p.success && p.data.alignment?.length) return p.data.alignment;
  }
  return undefined;
}

function isColabfoldMergeKey(dbKey: string): boolean {
  return dbKey.toLowerCase() === "colabfold";
}

/**
 * Pick alignment text from one NIM database block (e.g. uniref30_2302 → a3m).
 * Prefers real database blocks over merged `colabfold` (NIM docs: avoid relying on colabfold only).
 */
export function pickAlignmentFromDatabaseMap(databases: Record<string, unknown>): string | undefined {
  const keys = Object.keys(databases).sort();
  for (const k of keys) {
    if (isColabfoldMergeKey(k)) continue;
    const dbVal = databases[k];
    if (!dbVal || typeof dbVal !== "object") continue;
    const found = walkFmtBlock(dbVal);
    if (found) return found;
  }
  for (const k of keys) {
    if (!isColabfoldMergeKey(k)) continue;
    const dbVal = databases[k];
    if (!dbVal || typeof dbVal !== "object") continue;
    const found = walkFmtBlock(dbVal);
    if (found) return found;
  }
  return undefined;
}

/** Walk NIM `alignments` / `alignments_by_chain` trees for best monomer-style alignment string. */
export function findAlignmentInVendorTree(raw: Record<string, unknown>): string | undefined {
  const parsed = msaVendorBodySchema.safeParse(raw);
  const root = parsed.success ? parsed.data : raw;

  const alignments = (root as MsaVendorBody).alignments;
  if (alignments && typeof alignments === "object") {
    const picked = pickAlignmentFromDatabaseMap(alignments as Record<string, unknown>);
    if (picked) return picked;
  }

  const byChain = (root as MsaVendorBody).alignments_by_chain;
  if (byChain && typeof byChain === "object") {
    const chainKeys = Object.keys(byChain).sort();
    for (const ck of chainKeys) {
      const chainVal = byChain[ck];
      if (!chainVal || typeof chainVal !== "object") continue;
      const picked = pickAlignmentFromDatabaseMap(chainVal as Record<string, unknown>);
      if (picked) return picked;
    }
  }
  return undefined;
}

/** Paired MSA: one A3M string per chain id (same DB preference as monomer, per chain). */
export function extractAlignmentsByChainFromVendorTree(raw: Record<string, unknown>): Record<string, string> | undefined {
  const parsed = msaVendorBodySchema.safeParse(raw);
  const root = parsed.success ? parsed.data : raw;
  const byChain = (root as MsaVendorBody).alignments_by_chain;
  if (!byChain || typeof byChain !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const chainId of Object.keys(byChain).sort()) {
    const chainVal = byChain[chainId];
    if (!chainVal || typeof chainVal !== "object") continue;
    const picked = pickAlignmentFromDatabaseMap(chainVal as Record<string, unknown>);
    if (picked) out[chainId] = picked;
  }
  return Object.keys(out).length ? out : undefined;
}
