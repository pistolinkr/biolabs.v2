import { describe, expect, it } from "vitest";
import {
  extractAlignmentsByChainFromVendorTree,
  findAlignmentInVendorTree,
  pickAlignmentFromDatabaseMap,
} from "./msaResponse.js";

describe("pickAlignmentFromDatabaseMap", () => {
  it("prefers a real database block over merged colabfold", () => {
    const dbs: Record<string, unknown> = {
      colabfold: { a3m: { alignment: ">q\nWRONG\n", format: "a3m" } },
      uniref30_2302: { a3m: { alignment: ">q\nRIGHT\n", format: "a3m" } },
    };
    expect(pickAlignmentFromDatabaseMap(dbs)).toContain("RIGHT");
    expect(pickAlignmentFromDatabaseMap(dbs)).not.toContain("WRONG");
  });

  it("falls back to colabfold when it is the only block", () => {
    const dbs: Record<string, unknown> = {
      colabfold: { a3m: { alignment: ">q\nONLY\n", format: "a3m" } },
    };
    expect(pickAlignmentFromDatabaseMap(dbs)).toContain("ONLY");
  });
});

describe("findAlignmentInVendorTree", () => {
  it("uses non-colabfold key in alignments root", () => {
    const raw = {
      alignments: {
        colabfold: { a3m: { alignment: ">a\nCC\n", format: "a3m" } },
        pdb: { a3m: { alignment: ">a\nGG\n", format: "a3m" } },
      },
    };
    expect(findAlignmentInVendorTree(raw)).toContain("GG");
  });
});

describe("extractAlignmentsByChainFromVendorTree", () => {
  it("extracts per-chain alignments with DB preference", () => {
    const raw = {
      alignments_by_chain: {
        B: {
          colabfold: { a3m: { alignment: ">B\nBB\n", format: "a3m" } },
        },
        A: {
          uniref90: { a3m: { alignment: ">A\nAA\n", format: "a3m" } },
        },
      },
    };
    const by = extractAlignmentsByChainFromVendorTree(raw);
    expect(by?.A).toContain("AA");
    expect(by?.B).toContain("BB");
  });
});
