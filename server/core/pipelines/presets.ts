/**
 * Preset pipeline definitions (node-graph JSON) — expanded in UI Phase 3.
 */
export const PRESET_PIPELINES = [
  {
    id: "fasta_msa_af3",
    label: "FASTA → MSA Search → AlphaFold3",
    nodes: [
      { id: "n1", type: "input", kind: "fasta" },
      { id: "n2", type: "msa_search", dependsOn: ["n1"] },
      { id: "n3", type: "alphafold3", dependsOn: ["n2"] },
    ],
  },
  {
    id: "structure_evo2_genmol",
    label: "Structure → EVO2 analysis → GenMol",
    nodes: [
      { id: "s1", type: "input", kind: "structure" },
      { id: "s2", type: "evo2_40b", dependsOn: ["s1"] },
      { id: "s3", type: "genmol", dependsOn: ["s1", "s2"] },
    ],
  },
  {
    id: "paired_msa_boltz2",
    label: "Paired MSA → Boltz-2 (multimer)",
    nodes: [
      { id: "p1", type: "input", kind: "multimer_fasta" },
      { id: "p2", type: "msa_search_paired", dependsOn: ["p1"] },
      { id: "p3", type: "boltz2", dependsOn: ["p2"] },
    ],
  },
] as const;
