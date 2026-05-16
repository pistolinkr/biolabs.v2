import { Stage, StructureComponent, type PickingProxy } from "ngl";
import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useViewer } from "@/contexts/ViewerContext";
import { resolveStructure } from "@/lib/structureSources";
import { buildHierarchyFromStructure } from "@/lib/structureModelFromNgl";
import { applyMainRepresentation } from "@/lib/nglRepr";
import { ensureMsaNglSchemes } from "@/lib/nglMsaColor";
import { msaVizHasResidueMaps } from "@/lib/msa/msaVizBinding";
import { molecularFocusFromPickingProxy, FOCUS_MAX_ATOMS_NEIGHBOR_REPR } from "@/lib/nglContextFromPick";
import { nglSmoothFocusOnSele } from "@/lib/nglViewportActions";
import type { MolecularFocusContext } from "@/lib/molecularContext";

/** Softer key + fill for dark background — avoids blown-out, neon-like chain colors. */
const VIEWPORT_LIGHTING = {
  lightIntensity: 1.05,
  ambientIntensity: 0.3,
} as const;

/** Contextual highlight after viewport pick — appended after main repr refresh. */
function applyMolecularFocusRepr(sc: StructureComponent, focus: MolecularFocusContext, atomCount: number): void {
  if (focus.primary.type === "surface") return;

  const addShell = atomCount <= FOCUS_MAX_ATOMS_NEIGHBOR_REPR;

  try {
    sc.addRepresentation("ball+stick", {
      sele: focus.primary.nglSele,
      color: "#e8b86d",
      scale: 0.42,
      multipleBond: "symmetric",
    } as never);
  } catch {
    /* */
  }

  if (!addShell) return;

  const shellSele = `(${focus.neighborhoodSele}) and not (${focus.primarySele})`;
  try {
    sc.addRepresentation("line", {
      sele: shellSele,
      color: "#8090a0",
      opacity: 0.28,
    } as never);
  } catch {
    /* */
  }

  const lig = focus.ligandSele?.trim();
  if (lig && lig !== focus.primary.nglSele && !lig.toLowerCase().includes("none")) {
    try {
      sc.addRepresentation("ball+stick", {
        sele: lig,
        color: "#6dccaa",
        scale: 0.34,
        opacity: 0.92,
        multipleBond: "symmetric",
      } as never);
    } catch {
      /* */
    }
  }
}

/** Delay before showing repr overlay — avoids flash on fast updates. */
const REPR_LOADING_DELAY_MS = 200;

/**
 * NGL WebGL viewport — loads mmCIF/PDB; viewer state from ViewerContext.
 */
export default function StructureViewport({ className = "" }: { className?: string }) {
  const {
    proteinSelection: selection,
    setStructureModel,
    registerStage,
    registerStructureComponent,
    structureComponentRef,
    representation,
    colorScheme,
    isolateChainId,
    renderOptions,
    reprGeneration,
    requestReprRefresh,
    showContactsOverlay,
    measurementMode,
    setMolecularFocus,
    clearMolecularFocus,
    molecularFocus,
    msaVizBinding,
  } = useViewer();

  const measurementModeRef = useRef(measurementMode);
  measurementModeRef.current = measurementMode;

  const hostRef = useRef<HTMLDivElement>(null);
  const localStageRef = useRef<Stage | null>(null);
  const fileObjectUrlRef = useRef<string | null>(null);
  const [overlay, setOverlay] = useState<{ kind: "idle" | "loading" | "error"; text?: string }>({
    kind: "idle",
    text: undefined,
  });
  /** Display/repr updates (mode, color, transparency, chain visibility…) — same overlay style as structure load when slow. */
  const [reprLoading, setReprLoading] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const stage = new Stage(el, {
      backgroundColor: "#0a0a0a",
      quality: "medium",
      workerDefault: true,
      ...VIEWPORT_LIGHTING,
    });
    ensureMsaNglSchemes();
    localStageRef.current = stage;
    registerStage(stage);
    try {
      stage.setParameters({
        fogNear: 88,
        fogFar: 100,
        ...VIEWPORT_LIGHTING,
      });
    } catch {
      /* */
    }

    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(() => {
        stage.handleResize();
      });
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(roRaf);
      ro.disconnect();
      registerStage(null);
      registerStructureComponent(null);
      setStructureModel(null);
      stage.dispose();
      localStageRef.current = null;
    };
  }, [registerStage, registerStructureComponent, setStructureModel]);

  useEffect(() => {
    const next =
      selection?.source === "file" && selection.structureObjectUrl ? selection.structureObjectUrl : null;
    if (fileObjectUrlRef.current && fileObjectUrlRef.current !== next) {
      URL.revokeObjectURL(fileObjectUrlRef.current);
    }
    fileObjectUrlRef.current = next;
  }, [selection]);

  useEffect(() => {
    return () => {
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage) return;

    let cancelled = false;

    const run = async () => {
      if (!selection) {
        stage.removeAllComponents();
        registerStructureComponent(null);
        setStructureModel(null);
        setReprLoading(false);
        setOverlay({
          kind: "idle",
          text: "Select structure source → load entry",
        });
        return;
      }

      setReprLoading(false);
      setOverlay({ kind: "loading", text: "Loading structure…" });

      try {
        const resolved = await resolveStructure(selection);
        if (cancelled) return;

        stage.removeAllComponents();
        registerStructureComponent(null);

        const loaded = await stage.loadFile(resolved.url, {
          ext: resolved.format,
          defaultRepresentation: false,
        });
        if (cancelled) return;

        const component =
          loaded instanceof StructureComponent
            ? loaded
            : stage.compList.filter((c) => c instanceof StructureComponent).at(-1);

        if (component instanceof StructureComponent) {
          registerStructureComponent(component);
          const label = selection.label.split("—")[0]?.trim() ?? selection.id;
          queueMicrotask(() => {
            if (cancelled) return;
            startTransition(() => {
              setStructureModel(buildHierarchyFromStructure(component, label));
            });
          });
          requestReprRefresh();
        }

        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            stage.autoView();
            stage.handleResize();
          } catch {
            /* */
          }
          setOverlay({ kind: "idle", text: undefined });
        });
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(
            () => {
              if (cancelled) return;
              toast.success(resolved.provenance);
            },
            { timeout: 900 },
          );
        } else {
          setTimeout(() => {
            if (cancelled) return;
            toast.success(resolved.provenance);
          }, 0);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load structure";
        setOverlay({ kind: "error", text: msg });
        toast.error(msg);
        registerStructureComponent(null);
        setStructureModel(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selection, setStructureModel, registerStructureComponent, requestReprRefresh]);

  useEffect(() => {
    const sc = structureComponentRef.current;
    const stage = localStageRef.current;
    if (!sc || !stage) {
      setReprLoading(false);
      return;
    }
    let cancelled = false;
    const raf1Ref = { id: 0 };
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setReprLoading(true);
    }, REPR_LOADING_DELAY_MS);

    const clearReprLoading = () => {
      window.clearTimeout(slowTimer);
      setReprLoading(false);
    };

    const raf0 = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        let effectiveColor = colorScheme;
        if (
          (colorScheme === "msa_entropy" || colorScheme === "msa_gap") &&
          !msaVizHasResidueMaps(msaVizBinding)
        ) {
          effectiveColor = "chainid";
        }
        applyMainRepresentation(sc, representation, effectiveColor, {
          isolateChainId,
          transparent: renderOptions.transparency,
        });
        if (showContactsOverlay) {
          try {
            const sele = isolateChainId ? `:${isolateChainId} and polymer` : "polymer";
            sc.addRepresentation("contact", {
              sele,
              labelVisible: false,
            } as never);
          } catch {
            /* NGL version may omit contact */
          }
        }
        if (molecularFocus) {
          const ac = sc.structure?.atomCount ?? 0;
          applyMolecularFocusRepr(sc, molecularFocus, ac);
        }
        stage.handleResize();
      } catch {
        clearReprLoading();
        return;
      }
      raf1Ref.id = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          stage.handleResize();
        } catch {
          /* */
        } finally {
          clearReprLoading();
        }
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(raf1Ref.id);
      setReprLoading(false);
    };
  }, [
    reprGeneration,
    representation,
    colorScheme,
    isolateChainId,
    renderOptions.transparency,
    structureComponentRef,
    showContactsOverlay,
    molecularFocus,
    msaVizBinding,
  ]);

  useEffect(() => {
    const stage = localStageRef.current;
    if (!stage || !selection) return;

    const onPick = (pp: PickingProxy | undefined) => {
      if (measurementModeRef.current !== "none") return;
      const sc = structureComponentRef.current;
      const structure = sc?.structure;
      if (!structure) return;
      if (!pp) return;

      const t = pp.type;
      if (t === "background" || t === "stage") {
        clearMolecularFocus();
        return;
      }

      const ctx = molecularFocusFromPickingProxy(pp, structure);
      if (!ctx) {
        clearMolecularFocus();
        return;
      }
      setMolecularFocus(ctx);
      if (ctx.primary.type !== "surface") {
        nglSmoothFocusOnSele(sc, ctx.primarySele, 420);
      }
    };

    const cid = stage.signals.clicked.add(onPick as never);
    return () => {
      const binding = cid as { detach?: () => void };
      binding.detach?.();
    };
  }, [selection, setMolecularFocus, clearMolecularFocus, structureComponentRef]);

  return (
    <div className={`relative h-full w-full min-h-0 min-w-0 overflow-hidden ${className}`}>
      <div ref={hostRef} className="absolute inset-0 h-full w-full min-h-0 touch-none overflow-hidden" />

      {selection === null && overlay.kind === "idle" ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center font-mono">
          <span className="text-[11px] uppercase tracking-widest text-[#8A8A8A]">Viewport idle</span>
          <span className="text-[10px] text-[#6A6A6A]">NGL · RCSB / UniProt / AlphaFold DB</span>
        </div>
      ) : null}

      {overlay.kind === "loading" || reprLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/60">
          <span className="border border-[#2A2A2A] bg-[#111111] px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-[#F2F2F2]">
            {overlay.kind === "loading"
              ? overlay.text
              : "Updating structure display…"}
          </span>
        </div>
      ) : null}

      {overlay.kind === "error" && overlay.text ? (
        <div className="absolute inset-x-0 bottom-0 border-t border-[#2A2A2A] bg-[#111111]/95 px-3 py-2 font-mono text-[10px] text-[#FF6666]">
          {overlay.text}
        </div>
      ) : null}
    </div>
  );
}
