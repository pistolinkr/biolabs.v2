import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeJobResult } from "./resultNormalize.js";

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "__fixtures__", name), "utf8"));
}

describe("normalizeJobResult", () => {
  it("maps MSA fixture to biolabs alignment", () => {
    const { biolabs } = normalizeJobResult("msa_search", loadFixture("msa-sample.json"));
    expect(biolabs.service).toBe("msa_search");
    if (biolabs.service === "msa_search" || biolabs.service === "msa_search_paired") {
      expect(biolabs.alignmentText).toContain("MKTVRQERLKSIVR");
      expect(biolabs.queryId).toBe("demo-q");
    }
  });

  it("prefers per-database alignment over colabfold merge in normalized alignmentText", () => {
    const { biolabs } = normalizeJobResult("msa_search", loadFixture("msa-colabfold-pick.json"));
    expect(biolabs.service).toBe("msa_search");
    if (biolabs.service === "msa_search" || biolabs.service === "msa_search_paired") {
      expect(biolabs.alignmentText).toContain("FROM_UNIREF");
      expect(biolabs.alignmentText).not.toContain("FROM_COLABFOLD");
    }
  });

  it("maps paired MSA vendor body to alignmentsByChain", () => {
    const vendor = {
      alignments_by_chain: {
        A: { uni: { a3m: { alignment: ">A\nAAA\n", format: "a3m" } } },
        B: { uni: { a3m: { alignment: ">B\nBBB\n", format: "a3m" } } },
      },
    };
    const { biolabs } = normalizeJobResult("msa_search_paired", vendor);
    expect(biolabs.service).toBe("msa_search_paired");
    if (biolabs.service === "msa_search_paired") {
      expect(biolabs.alignmentsByChain?.A).toContain("AAA");
      expect(biolabs.alignmentsByChain?.B).toContain("BBB");
      expect(biolabs.suggestContacts).toBe(true);
    }
  });

  it("maps OpenFold fixture to mmcifText", () => {
    const { biolabs } = normalizeJobResult("alphafold3", loadFixture("openfold-sample.json"));
    expect(biolabs.service).toBe("alphafold3");
    if (biolabs.service === "alphafold3") {
      expect(biolabs.mmcifText).toContain("_atom_site");
      expect(biolabs.plddtSummary).toContain("pLDDT");
    }
  });

  it("maps Evo2 fixture to sections", () => {
    const { biolabs } = normalizeJobResult("evo2_40b", loadFixture("evo2-sample.json"));
    expect(biolabs.service).toBe("evo2_40b");
    if (biolabs.service === "evo2_40b") {
      expect(biolabs.sections.length).toBeGreaterThan(0);
      expect(biolabs.summary).toBe("continuation ok");
    }
  });

  it("maps Boltz structures to candidates", () => {
    const { biolabs } = normalizeJobResult("boltz2", loadFixture("boltz-sample.json"));
    expect(biolabs.service).toBe("boltz2");
    if (biolabs.service === "boltz2") {
      expect(biolabs.candidates.length).toBe(1);
      expect(biolabs.candidates[0].structureText).toContain("_atom_site");
    }
  });
});
