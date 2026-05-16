/**
 * Biomolecular entity taxonomy for workstation UI (OpenFold-style lanes).
 * Kinds are inferred heuristically from structure until mmCIF entity metadata is wired.
 */
export type BiomolecularEntityKind =
  | "protein"
  | "dna"
  | "rna"
  | "ligand"
  | "ion"
  | "membrane"
  | "solvent"
  | "complex";

const ORDER: BiomolecularEntityKind[] = [
  "complex",
  "protein",
  "dna",
  "rna",
  "ligand",
  "ion",
  "membrane",
  "solvent",
];

const LABELS: Record<BiomolecularEntityKind, string> = {
  protein: "Protein",
  dna: "DNA",
  rna: "RNA",
  ligand: "Ligand",
  ion: "Ion",
  membrane: "Membrane",
  solvent: "Solvent",
  complex: "Complex",
};

export function entityKindLabel(k: BiomolecularEntityKind): string {
  return LABELS[k];
}

export function entityKindSortKey(k: BiomolecularEntityKind): number {
  return ORDER.indexOf(k);
}

/** Group chains by inferred entity kind (stable sort within group by chain id). */
export function groupChainsByEntityKind<T extends { id: string; entityKind: BiomolecularEntityKind }>(
  chains: T[],
): Partial<Record<BiomolecularEntityKind, T[]>> {
  const out: Partial<Record<BiomolecularEntityKind, T[]>> = {};
  for (const c of chains) {
    const list = out[c.entityKind] ?? [];
    list.push(c);
    out[c.entityKind] = list;
  }
  for (const k of ORDER) {
    const arr = out[k];
    if (arr) arr.sort((a, b) => a.id.localeCompare(b.id));
  }
  return out;
}

const WATER_NAMES = new Set(["HOH", "WAT", "H2O", "DOD", "D2O", "TIP", "TIP3", "SPC", "OPC"]);

const DNA_ONE_LETTER = new Set(["A", "C", "G", "T"]);
const RNA_ONE_LETTER = new Set(["A", "C", "G", "U"]);

/** Common monatomic / simple ions in structural biology (PDB HET codes). */
const ION_CODES = new Set([
  "NA",
  "K",
  "CL",
  "CA",
  "MG",
  "ZN",
  "FE",
  "FE2",
  "MN",
  "CU",
  "CU1",
  "NI",
  "CO",
  "CD",
  "SR",
  "BA",
  "RB",
  "CS",
  "LI",
  "I",
  "BR",
  "F",
  "IOD",
  "CL",
  "CA2",
  "HG",
  "PB",
  "AG",
  "AU",
  "PT",
  "AL",
  "CR",
  "MO",
  "W",
  "V",
  "SE",
  "SO4",
  "PO4",
  "NO3",
  "NH4",
  "NH2",
  "ACE",
]);

/** Lipid-ish HET families (very rough membrane hint). */
const LIPID_PREFIXES = ["PO", "PC", "PE", "PG", "PS", "PI", "DAG", "CHO", "DM", "DP", "DL", "DS", "POP", "DOP"];

export interface ChainInferenceStats {
  standardAaResidues: number;
  nonstandardAa: number;
  dnaLike: number;
  rnaLike: number;
  waterResidues: number;
  ionResidues: number;
  otherHeteroResidues: number;
  polymerNucleotide: number;
}

function residueUpper3(rp: { resname: string }): string {
  return rp.resname.trim().toUpperCase();
}

/**
 * Walk a single NGL chain proxy and infer entity kind + tallies.
 * Export for tests / reuse from structureModelFromNgl.
 */
export function inferEntityKindFromNglChain(cp: {
  residueCount?: number;
  eachResidue: (fn: (rp: {
    resname: string;
    isStandardAminoacid: () => boolean;
    isNucleic: () => boolean;
    getResname1: () => string;
  }) => void) => void;
}): { kind: BiomolecularEntityKind; stats: ChainInferenceStats } {
  const rc = cp.residueCount ?? 0;
  if (rc > 8_000) {
    return {
      kind: "protein",
      stats: {
        standardAaResidues: 0,
        nonstandardAa: 0,
        dnaLike: 0,
        rnaLike: 0,
        waterResidues: 0,
        ionResidues: 0,
        otherHeteroResidues: 0,
        polymerNucleotide: 0,
      },
    };
  }

  const MAX_SAMPLES = 1_200;
  let sampled = 0;
  const stats: ChainInferenceStats = {
    standardAaResidues: 0,
    nonstandardAa: 0,
    dnaLike: 0,
    rnaLike: 0,
    waterResidues: 0,
    ionResidues: 0,
    otherHeteroResidues: 0,
    polymerNucleotide: 0,
  };

  cp.eachResidue((rp) => {
    if (sampled >= MAX_SAMPLES) return;
    sampled += 1;
    const name3 = residueUpper3(rp);
    if (WATER_NAMES.has(name3)) {
      stats.waterResidues += 1;
      return;
    }
    if (ION_CODES.has(name3) && name3.length <= 5 && !rp.isStandardAminoacid() && !rp.isNucleic()) {
      stats.ionResidues += 1;
      return;
    }
    if (rp.isStandardAminoacid()) {
      stats.standardAaResidues += 1;
      return;
    }
    if (rp.isNucleic()) {
      stats.polymerNucleotide += 1;
      const one = rp.getResname1().toUpperCase();
      if (DNA_ONE_LETTER.has(one) && one !== "U") stats.dnaLike += 1;
      else if (RNA_ONE_LETTER.has(one)) stats.rnaLike += 1;
      return;
    }
    if (LIPID_PREFIXES.some((p) => name3.startsWith(p)) && name3.length >= 3) {
      stats.otherHeteroResidues += 1;
      return;
    }
    stats.nonstandardAa += 1;
    stats.otherHeteroResidues += 1;
  });

  const total = Math.max(
    1,
    stats.standardAaResidues +
      stats.nonstandardAa +
      stats.polymerNucleotide +
      stats.waterResidues +
      stats.ionResidues +
      stats.otherHeteroResidues,
  );

  const aaFrac = (stats.standardAaResidues + stats.nonstandardAa * 0.5) / total;
  const waterFrac = stats.waterResidues / total;
  const ionFrac = stats.ionResidues / total;
  const nucFrac = stats.polymerNucleotide / total;

  if (waterFrac > 0.85) {
    return { kind: "solvent", stats };
  }
  if (ionFrac > 0.7 && stats.polymerNucleotide === 0 && stats.standardAaResidues < 3) {
    return { kind: "ion", stats };
  }
  if (nucFrac > 0.5) {
    if (stats.rnaLike > stats.dnaLike) return { kind: "rna", stats };
    if (stats.dnaLike > 0 || stats.polymerNucleotide > 0) return { kind: "dna", stats };
    return { kind: "rna", stats };
  }
  if (aaFrac > 0.45) {
    return { kind: "protein", stats };
  }
  if (stats.polymerNucleotide > 0) {
    return { kind: stats.rnaLike >= stats.dnaLike ? "rna" : "dna", stats };
  }
  /* Lipid / detergent chains: many nonstandard HET, no polymer */
  const hetFrac = stats.otherHeteroResidues / total;
  if (stats.standardAaResidues === 0 && stats.polymerNucleotide === 0 && hetFrac > 0.5) {
    return { kind: "membrane", stats };
  }
  /* small molecule chains */
  if (stats.standardAaResidues === 0 && stats.polymerNucleotide === 0 && stats.waterResidues === 0) {
    if (ionFrac > 0.3) return { kind: "ion", stats };
    return { kind: "ligand", stats };
  }

  return { kind: "complex", stats };
}
