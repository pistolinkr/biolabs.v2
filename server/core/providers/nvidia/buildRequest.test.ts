import { describe, expect, it } from "vitest";
import {
  buildBoltz2Request,
  buildEvo2Request,
  buildGenmolRequest,
  buildMsaRequest,
  buildOpenFold3Request,
  buildPairedMsaRequest,
} from "./buildRequest.js";

describe("buildRequest", () => {
  it("rejects invalid MSA sequence", () => {
    const r = buildMsaRequest({ sequence: "123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("amino");
  });

  it("defaults monomer MSA search_type to colabfold", () => {
    const r = buildMsaRequest({ sequence: "MKTV" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.body as Record<string, unknown>).search_type).toBe("colabfold");
    }
  });

  it("builds paired MSA body from chain record", () => {
    const r = buildPairedMsaRequest({
      sequences: { A: "MKTV", B: "ACE" },
      pairing_strategy: "complete",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const b = r.body as Record<string, unknown>;
      expect(b.pairing_strategy).toBe("complete");
      expect(b.sequences).toEqual({ A: "MKTV", B: "ACE" });
    }
  });

  it("rejects paired MSA with one chain", () => {
    const r = buildPairedMsaRequest({ sequences: { A: "MKTV" } });
    expect(r.ok).toBe(false);
  });

  it("strips UI keys from OpenFold pass-through", () => {
    const r = buildOpenFold3Request({
      note: "x",
      inputs: [{ input_id: "a", molecules: [] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.body as Record<string, unknown>).note).toBeUndefined();
  });

  it("builds CSV MSA demo for sequence-only OpenFold", () => {
    const r = buildOpenFold3Request({ sequence: "MKTV" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const inputs = (r.body as { inputs: Array<{ molecules: Array<{ msa: { main_db: { csv: { alignment: string } } } }> }> })
        .inputs;
      expect(inputs[0].molecules[0].msa.main_db.csv.alignment).toContain("key,sequence");
    }
  });

  it("builds OpenFold3 with external A3M when use_external_msa set", () => {
    const r = buildOpenFold3Request({
      sequence: "MKTV",
      use_external_msa: true,
      msa_alignment_text: ">q\nMKTV\n>h\nMKTV\n",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const m = (r.body as { inputs: Array<{ molecules: Array<{ msa: { main_db: { a3m: { alignment: string; format: string } } } }> }> })
        .inputs[0].molecules[0].msa.main_db.a3m;
      expect(m.format).toBe("a3m");
      expect(m.alignment).toContain(">q");
    }
  });

  it("rejects external OpenFold3 without alignment text", () => {
    const r = buildOpenFold3Request({ sequence: "MKTV", use_external_msa: true });
    expect(r.ok).toBe(false);
  });

  it("builds Boltz2 with full A3M when use_external_msa set", () => {
    const r = buildBoltz2Request({
      sequence: "MKTV",
      use_external_msa: true,
      msa_alignment_text: ">q\nMKTV\n",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const aln = (r.body as { polymers: Array<{ msa: { uniref90: { a3m: { alignment: string } } } }> }).polymers[0].msa
        .uniref90.a3m.alignment;
      expect(aln).toContain(">q");
    }
  });

  it("rejects non-DNA Evo2", () => {
    const r = buildEvo2Request({ sequence: "MKTV" });
    expect(r.ok).toBe(false);
  });

  it("accepts DNA Evo2 payload", () => {
    const r = buildEvo2Request({ sequence: "ATCGATCG", num_tokens: 16 });
    expect(r.ok).toBe(true);
  });

  it("rejects empty genmol smiles", () => {
    const r = buildGenmolRequest({ smiles: "   " });
    expect(r.ok).toBe(false);
  });
});
