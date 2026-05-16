import type { ProteinSelection } from "@/lib/proteinApis";

export interface ResolvedStructure {
  url: string;
  format: "mmcif" | "pdb";
  provenance: string;
}

const AF_ORIGIN = "https://alphafold.ebi.ac.uk";

/** Map absolute AlphaFold DB URLs to same-origin proxy paths. */
export function alphafoldUrlToProxy(absoluteUrl: string): string {
  if (absoluteUrl.startsWith(AF_ORIGIN)) {
    return `/api/alphafold/${absoluteUrl.slice(AF_ORIGIN.length + 1)}`;
  }
  return absoluteUrl;
}

async function fetchAlphaFoldResolved(accession: string): Promise<ResolvedStructure> {
  const acc = accession.trim();
  const res = await fetch(`/api/alphafold/api/prediction/${encodeURIComponent(acc)}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `AlphaFold API failed (${res.status})`);
  }

  const data: unknown = await res.json();
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Invalid AlphaFold API response");
  }

  const rec = row as Record<string, unknown>;
  const cifUrl = rec.cifUrl ?? rec.cif_url;
  if (typeof cifUrl !== "string") {
    throw new Error("AlphaFold response missing cifUrl");
  }

  const entityId = rec.modelEntityId ?? rec.entryId ?? rec.uniprotAccession ?? acc;
  return {
    url: alphafoldUrlToProxy(cifUrl),
    format: "mmcif",
    provenance: `AlphaFold (${String(entityId)})`,
  };
}

/**
 * Resolve a structure file URL for NGL from workspace selection.
 * - RCSB: mmCIF by PDB ID.
 * - UniProt: PDB if cross-refs exist and policy allows; otherwise AlphaFold DB (latest cifUrl from API).
 */
export async function resolveStructure(selection: ProteinSelection): Promise<ResolvedStructure> {
  if (selection.source === "file") {
    const url = selection.structureObjectUrl ?? selection.remoteStructureUrl;
    if (!url) throw new Error("Structure URL missing (local blob or remote mmCIF)");
    const name = selection.fileName?.toLowerCase() ?? "";
    const format: "mmcif" | "pdb" = name.endsWith(".pdb") || name.endsWith(".ent") ? "pdb" : "mmcif";
    const provenance = selection.fileName ? `File · ${selection.fileName}` : "Remote / blob structure";
    return {
      url,
      format,
      provenance,
    };
  }

  if (selection.source === "rcsb") {
    const id = selection.id.trim().toUpperCase();
    if (!id) throw new Error("Missing PDB id");
    return {
      url: `/api/rcsb-files/download/${id}.cif`,
      format: "mmcif",
      provenance: `RCSB ${id}`,
    };
  }

  if (selection.source !== "uniprot") {
    throw new Error("Unknown selection source");
  }

  const acc = selection.id.trim();
  if (!acc) throw new Error("Missing UniProt accession");

  const pref = selection.preferredStructure;

  if (pref === "alphafold") {
    return fetchAlphaFoldResolved(acc);
  }

  if (pref === "experimental") {
    const pdbId = selection.pdbIds?.[0]?.toUpperCase();
    if (!pdbId) {
      throw new Error("No PDB cross-reference for this UniProt entry");
    }
    return {
      url: `/api/rcsb-files/download/${pdbId}.cif`,
      format: "mmcif",
      provenance: `PDB ${pdbId} (UniProt ${acc})`,
    };
  }

  // Auto: prefer experimental PDB when present
  if (selection.pdbIds?.length) {
    const pdbId = selection.pdbIds[0].toUpperCase();
    return {
      url: `/api/rcsb-files/download/${pdbId}.cif`,
      format: "mmcif",
      provenance: `PDB ${pdbId} (UniProt ${acc})`,
    };
  }

  return fetchAlphaFoldResolved(acc);
}
