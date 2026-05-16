export type ProteinSearchSource = "rcsb" | "uniprot";

export interface ProteinSearchHit {
  source: ProteinSearchSource;
  id: string;
  title: string;
  subtitle?: string;
  /** PDB IDs from UniProt cross-references (subset shown in search fields). */
  pdbIds?: string[];
}

/** User-selected entry passed to the workspace / viewer. */
export interface ProteinSelection {
  source: ProteinSearchSource | "file";
  id: string;
  label: string;
  pdbIds?: string[];
  /** UniProt: force experimental PDB vs AlphaFold prediction (auto when omitted). */
  preferredStructure?: "experimental" | "alphafold";
  /** Local PDB/mmCIF: object URL for NGL (revoked when selection changes). */
  structureObjectUrl?: string;
  /** Remote mmCIF URL (e.g. signed inference artifact). May fail in the browser if CORS blocks NGL. */
  remoteStructureUrl?: string;
  fileName?: string;
}

const UNIPROT_PREFIX = "/api/uniprot";
const RCSB_SEARCH_PREFIX = "/api/rcsb-search";

const DEFAULT_PAGE_SIZE = 20;

function uniprotUrl(pathWithQuery: string): string {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${UNIPROT_PREFIX}${path}`;
}

function rcsbSearchUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${RCSB_SEARCH_PREFIX}${p}`;
}

function getProteinName(entry: Record<string, unknown>): string {
  const desc = entry.proteinDescription as Record<string, unknown> | undefined;
  const rec = desc?.recommendedName as Record<string, unknown> | undefined;
  const full = rec?.fullName as Record<string, unknown> | undefined;
  const v = full?.value;
  return typeof v === "string" ? v : String(entry.uniProtkbId ?? entry.primaryAccession ?? "");
}

function getOrganismName(entry: Record<string, unknown>): string | undefined {
  const org = entry.organism as Record<string, unknown> | undefined;
  const name = org?.scientificName;
  return typeof name === "string" ? name : undefined;
}

function getPdbIds(entry: Record<string, unknown>): string[] {
  const refs = entry.uniProtKBCrossReferences;
  if (!Array.isArray(refs)) return [];
  const ids: string[] = [];
  for (const r of refs) {
    if (!r || typeof r !== "object") continue;
    const ref = r as Record<string, unknown>;
    if (ref.database === "PDB" && typeof ref.id === "string") {
      ids.push(ref.id);
    }
  }
  return ids.slice(0, 8);
}

export async function searchUniProt(query: string): Promise<ProteinSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    query: q,
    format: "json",
    size: String(DEFAULT_PAGE_SIZE),
    fields: "accession,protein_name,organism_name,xref_pdb",
  });

  const url = uniprotUrl(`/uniprotkb/search?${params.toString()}`);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `UniProt search failed (${res.status})`);
  }

  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = data.results ?? [];

  return results.map((entry) => {
    const accession = String(entry.primaryAccession ?? "");
    const pdbIds = getPdbIds(entry);
    return {
      source: "uniprot",
      id: accession,
      title: accession ? `${accession} — ${getProteinName(entry)}` : getProteinName(entry),
      subtitle: getOrganismName(entry),
      pdbIds: pdbIds.length ? pdbIds : undefined,
    };
  });
}

interface RcsbQueryResponse {
  total_count?: number;
  result_set?: { identifier?: string; score?: number }[];
  status?: number;
  message?: string;
}

export async function searchRcsb(query: string): Promise<ProteinSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const searchValue = /^[0-9][A-Za-z0-9]{3}$/.test(q) ? q.toUpperCase() : q;

  const body = {
    query: {
      type: "terminal",
      service: "full_text",
      parameters: { value: searchValue },
    },
    return_type: "entry",
    request_options: {
      paginate: { start: 0, rows: DEFAULT_PAGE_SIZE },
      sort: [{ sort_by: "score", direction: "desc" }],
    },
  };

  const res = await fetch(rcsbSearchUrl("/rcsbsearch/v2/query"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 204) return [];

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `RCSB search failed (${res.status})`);
  }

  let data: RcsbQueryResponse;
  try {
    data = JSON.parse(text) as RcsbQueryResponse;
  } catch {
    throw new Error("RCSB search returned invalid JSON");
  }

  if (data.status && data.status >= 400) {
    throw new Error(data.message ?? "RCSB search error");
  }

  const set = data.result_set ?? [];
  return set
    .filter((row) => row.identifier)
    .map((row) => ({
      source: "rcsb" as const,
      id: String(row.identifier),
      title: String(row.identifier),
      subtitle:
        typeof row.score === "number" ? `score ${row.score.toFixed(4)}` : undefined,
    }));
}

export function proteinSelectionKey(s: ProteinSelection): string {
  return `${s.source}:${s.id}:${s.structureObjectUrl ?? ""}:${s.remoteStructureUrl ?? ""}:${s.fileName ?? ""}`;
}

export function proteinHitToSelection(
  hit: ProteinSearchHit,
  options?: { preferredStructure?: "experimental" | "alphafold" },
): ProteinSelection {
  return {
    source: hit.source,
    id: hit.id,
    label: hit.title,
    pdbIds: hit.pdbIds,
    ...(options?.preferredStructure ? { preferredStructure: options.preferredStructure } : {}),
  };
}
