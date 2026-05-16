import { Selection, type PickingProxy, type Structure } from "ngl";
import type { MolecularFocusContext, PickedEntity } from "@/lib/molecularContext";

const DEFAULT_RADIUS = 5;

/** Skip heavy neighborhood repr above this atom count. */
export const FOCUS_MAX_ATOMS_NEIGHBOR_REPR = 80_000;

/** Skip per-atom chain scan above this. */
export const FOCUS_MAX_ATOMS_CHAIN_SCAN = 28_000;

function seleResidue(chainname: string, resno: number): string {
  return `:${chainname} and ${resno}`;
}

function seleAtom(chainname: string, resno: number, atomname: string): string {
  return `:${chainname} and ${resno} and .${atomname}`;
}

function entityFromAtom(ap: {
  chainname: string;
  chainid: string;
  resno: number;
  resname: string;
  atomname: string;
  hetero: number;
}): PickedEntity {
  const chainId = ap.chainname || ap.chainid || "?";
  const resno = ap.resno;
  const resname = ap.resname || "?";
  const atomname = (ap.atomname || "").trim();
  const isHetero = ap.hetero === 1;

  const residueSele = seleResidue(chainId, resno);
  if (isHetero) {
    const ligandSele =
      resname && resname !== "HOH" ? seleResidue(chainId, resno) : residueSele;
    return {
      type: "ligand",
      chainId,
      resno,
      resname,
      nglSele: ligandSele,
      label: `${chainId} ${resname}${resno}`,
    };
  }

  return {
    type: "atom",
    chainId,
    resno,
    resname,
    atomname,
    nglSele: seleAtom(chainId, resno, atomname),
    label: `${chainId} ${resname}${resno} ${atomname}`,
  };
}

function primarySeleForExpansion(primary: PickedEntity): string {
  switch (primary.type) {
    case "atom":
      return seleResidue(primary.chainId, primary.resno);
    case "residue":
    case "ligand":
      return seleResidue(primary.chainId, primary.resno);
    case "chain":
      return `:${primary.chainId}`;
    default:
      return primary.nglSele;
  }
}

function neighborhoodSele(primarySele: string, radiusAngstrom: number): string {
  const inner = primarySele.includes(" ") ? `(${primarySele})` : primarySele;
  return `within ${radiusAngstrom} of ${inner}`;
}

function ligandNeighborhoodSele(neighborhoodSele: string): string {
  return `(${neighborhoodSele}) and hetero and not (water or ion)`;
}

function collectChainsTouching(structure: Structure, neighborhoodSele: string): string[] {
  const sel = new Selection(neighborhoodSele);
  const test = sel.test;
  if (typeof test !== "function") return [];
  const chains = new Set<string>();
  structure.eachAtom((ap) => {
    if (test(ap)) chains.add(ap.chainname || ap.chainid);
  });
  return Array.from(chains).filter(Boolean).sort();
}

function countNeighborhoodAtoms(structure: Structure, neighborhoodSele: string): number {
  const sel = new Selection(neighborhoodSele);
  const test = sel.test;
  if (typeof test !== "function") return 0;
  let n = 0;
  structure.eachAtom((ap) => {
    if (test(ap)) n += 1;
  });
  return n;
}

/** Resolve atom used for chemistry context from an NGL pick. */
export function atomFromPickingProxy(pp: PickingProxy | null | undefined) {
  if (!pp) return undefined;
  const t = pp.type;
  if (t === "bond" || t === "distance") return pp.closestBondAtom;
  if (t === "atom") return pp.atom;
  try {
    return pp.atom;
  } catch {
    return undefined;
  }
}

export interface FocusFromPickOptions {
  radiusAngstrom?: number;
}

export function molecularFocusFromPickingProxy(
  pp: PickingProxy | null | undefined,
  structure: Structure,
  opts: FocusFromPickOptions = {},
): MolecularFocusContext | null {
  if (!pp) return null;
  const radiusAngstrom = opts.radiusAngstrom ?? DEFAULT_RADIUS;
  const atomCount = structure.atomCount ?? 0;

  const atom = atomFromPickingProxy(pp);
  if (atom) {
    const primary = entityFromAtom(atom);
    const primarySele = primarySeleForExpansion(primary);
    const nSele = neighborhoodSele(primarySele, radiusAngstrom);
    const lSele = ligandNeighborhoodSele(nSele);

    let emphasizedChainIds: string[] = [atom.chainname || atom.chainid].filter(Boolean) as string[];
    let neighborhoodAtomCount: number | undefined;

    if (atomCount <= FOCUS_MAX_ATOMS_CHAIN_SCAN) {
      neighborhoodAtomCount = countNeighborhoodAtoms(structure, nSele);
      emphasizedChainIds = collectChainsTouching(structure, nSele);
    }

    return {
      primary,
      primarySele,
      neighborhoodSele: nSele,
      ligandSele: lSele,
      emphasizedChainIds,
      radiusAngstrom,
      neighborhoodAtomCount,
      createdAt: new Date().toISOString(),
    };
  }

  if (pp.type === "surface" && pp.surface) {
    const primary: PickedEntity = {
      type: "surface",
      nglSele: "polymer",
      label: "Surface",
    };
    return {
      primary,
      primarySele: "polymer",
      neighborhoodSele: "polymer",
      emphasizedChainIds: [],
      radiusAngstrom,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

export { DEFAULT_RADIUS as FOCUS_DEFAULT_RADIUS_ANGSTROM };
