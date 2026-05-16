/**
 * Structured viewport pick state for contextual highlighting (polymer / complex).
 */

export type PickedEntityKind = "atom" | "residue" | "chain" | "ligand" | "surface" | "unknown";

export interface PickedEntityBase {
  /** NGL selection string for the primary emphasis region. */
  nglSele: string;
  /** Short label for inspector / HUD. */
  label: string;
}

export type PickedEntity =
  | ({
      type: "atom";
      chainId: string;
      resno: number;
      resname: string;
      atomname: string;
    } & PickedEntityBase)
  | ({
      type: "residue";
      chainId: string;
      resno: number;
      resname: string;
    } & PickedEntityBase)
  | ({
      type: "ligand";
      chainId: string;
      resno: number;
      resname: string;
    } & PickedEntityBase)
  | ({
      type: "chain";
      chainId: string;
    } & PickedEntityBase)
  | ({
      type: "surface";
    } & PickedEntityBase)
  | ({
      type: "unknown";
    } & PickedEntityBase);

export interface MolecularFocusContext {
  primary: PickedEntity;
  /** Residue / fragment for neighborhood expansion. */
  primarySele: string;
  /** Full neighborhood (within R Å). */
  neighborhoodSele: string;
  /** Hetero in neighborhood (best-effort). */
  ligandSele?: string;
  /** Chains touching the neighborhood selection (derived). */
  emphasizedChainIds: string[];
  radiusAngstrom: number;
  /** Atom count in neighborhood when computed. */
  neighborhoodAtomCount?: number;
  createdAt: string;
}

/** Match [`SequenceStrip`](SequenceStrip.tsx): `chain:1-based-index` for protein residues. */
export function residueKeyFromPick(chainId: string, resno: number): string {
  return `${chainId}:${resno}`;
}
