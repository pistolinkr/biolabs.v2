import type { Stage, StructureComponent } from "ngl";

export function nglResetView(stage: Stage | null): void {
  if (!stage) return;
  try {
    const vc = (stage as unknown as { viewerControls?: { reset: () => void } }).viewerControls;
    vc?.reset?.();
  } catch {
    /* ignore */
  }
  try {
    stage.autoView();
  } catch {
    /* ignore */
  }
}

export function nglFitStructure(stage: Stage | null, sc: StructureComponent | null): void {
  if (!stage) return;
  try {
    if (sc) sc.autoView();
    else stage.autoView();
  } catch {
    try {
      stage.autoView();
    } catch {
      /* ignore */
    }
  }
}

/** Fit isolate chain, residue key (NGL sele), contextual focus, or full structure. */
export function nglFitSelection(
  stage: Stage | null,
  sc: StructureComponent | null,
  isolateChainId: string | null,
  selectedResidueKey: string | null,
  molecularFocusPrimarySele?: string | null,
  durationMs = 350,
): void {
  if (!stage || !sc) return;
  try {
    if (molecularFocusPrimarySele?.trim()) {
      sc.autoView(molecularFocusPrimarySele.trim(), durationMs);
      return;
    }
    if (selectedResidueKey?.trim()) {
      sc.autoView(selectedResidueKey.trim(), durationMs);
      return;
    }
    if (isolateChainId) {
      sc.autoView(`:${isolateChainId}`, durationMs);
      return;
    }
    sc.autoView(durationMs);
  } catch {
    try {
      stage.autoView();
    } catch {
      /* ignore */
    }
  }
}

export function nglSmoothFocusOnSele(sc: StructureComponent | null, sele: string, durationMs = 450): void {
  if (!sc || !sele.trim()) return;
  try {
    sc.autoView(sele.trim(), durationMs);
  } catch {
    /* ignore */
  }
}

export function nglScreenshotToFile(stage: Stage | null, filename = "biolabs-viewport.png"): boolean {
  if (!stage) return false;
  try {
    const viewer = (stage as unknown as { viewer: { render: () => void; canvas: HTMLCanvasElement } }).viewer;
    viewer.render();
    const { canvas } = viewer;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
    return true;
  } catch {
    return false;
  }
}
