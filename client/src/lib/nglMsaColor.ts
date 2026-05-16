import { ColormakerRegistry } from "ngl";
import type { Colormaker } from "ngl";
import type { MsaVizBinding } from "@/lib/msa/msaVizBinding";

/** Latest binding read by NGL colormaker (updated from ViewerProvider). */
let msaNglBindingRef: MsaVizBinding | null = null;

export function setMsaNglBindingRef(b: MsaVizBinding | null): void {
  msaNglBindingRef = b;
}

export function getMsaNglBindingRef(): MsaVizBinding | null {
  return msaNglBindingRef;
}

const GRAY = 0x3a3a3a;

/** Blue (conserved) → yellow (variable), no extra deps. */
function heatColor(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const r = Math.round(32 + 223 * x);
  const g = Math.round(48 + 180 * Math.sin(x * Math.PI));
  const b = Math.round(120 * (1 - x));
  return (r << 16) | (g << 8) | b;
}

let registered = false;
let schemeEntropyId = "biolabs_msa_entropy";
let schemeGapId = "biolabs_msa_gap";

/** Register custom NGL colormakers once. Returns scheme ids for representations. */
export function ensureMsaNglSchemes(): { entropy: string; gap: string } {
  if (!registered) {
    registered = true;

    schemeEntropyId = ColormakerRegistry.addScheme(function (this: Colormaker) {
      this.atomColor = (atom: { chainname: string; resno: number }) => {
        const b = msaNglBindingRef;
        if (!b) return GRAY;
        const slice = b.chains[atom.chainname];
        if (!slice) return GRAY;
        const key = `${atom.chainname}:${atom.resno}`;
        const col = slice.residueKeyToColumn[key];
        if (col === undefined) return GRAY;
        const ent = slice.analysis.columns[col]?.entropy ?? 0;
        const span = slice.entropyMax - slice.entropyMin || 1;
        const t = (ent - slice.entropyMin) / span;
        return heatColor(t);
      };
    }, "Biolabs MSA entropy");

    schemeGapId = ColormakerRegistry.addScheme(function (this: Colormaker) {
      this.atomColor = (atom: { chainname: string; resno: number }) => {
        const b = msaNglBindingRef;
        if (!b) return GRAY;
        const slice = b.chains[atom.chainname];
        if (!slice) return GRAY;
        const key = `${atom.chainname}:${atom.resno}`;
        const col = slice.residueKeyToColumn[key];
        if (col === undefined) return GRAY;
        const g = slice.analysis.columns[col]?.gapFraction ?? 0;
        return heatColor(1 - Math.max(0, Math.min(1, g)));
      };
    }, "Biolabs MSA gap");
  }
  return { entropy: schemeEntropyId, gap: schemeGapId };
}
