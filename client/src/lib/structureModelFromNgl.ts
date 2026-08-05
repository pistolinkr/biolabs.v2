import type { StructureComponent } from "ngl";
import type { ChainModel, StructureHierarchyModel } from "@/contexts/ViewerContext";
import { inferEntityKindFromNglChain } from "@/lib/biomolecularEntities";

/** Beyond this, skip per-residue 1-letter sequence build (major main-thread win on large PDBs). */
export const MAX_RESIDUES_FOR_SEQUENCE_BUILD = 2_500;

/** mmCIF / PDB common nucleotide 3-letter codes → 1-letter (IUPAC). */
const NUCLEIC_3TO1: Record<string, string> = {
  A: "A",
  C: "C",
  G: "G",
  T: "T",
  U: "U",
  DA: "A",
  DC: "C",
  DG: "G",
  DT: "T",
  DU: "U",
  RA: "A",
  RC: "C",
  RG: "G",
  RU: "U",
  ADE: "A",
  CYT: "C",
  GUA: "G",
  THY: "T",
  URA: "U",
  GTP: "G",
  ATP: "A",
  CTP: "C",
  UTP: "U",
  GDP: "G",
  CMP: "C",
};

function nucleicOneLetterFromResidue(rp: {
  resname: string;
  getResname1: () => string;
  isNucleic: () => boolean;
}): string {
  const key = (rp.resname ?? "").trim().toUpperCase();
  // Prefer chemical name map first — NGL isNucleic()/getResname1() miss some DNA codes (DA/DT…).
  if (NUCLEIC_3TO1[key]) return NUCLEIC_3TO1[key];
  if (/^[ACGTU]$/.test(key)) return key;

  let flaggedNucleic = false;
  try {
    flaggedNucleic = rp.isNucleic();
  } catch {
    flaggedNucleic = false;
  }
  if (!flaggedNucleic) return "";

  try {
    const one = rp.getResname1()?.trim();
    if (one && /^[ACGTU]$/i.test(one)) return one.toUpperCase();
  } catch {
    /* NGL may throw for uncommon residues */
  }
  return "?";
}

/**
 * Build chain summary + optional 1-letter sequences for the sequence strip / UI.
 * Large structures: counts only (no eachResidue) to avoid multi‑ms stalls after load.
 */
export function buildHierarchyFromStructure(
  comp: StructureComponent,
  title: string,
): StructureHierarchyModel {
  const chains: ChainModel[] = [];

  comp.structure.eachChain((cp) => {
    const inf = inferEntityKindFromNglChain(cp);
    chains.push({
      id: cp.chainname,
      residueCount: cp.residueCount,
      atomCount: cp.atomCount,
      visible: true,
      entityKind: inf.kind,
    });
  });

  let atomCount = 0;
  let residueCount = 0;
  for (const c of chains) {
    atomCount += c.atomCount;
    residueCount += c.residueCount;
  }

  const sequenceByChain: Record<string, string> = Object.fromEntries(chains.map((c) => [c.id, ""]));
  const nucleicSequenceByChain: Record<string, string> = Object.fromEntries(
    chains.map((c) => [c.id, ""]),
  );

  const buildSequences = residueCount <= MAX_RESIDUES_FOR_SEQUENCE_BUILD;

  if (buildSequences) {
    comp.structure.eachChain((cp) => {
      let protein = "";
      let nucleic = "";
      cp.eachResidue((rp) => {
        if (rp.isStandardAminoacid()) {
          protein += rp.getResname1();
          return;
        }
        const nt = nucleicOneLetterFromResidue(rp);
        if (nt) nucleic += nt;
      });
      sequenceByChain[cp.chainname] = protein;
      nucleicSequenceByChain[cp.chainname] = nucleic;
    });
  }

  return {
    title,
    chains,
    sequenceByChain,
    nucleicSequenceByChain,
    atomCount,
    residueCount,
    assemblyId: null,
  };
}
