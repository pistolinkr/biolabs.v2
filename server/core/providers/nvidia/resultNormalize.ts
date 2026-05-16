import { z } from "zod";
import type { JobService } from "../../types/jobSchemas.js";
import { extractAlignmentsByChainFromVendorTree, findAlignmentInVendorTree } from "./schemas/msaResponse.js";
import { firstStructureCifFromOpenfold, openfoldPlddtHint } from "./schemas/openfoldResponse.js";
import { evo2SectionsFromVendor } from "./schemas/evo2Response.js";
import { boltzStructureList, genmolMoleculeList } from "./schemas/boltzGenmolResponse.js";

/** Versioned envelope stored on `job.result` alongside optional `raw`. */
export const biolabsResultEnvelopeSchema = z.object({
  version: z.literal(1),
  service: z.enum([
    "alphafold3",
    "msa_search",
    "msa_search_paired",
    "evo2_40b",
    "boltz2",
    "genmol",
    "local_echo",
  ]),
  /** Dry-run stub marker (orchestrator only). */
  stub: z.boolean().optional(),
  /** When true, client may suggest enabling contact / neighbor overlays. */
  suggestContacts: z.boolean().optional(),
});

export type BiolabsResultEnvelope = z.infer<typeof biolabsResultEnvelopeSchema>;

export const biolabsMsaSchema = biolabsResultEnvelopeSchema.extend({
  service: z.enum(["msa_search", "msa_search_paired"]),
  alignmentText: z.string().optional(),
  alignmentFormat: z.enum(["fasta", "a3m", "stockholm", "unknown"]).optional(),
  queryId: z.string().optional(),
  /** Paired MSA or rich responses: A3M text per structural chain id. */
  alignmentsByChain: z.record(z.string(), z.string()).optional(),
});

export type BiolabsMsaResult = z.infer<typeof biolabsMsaSchema>;

export const biolabsAlphafoldSchema = biolabsResultEnvelopeSchema.extend({
  service: z.literal("alphafold3"),
  mmcifUrl: z.string().min(1).optional(),
  mmcifBase64: z.string().optional(),
  /** Raw mmCIF from OpenFold3-style `structure` field. */
  mmcifText: z.string().optional(),
  plddtSummary: z.string().optional(),
});

export type BiolabsAlphafoldResult = z.infer<typeof biolabsAlphafoldSchema>;

const evoSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
  residueRef: z.string().optional(),
});

export const biolabsEvo2Schema = biolabsResultEnvelopeSchema.extend({
  service: z.literal("evo2_40b"),
  sections: z.array(evoSectionSchema).default([]),
  summary: z.string().optional(),
});

export type BiolabsEvo2Result = z.infer<typeof biolabsEvo2Schema>;

const candidateSchema = z.object({
  id: z.string(),
  label: z.string(),
  rank: z.number().optional(),
  smiles: z.string().optional(),
  structureUrl: z.string().optional(),
  /** Inline mmCIF/PDB text (e.g. Boltz-2). */
  structureText: z.string().optional(),
  notes: z.string().optional(),
});

export const biolabsBoltzSchema = biolabsResultEnvelopeSchema.extend({
  service: z.literal("boltz2"),
  candidates: z.array(candidateSchema).default([]),
});

export type BiolabsBoltzResult = z.infer<typeof biolabsBoltzSchema>;

export const biolabsGenmolSchema = biolabsResultEnvelopeSchema.extend({
  service: z.literal("genmol"),
  candidates: z.array(candidateSchema).default([]),
});

export type BiolabsGenmolResult = z.infer<typeof biolabsGenmolSchema>;

export const biolabsLocalEchoSchema = biolabsResultEnvelopeSchema.extend({
  service: z.literal("local_echo"),
});

export type BiolabsLocalEchoResult = z.infer<typeof biolabsLocalEchoSchema>;

export type BiolabsNormalizedResult =
  | BiolabsMsaResult
  | BiolabsAlphafoldResult
  | BiolabsEvo2Result
  | BiolabsBoltzResult
  | BiolabsGenmolResult
  | BiolabsLocalEchoResult;

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length) return v;
  }
  return undefined;
}

/** Best-effort extract alignment text from vendor JSON. */
function extractAlignmentText(raw: Record<string, unknown>): string | undefined {
  const nim = findAlignmentInVendorTree(raw);
  if (nim) return nim;
  const direct = pickString(raw, ["alignment", "a3m", "msa", "fasta", "alignment_a3m"]);
  if (direct) return direct;
  const msa = raw.msa;
  if (typeof msa === "string") return msa;
  if (msa && typeof msa === "object") {
    const o = msa as Record<string, unknown>;
    const t = pickString(o, ["text", "content", "data", "a3m"]);
    if (t) return t;
  }
  const data = raw.data;
  if (data && typeof data === "object") return extractAlignmentText(data as Record<string, unknown>);
  return undefined;
}

function guessAlignmentFormat(text: string | undefined): BiolabsMsaResult["alignmentFormat"] | undefined {
  if (!text) return undefined;
  if (text.includes(">")) return "fasta";
  const low = text.slice(0, 200).toLowerCase();
  if (low.includes("stockholm") || low.includes("#=gf")) return "stockholm";
  if (low.includes("#") && text.includes("A3M")) return "a3m";
  return "unknown";
}

/** Extract nested mmcif URL / base64 / inline CIF from common vendor shapes. */
function extractAf3Structure(raw: Record<string, unknown>): { url?: string; b64?: string; cifText?: string } {
  const url =
    pickString(raw, [
      "mmcif_url",
      "mmcifUrl",
      "structure_url",
      "structureUrl",
      "cif_url",
      "cifUrl",
      "url",
    ]) ??
    (typeof raw.output === "object" && raw.output
      ? pickString(raw.output as Record<string, unknown>, ["mmcif_url", "mmcifUrl", "url"])
      : undefined);

  const b64 =
    pickString(raw, ["mmcif_base64", "mmcifBase64", "structure_base64", "cif_base64"]) ??
    (typeof raw.output === "object" && raw.output
      ? pickString(raw.output as Record<string, unknown>, ["mmcif_base64", "mmcifBase64"])
      : undefined);

  const cifText = firstStructureCifFromOpenfold(raw);

  return { url, b64, cifText };
}

export function extractCandidates(raw: Record<string, unknown>, service: "boltz2" | "genmol"): z.infer<typeof candidateSchema>[] {
  const out: z.infer<typeof candidateSchema>[] = [];
  const list = raw.candidates ?? raw.structures ?? raw.molecules ?? raw.results ?? raw.outputs;
  if (Array.isArray(list)) {
    list.forEach((item, i) => {
      if (!item || typeof item !== "object") return;
      const o = item as Record<string, unknown>;
      const id =
        typeof o.id === "string"
          ? o.id
          : typeof o.name === "string"
            ? o.name
            : service === "genmol"
              ? `gmol-${i}`
              : `c${i}`;
      const structureText = typeof o.structure === "string" && o.structure.length > 80 ? o.structure : undefined;
      const label =
        typeof o.label === "string"
          ? o.label
          : typeof o.name === "string"
            ? o.name
            : typeof o.smiles === "string"
              ? o.smiles.slice(0, 32)
              : id;
      out.push({
        id,
        label,
        rank: typeof o.rank === "number" ? o.rank : typeof o.score === "number" ? o.score : undefined,
        smiles: typeof o.smiles === "string" ? o.smiles : undefined,
        structureUrl: typeof o.structure_url === "string" ? o.structure_url : typeof o.structureUrl === "string" ? o.structureUrl : undefined,
        structureText,
        notes: typeof o.notes === "string" ? o.notes : undefined,
      });
    });
  }
  return out;
}

/**
 * Map arbitrary vendor JSON to a stable Biolabs envelope for the client.
 * Always returns a valid minimal envelope; never throws.
 */
export function normalizeJobResult(service: JobService, raw: unknown): { biolabs: BiolabsNormalizedResult; raw: unknown } {
  const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const suggestContacts =
    rawObj.suggest_contacts === true ||
    rawObj.biolabs_suggest_contacts === true ||
    rawObj.interface_residues != null;

  switch (service) {
    case "msa_search":
    case "msa_search_paired": {
      const alignmentsByChain = extractAlignmentsByChainFromVendorTree(rawObj);
      let alignmentText = extractAlignmentText(rawObj);
      if (!alignmentText && alignmentsByChain) {
        const first = Object.keys(alignmentsByChain)
          .sort()
          .map((k) => alignmentsByChain[k])
          .find((t) => typeof t === "string" && t.length);
        alignmentText = first;
      }
      const msa: BiolabsMsaResult = {
        version: 1,
        service,
        alignmentFormat: guessAlignmentFormat(alignmentText),
        alignmentText: alignmentText ?? undefined,
        queryId: pickString(rawObj, ["query_id", "queryId"]),
        suggestContacts:
          suggestContacts || (alignmentsByChain != null && Object.keys(alignmentsByChain).length > 1),
        alignmentsByChain:
          alignmentsByChain && Object.keys(alignmentsByChain).length ? alignmentsByChain : undefined,
      };
      return { biolabs: msa, raw };
    }
    case "alphafold3": {
      const { url, b64, cifText } = extractAf3Structure(rawObj);
      let plddtSummary = pickString(rawObj, ["plddt_summary", "avg_plddt", "confidence"]) ?? openfoldPlddtHint(rawObj);
      const af: BiolabsAlphafoldResult = {
        version: 1,
        service: "alphafold3",
        mmcifUrl: url,
        mmcifBase64: b64,
        mmcifText: cifText,
        plddtSummary,
        suggestContacts,
      };
      return { biolabs: af, raw };
    }
    case "evo2_40b": {
      const { sections, summary } = evo2SectionsFromVendor(rawObj);
      const ev: BiolabsEvo2Result = {
        version: 1,
        service: "evo2_40b",
        sections,
        summary,
        suggestContacts,
      };
      return { biolabs: ev, raw };
    }
    case "boltz2": {
      const list = boltzStructureList(rawObj);
      const shaped = list.length ? { ...rawObj, structures: list } : rawObj;
      const bo: BiolabsBoltzResult = {
        version: 1,
        service: "boltz2",
        candidates: extractCandidates(shaped, "boltz2"),
        suggestContacts,
      };
      return { biolabs: bo, raw };
    }
    case "genmol": {
      const list = genmolMoleculeList(rawObj);
      const shaped = list.length ? { ...rawObj, molecules: list } : rawObj;
      const ge: BiolabsGenmolResult = {
        version: 1,
        service: "genmol",
        candidates: extractCandidates(shaped, "genmol"),
        suggestContacts,
      };
      return { biolabs: ge, raw };
    }
    case "local_echo": {
      return {
        biolabs: { version: 1, service: "local_echo", suggestContacts },
        raw,
      };
    }
  }
}
