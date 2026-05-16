import type { StructureComponent } from "ngl";
import type { ChainModel, StructureHierarchyModel } from "@/contexts/ViewerContext";
import { inferEntityKindFromNglChain } from "@/lib/biomolecularEntities";

/** Beyond this, skip per-residue 1-letter sequence build (major main-thread win on large PDBs). */
const MAX_RESIDUES_FOR_SEQUENCE_BUILD = 2_500;

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
  const residueResnosByChain: Record<string, number[]> = Object.fromEntries(chains.map((c) => [c.id, []]));

  const buildSequences = residueCount <= MAX_RESIDUES_FOR_SEQUENCE_BUILD;

  if (buildSequences) {
    comp.structure.eachChain((cp) => {
      let seq = "";
      const resnos: number[] = [];
      cp.eachResidue((rp) => {
        if (rp.isStandardAminoacid()) {
          seq += rp.getResname1();
          resnos.push(rp.resno);
        }
      });
      sequenceByChain[cp.chainname] = seq;
      residueResnosByChain[cp.chainname] = resnos;
    });
  }

  return {
    title,
    chains,
    sequenceByChain,
    residueResnosByChain,
    atomCount,
    residueCount,
    assemblyId: null,
  };
}
