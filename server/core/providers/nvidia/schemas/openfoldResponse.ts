/**
 * OpenFold3 predict response — `outputs[].structures_with_scores[].structure` (mmCIF text).
 * Breaking changes: OpenFold OpenAPI on Healthcare APIs catalog.
 */

import { z } from "zod";

const structureScoreRowSchema = z
  .object({
    structure: z.string().optional(),
    complex_plddt_score: z.number().optional(),
    confidence_score: z.number().optional(),
  })
  .passthrough();

const outputItemSchema = z
  .object({
    structures_with_scores: z.array(structureScoreRowSchema).optional(),
  })
  .passthrough();

export const openfoldVendorBodySchema = z
  .object({
    outputs: z.array(outputItemSchema).optional(),
    output: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type OpenfoldVendorBody = z.infer<typeof openfoldVendorBodySchema>;

export function firstStructureCifFromOpenfold(raw: Record<string, unknown>): string | undefined {
  const p = openfoldVendorBodySchema.safeParse(raw);
  const outputs = p.success ? p.data.outputs : raw.outputs;
  if (!Array.isArray(outputs)) return undefined;
  for (const item of outputs) {
    if (!item || typeof item !== "object") continue;
    const sws = (item as Record<string, unknown>).structures_with_scores;
    if (!Array.isArray(sws)) continue;
    const first = sws[0];
    if (!first || typeof first !== "object") continue;
    const st = (first as Record<string, unknown>).structure;
    if (typeof st === "string" && st.length > 50) {
      if (st.includes("_atom_site") || st.startsWith("data_") || st.includes("MMCIF")) return st;
    }
  }
  return undefined;
}

export function openfoldPlddtHint(raw: Record<string, unknown>): string | undefined {
  const p = openfoldVendorBodySchema.safeParse(raw);
  const outputs = p.success ? p.data.outputs : raw.outputs;
  const out0 = Array.isArray(outputs) && outputs[0] && typeof outputs[0] === "object" ? outputs[0] : null;
  if (!out0) return undefined;
  const sws = (out0 as Record<string, unknown>).structures_with_scores;
  const s0 = Array.isArray(sws) && sws[0] && typeof sws[0] === "object" ? (sws[0] as Record<string, unknown>) : null;
  if (!s0) return undefined;
  const c = s0.complex_plddt_score ?? s0.confidence_score;
  if (typeof c === "number") return `complex pLDDT ${c.toFixed(2)}`;
  return undefined;
}
