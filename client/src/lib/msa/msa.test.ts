import { describe, expect, it } from "vitest";
import { analyzeMsaText, parseFastaA3m, stripA3mInserts } from "./index";
import { buildResidueToMsaColumnMap } from "./mapStructure";

describe("stripA3mInserts", () => {
  it("removes lowercase insert characters", () => {
    expect(stripA3mInserts("MKaTV")).toBe("MKTV");
  });
});

describe("parseFastaA3m", () => {
  it("parses two-row a3m and pads width", () => {
    const t = ">query\nMKTVRQERLKSIVR\n>hit_1\nMKTVRQERLKSIVR\n";
    const { alignment, rowCapHit } = parseFastaA3m(t, { maxRows: 100, maxCols: 100 });
    expect(rowCapHit).toBe(false);
    expect(alignment.width).toBe(14);
    expect(alignment.rows).toHaveLength(2);
    expect(alignment.rows[0]!.matchStates).toBe("MKTVRQERLKSIVR");
  });
});

describe("analyzeMsaText", () => {
  it("assigns zero entropy to fully conserved columns", () => {
    const t = ">a\nAAAA\n>b\nAAAA\n";
    const a = analyzeMsaText(t);
    expect(a.columns).toHaveLength(4);
    for (const c of a.columns) {
      expect(c.entropy).toBe(0);
    }
  });

  it("detects variable column entropy", () => {
    const t = ">a\nAC\n>b\nAG\n";
    const a = analyzeMsaText(t);
    expect(a.columns[0]!.entropy).toBe(0);
    expect(a.columns[1]!.entropy).toBeGreaterThan(0);
  });
});

describe("buildResidueToMsaColumnMap", () => {
  it("maps 1:1 when structure equals query without gaps", () => {
    const q = "MKTVR-"; // col 5 is gap in query
    const s = "MKTVR";
    const m = buildResidueToMsaColumnMap("A", s, q);
    expect(m.exactQueryMatch).toBe(true);
    expect(m.residueKeyToColumn["A:1"]).toBe(0);
    expect(m.residueKeyToColumn["A:5"]).toBe(4);
  });
});
