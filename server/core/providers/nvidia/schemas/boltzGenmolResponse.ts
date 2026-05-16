/**
 * Boltz-2 + GenMol — Zod wrappers and primary array resolution for candidate extraction.
 * Breaking changes: MIT Boltz2 + NVIDIA GenMol OpenAPI pages.
 */

import { z } from "zod";

const looseRow = z.record(z.string(), z.unknown());

export const boltzVendorBodySchema = z
  .object({
    structures: z.array(looseRow).optional(),
    candidates: z.array(looseRow).optional(),
    results: z.array(looseRow).optional(),
    outputs: z.array(looseRow).optional(),
  })
  .passthrough();

export const genmolVendorBodySchema = z
  .object({
    molecules: z.array(looseRow).optional(),
    candidates: z.array(looseRow).optional(),
    results: z.array(looseRow).optional(),
    outputs: z.array(looseRow).optional(),
  })
  .passthrough();

/** Prefer typed `structures[]` when Zod-parse succeeds; else legacy keys. */
export function boltzStructureList(raw: Record<string, unknown>): unknown[] {
  const p = boltzVendorBodySchema.safeParse(raw);
  if (p.success && p.data.structures?.length) return p.data.structures;
  const list = raw.structures ?? raw.candidates ?? raw.results ?? raw.outputs;
  return Array.isArray(list) ? list : [];
}

/** Prefer typed `molecules[]` when present. */
export function genmolMoleculeList(raw: Record<string, unknown>): unknown[] {
  const p = genmolVendorBodySchema.safeParse(raw);
  if (p.success && p.data.molecules?.length) return p.data.molecules;
  const list = raw.molecules ?? raw.candidates ?? raw.results ?? raw.outputs;
  return Array.isArray(list) ? list : [];
}
