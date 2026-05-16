/** Client helpers for server-normalized `job.result` shapes (`biolabs` envelope). */

export function getBiolabsBlock(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const b = r.biolabs;
  if (b && typeof b === "object") return b as Record<string, unknown>;
  return null;
}

export function biolabsService(result: unknown): string | undefined {
  const b = getBiolabsBlock(result);
  const s = b?.service;
  return typeof s === "string" ? s : undefined;
}

export function suggestContactsFromResult(result: unknown): boolean {
  const b = getBiolabsBlock(result);
  return b?.suggestContacts === true;
}

function isMsaBiolabsService(result: unknown): boolean {
  const s = getBiolabsBlock(result)?.service;
  return s === "msa_search" || s === "msa_search_paired";
}

export function isMsaSearchEnvelope(result: unknown): boolean {
  return isMsaBiolabsService(result);
}

export function getMsaAlignmentText(result: unknown): string | null {
  const b = getBiolabsBlock(result);
  if (!b) return null;
  const s = b.service;
  if (s !== "msa_search" && s !== "msa_search_paired") return null;
  const t = b.alignmentText;
  return typeof t === "string" && t.length > 0 ? t : null;
}

/** Per-chain A3M/FASTA from paired MSA normalization (or empty if monomer-only). */
export function getMsaAlignmentsByChain(result: unknown): Record<string, string> | null {
  const b = getBiolabsBlock(result);
  if (!b) return null;
  const s = b.service;
  if (s !== "msa_search" && s !== "msa_search_paired") return null;
  const raw = b.alignmentsByChain;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export interface Evo2SectionRow {
  title: string;
  body: string;
  residueRef?: string;
}

export function getEvo2Sections(result: unknown): Evo2SectionRow[] {
  const b = getBiolabsBlock(result);
  if (b?.service !== "evo2_40b") return [];
  const raw = b.sections;
  if (!Array.isArray(raw)) return [];
  const rows: Evo2SectionRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Section";
    const body =
      typeof o.body === "string" ? o.body : typeof o.text === "string" ? o.text : JSON.stringify(o);
    const residueRef = typeof o.residueRef === "string" ? o.residueRef : undefined;
    rows.push({ title, body, residueRef });
  }
  return rows;
}

export interface GenerativeCandidateRow {
  id: string;
  label: string;
  rank?: number;
  smiles?: string;
  structureUrl?: string;
  /** Inline mmCIF / PDB from Boltz-2 etc. */
  structureText?: string;
  notes?: string;
}

export function getGenerativeCandidates(result: unknown, service: "boltz2" | "genmol"): GenerativeCandidateRow[] {
  const b = getBiolabsBlock(result);
  if (b?.service !== service) return [];
  const raw = b.candidates;
  if (!Array.isArray(raw)) return [];
  const rows: GenerativeCandidateRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    rows.push({
      id: typeof o.id === "string" ? o.id : String(rows.length),
      label: typeof o.label === "string" ? o.label : "?",
      rank: typeof o.rank === "number" ? o.rank : undefined,
      smiles: typeof o.smiles === "string" ? o.smiles : undefined,
      structureUrl: typeof o.structureUrl === "string" ? o.structureUrl : undefined,
      structureText: typeof o.structureText === "string" ? o.structureText : undefined,
      notes: typeof o.notes === "string" ? o.notes : undefined,
    });
  }
  return rows;
}

/** Prefer ranked rows; first row with inline structure, else first with a structure URL. */
export function pickBestGenerativeStructureCandidate(
  result: unknown,
  service: "boltz2" | "genmol",
): GenerativeCandidateRow | null {
  const rows = getGenerativeCandidates(result, service);
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ar = a.rank ?? 10_000;
    const br = b.rank ?? 10_000;
    return ar - br;
  });
  return sorted.find((r) => r.structureText) ?? sorted.find((r) => r.structureUrl) ?? null;
}

export interface Alphafold3Biolabs {
  mmcifUrl?: string;
  mmcifBase64?: string;
  mmcifText?: string;
  plddtSummary?: string;
}

export function getAlphafold3Payload(result: unknown): Alphafold3Biolabs | null {
  const b = getBiolabsBlock(result);
  if (b?.service !== "alphafold3") return null;
  const mmcifUrl = typeof b.mmcifUrl === "string" ? b.mmcifUrl : undefined;
  const mmcifBase64 = typeof b.mmcifBase64 === "string" ? b.mmcifBase64 : undefined;
  const mmcifText = typeof b.mmcifText === "string" ? b.mmcifText : undefined;
  const plddtSummary = typeof b.plddtSummary === "string" ? b.plddtSummary : undefined;
  if (!mmcifUrl && !mmcifBase64 && !mmcifText) return null;
  return { mmcifUrl, mmcifBase64, mmcifText, plddtSummary };
}
