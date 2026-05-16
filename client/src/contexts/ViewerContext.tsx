import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Stage, StructureComponent } from "ngl";
import { toast } from "sonner";
import type { ProteinSelection } from "@/lib/proteinApis";
import { proteinSelectionKey } from "@/lib/proteinApis";
import { downloadStructureCoordinates } from "@/lib/structureExport";
import {
  nglFitSelection,
  nglFitStructure,
  nglResetView,
  nglScreenshotToFile,
} from "@/lib/nglViewportActions";
import type { MolecularFocusContext } from "@/lib/molecularContext";
import { residueKeyFromPick } from "@/lib/molecularContext";
import type { RcsbEntryHint } from "@/lib/rcsbEntryHint";
import { fetchRcsbEntryHint } from "@/lib/rcsbEntryHint";
import type { BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";
import { setMsaNglBindingRef } from "@/lib/nglMsaColor";
import { msaVizHasResidueMaps, type MsaVizBinding } from "@/lib/msa/msaVizBinding";

export type { MsaVizBinding };

export interface ChainModel {
  id: string;
  residueCount: number;
  atomCount: number;
  visible: boolean;
  entityKind: BiomolecularEntityKind;
}

export interface StructureHierarchyModel {
  title: string;
  chains: ChainModel[];
  sequenceByChain: Record<string, string>;
  /** mmCIF `seq_id` order: residue numbers aligned with `sequenceByChain` (standard AA only). */
  residueResnosByChain: Record<string, number[]>;
  atomCount: number;
  residueCount: number;
  /** RCSB bioassembly — UI placeholder until metadata is loaded. */
  assemblyId?: string | null;
}

export interface ViewerRenderOptions {
  ambientOcclusion: boolean;
  shadows: boolean;
  transparency: boolean;
  edgeEnhancement: boolean;
  depthCue: boolean;
}

export type MeasurementMode = "none" | "distance" | "angle" | "dihedral";

interface ViewerContextValue {
  proteinSelection: ProteinSelection | null;
  setProteinSelection: (s: ProteinSelection | null) => void;

  structureModel: StructureHierarchyModel | null;
  setStructureModel: React.Dispatch<React.SetStateAction<StructureHierarchyModel | null>>;

  representation: VizRepresentationId;
  setRepresentation: (r: VizRepresentationId) => void;

  colorScheme: VizColorSchemeId;
  setColorScheme: (c: VizColorSchemeId) => void;

  isolateChainId: string | null;
  setIsolateChainId: (id: string | null) => void;

  setChainVisibilityNGL: (chainId: string, visible: boolean) => void;

  spinEnabled: boolean;
  setSpinEnabled: (v: boolean) => void;

  renderOptions: ViewerRenderOptions;
  setRenderOptions: (p: Partial<ViewerRenderOptions>) => void;

  measurementMode: MeasurementMode;
  setMeasurementMode: (m: MeasurementMode) => void;

  focusResidueQuery: string;
  setFocusResidueQuery: (q: string) => void;

  selectedResidueKey: string | null;
  setSelectedResidueKey: (k: string | null) => void;

  /** Viewport pick → neighborhood context (not used in measurement picking modes). */
  molecularFocus: MolecularFocusContext | null;
  setMolecularFocus: (ctx: MolecularFocusContext | null) => void;
  clearMolecularFocus: () => void;

  /** RCSB core entry title/deposit (when PDB id known). */
  entryHint: RcsbEntryHint | null;

  /** Highlight chain from hierarchy hover (sequence strip / HUD sync). */
  hoverChainId: string | null;
  setHoverChainId: (id: string | null) => void;

  viewportShellRef: React.MutableRefObject<HTMLDivElement | null>;
  setViewportShell: (el: HTMLDivElement | null) => void;

  stageRef: React.MutableRefObject<Stage | null>;
  structureComponentRef: React.MutableRefObject<StructureComponent | null>;
  registerStage: (s: Stage | null) => void;
  registerStructureComponent: (sc: StructureComponent | null) => void;

  requestReprRefresh: () => void;
  reprGeneration: number;

  /** NGL contact representation layered on main repr (distance pairs). */
  showContactsOverlay: boolean;

  /** MSA column stats mapped onto loaded structure (for custom NGL colormakers). */
  msaVizBinding: MsaVizBinding | null;
  setMsaVizBinding: (b: MsaVizBinding | null) => void;

  runViewerCommand: (cmdId: string) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

const STORAGE_KEY = "biolabs.workspace.v1";

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [proteinSelection, setProteinSelection] = useState<ProteinSelection | null>(null);
  const [structureModel, setStructureModel] = useState<StructureHierarchyModel | null>(null);
  const [representation, setRepresentationState] = useState<VizRepresentationId>("cartoon");
  const [colorScheme, setColorSchemeState] = useState<VizColorSchemeId>("chainid");
  const [isolateChainId, setIsolateChainIdState] = useState<string | null>(null);
  const [spinEnabled, setSpinEnabledState] = useState(false);
  const [renderOptions, setRenderOptionsState] = useState<ViewerRenderOptions>({
    ambientOcclusion: false,
    shadows: false,
    transparency: false,
    edgeEnhancement: false,
    depthCue: true,
  });
  const [measurementMode, setMeasurementModeState] = useState<MeasurementMode>("none");
  const [focusResidueQuery, setFocusResidueQueryState] = useState("");
  const [selectedResidueKey, setSelectedResidueKeyState] = useState<string | null>(null);
  const [hoverChainId, setHoverChainIdState] = useState<string | null>(null);
  const [reprGeneration, setReprGeneration] = useState(0);
  const [showContactsOverlay, setShowContactsOverlayState] = useState(false);
  const [msaVizBinding, setMsaVizBindingState] = useState<MsaVizBinding | null>(null);
  const [molecularFocus, setMolecularFocusState] = useState<MolecularFocusContext | null>(null);
  const [entryHint, setEntryHint] = useState<RcsbEntryHint | null>(null);

  const stageRef = useRef<Stage | null>(null);
  const structureComponentRef = useRef<StructureComponent | null>(null);
  const viewportShellRef = useRef<HTMLDivElement | null>(null);
  const colorBeforeConfidenceRef = useRef<VizColorSchemeId | null>(null);

  const registerStage = useCallback((s: Stage | null) => {
    stageRef.current = s;
  }, []);

  const registerStructureComponent = useCallback((sc: StructureComponent | null) => {
    structureComponentRef.current = sc;
  }, []);

  const setViewportShell = useCallback((el: HTMLDivElement | null) => {
    viewportShellRef.current = el;
  }, []);

  const setHoverChainId = useCallback((id: string | null) => {
    setHoverChainIdState(id);
  }, []);

  const requestReprRefresh = useCallback(() => {
    setReprGeneration((g) => g + 1);
  }, []);

  const setMsaVizBinding = useCallback(
    (b: MsaVizBinding | null) => {
      setMsaVizBindingState(b);
      setMsaNglBindingRef(b);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setRepresentation = useCallback(
    (r: VizRepresentationId) => {
      setRepresentationState(r);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setColorScheme = useCallback(
    (c: VizColorSchemeId) => {
      if (
        (c === "msa_entropy" || c === "msa_gap") &&
        !msaVizHasResidueMaps(msaVizBinding)
      ) {
        toast.message("MSA coloring", {
          description: "Run MSA Search, then load a matching structure (same query chain).",
        });
      }
      setColorSchemeState(c);
      requestReprRefresh();
    },
    [requestReprRefresh, msaVizBinding],
  );

  const setIsolateChainId = useCallback(
    (id: string | null) => {
      setIsolateChainIdState(id);
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const setChainVisibilityNGL = useCallback(
    (chainId: string, visible: boolean) => {
      setStructureModel((prev) => {
        if (!prev) return prev;
        const chains = prev.chains.map((c) => (c.id === chainId ? { ...c, visible } : c));
        const sc = structureComponentRef.current;
        if (sc) {
          const show = chains.filter((c) => c.visible);
          try {
            if (show.length === 0 || show.length === chains.length) {
              sc.setSelection("");
            } else {
              sc.setSelection(show.map((c) => `:${c.id}`).join(" or "));
            }
          } catch {
            toast.message("Visibility", { description: "Selection update skipped." });
          }
        }
        requestReprRefresh();
        return { ...prev, chains };
      });
    },
    [requestReprRefresh],
  );

  const setSpinEnabled = useCallback((v: boolean) => {
    setSpinEnabledState(v);
    const st = stageRef.current;
    if (!st) return;
    try {
      st.setSpin(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setRenderOptions = useCallback((p: Partial<ViewerRenderOptions>) => {
    setRenderOptionsState((o) => {
      const n = { ...o, ...p };
      const st = stageRef.current;
      if (st && p.depthCue !== undefined) {
        try {
          st.setParameters({
            // Relative to scene bbox: keep fog only near the far edge so large assemblies stay visible.
            fogNear: n.depthCue ? 88 : 100,
            fogFar: 100,
          } as never);
        } catch {
          /* ignore */
        }
      }
      return n;
    });
  }, []);

  const setMeasurementMode = useCallback((m: MeasurementMode) => {
    setMeasurementModeState(m);
    if (m !== "none") {
      toast.message("Measurement", { description: `${m} — use NGL picking in viewport` });
    }
  }, []);

  /** New entry — clear isolate so a stale :chain from a prior structure does not hide everything. */
  React.useEffect(() => {
    setIsolateChainIdState(null);
    setShowContactsOverlayState(false);
    setMolecularFocusState(null);
  }, [proteinSelection ? proteinSelectionKey(proteinSelection) : null]);

  React.useEffect(() => {
    let cancelled = false;
    const sel = proteinSelection;
    if (!sel || sel.source === "file") {
      setEntryHint(null);
      return;
    }
    const pdbRaw =
      sel.source === "rcsb"
        ? sel.id
        : sel.pdbIds?.find((id) => /^[0-9][A-Z0-9]{3}$/i.test(id.trim()));
    if (!pdbRaw) {
      setEntryHint(null);
      return;
    }
    void fetchRcsbEntryHint(pdbRaw).then((h) => {
      if (!cancelled) setEntryHint(h);
    });
    return () => {
      cancelled = true;
    };
  }, [proteinSelection ? proteinSelectionKey(proteinSelection) : null]);

  const setFocusResidueQuery = useCallback((q: string) => {
    setFocusResidueQueryState(q);
  }, []);

  const setSelectedResidueKey = useCallback((k: string | null) => {
    setSelectedResidueKeyState(k);
  }, []);

  const setMolecularFocus = useCallback(
    (ctx: MolecularFocusContext | null) => {
      setMolecularFocusState(ctx);
      if (ctx?.primary && (ctx.primary.type === "atom" || ctx.primary.type === "ligand")) {
        setSelectedResidueKeyState(residueKeyFromPick(ctx.primary.chainId, ctx.primary.resno));
      }
      requestReprRefresh();
    },
    [requestReprRefresh],
  );

  const clearMolecularFocus = useCallback(() => {
    setMolecularFocusState(null);
    requestReprRefresh();
  }, [requestReprRefresh]);

  const runViewerCommand = useCallback(
    (cmdId: string) => {
      const sc = structureComponentRef.current;
      const st = stageRef.current;
      switch (cmdId) {
        case "repr.cartoon":
          setRepresentation("cartoon");
          break;
        case "repr.surface":
          setRepresentation("surface");
          break;
        case "repr.ballstick":
          setRepresentation("ball+stick");
          break;
        case "repr.rope":
          setRepresentation("rope");
          break;
        case "repr.ribbon":
          setRepresentation("ribbon");
          break;
        case "repr.line":
          setRepresentation("line");
          break;
        case "repr.wireframe":
          setRepresentation("wireframe");
          break;
        case "repr.spacefill":
          setRepresentation("spacefill");
          break;
        case "isolate.B":
          setIsolateChainId("B");
          break;
        case "isolate.A":
          setIsolateChainId("A");
          break;
        case "isolate.clear":
          setIsolateChainId(null);
          break;
        case "color.chainid":
          setColorScheme("chainid");
          break;
        case "color.residueindex":
          setColorScheme("residueindex");
          break;
        case "color.hydrophobicity":
          setColorScheme("hydrophobicity");
          break;
        case "color.bfactor":
          setColorScheme("bfactor");
          break;
        case "color.bfactor.gray":
          setColorScheme("bfactor_gray");
          break;
        case "color.electrostatic":
          setColorScheme("electrostatic");
          break;
        case "color.msa.entropy":
          setColorScheme("msa_entropy");
          break;
        case "color.msa.gap":
          setColorScheme("msa_gap");
          break;
        case "overlay.confidence.toggle": {
          setColorSchemeState((prev) => {
            const isConf = prev === "bfactor" || prev === "bfactor_gray";
            if (isConf) {
              const next = colorBeforeConfidenceRef.current ?? "chainid";
              colorBeforeConfidenceRef.current = null;
              return next;
            }
            colorBeforeConfidenceRef.current = prev;
            return "bfactor_gray";
          });
          requestReprRefresh();
          break;
        }
        case "view.spin.toggle":
          setSpinEnabledState((s) => {
            const n = !s;
            try {
              stageRef.current?.setSpin(n);
            } catch {
              /* */
            }
            return n;
          });
          break;
        case "view.center":
        case "view.fit.structure":
          nglFitStructure(st, sc);
          break;
        case "view.reset":
          nglResetView(st);
          break;
        case "view.fit.selection":
          nglFitSelection(st, sc, isolateChainId, selectedResidueKey, molecularFocus?.primarySele);
          break;
        case "view.fullscreen.toggle": {
          const el = viewportShellRef.current;
          if (!el) {
            toast.message("Viewport", { description: "Fullscreen target not mounted." });
            break;
          }
          void (async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await el.requestFullscreen();
            } catch {
              toast.message("Fullscreen", { description: "Request was blocked or unsupported." });
            }
          })();
          break;
        }
        case "render.ao.toggle":
          setRenderOptionsState((o) => {
            const ambientOcclusion = !o.ambientOcclusion;
            toast.message("Ambient occlusion", {
              description: ambientOcclusion ? "Flag on (NGL parameter wiring pending)" : "Off",
            });
            return { ...o, ambientOcclusion };
          });
          break;
        case "export.cif":
          void (async () => {
            try {
              const sel = proteinSelection;
              if (!sel) {
                toast.message("Export", { description: "No structure loaded." });
                return;
              }
              await downloadStructureCoordinates(sel);
              toast.success("Structure download started");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Export failed");
            }
          })();
          break;
        case "screenshot": {
          const ok = nglScreenshotToFile(st);
          if (ok) toast.success("Viewport PNG");
          else toast.error("Screenshot failed");
          break;
        }
        case "overlay.contacts.enable":
          setShowContactsOverlayState(true);
          requestReprRefresh();
          break;
        case "analysis.interactions":
        case "overlay.contacts.toggle":
          setShowContactsOverlayState((v) => !v);
          break;
        default:
          break;
      }
      if (cmdId.startsWith("focus.residue.") && sc) {
        const num = cmdId.split(".").pop();
        if (num) {
          try {
            sc.autoView(num, 0);
          } catch {
            /* */
          }
        }
      }
      if (cmdId.startsWith("isolate.chain.")) {
        const id = cmdId.slice("isolate.chain.".length).trim();
        if (id) setIsolateChainId(id === "clear" ? null : id);
      }
    },
    [
      setRepresentation,
      setIsolateChainId,
      setColorScheme,
      isolateChainId,
      selectedResidueKey,
      molecularFocus,
      proteinSelection,
      requestReprRefresh,
    ],
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        proteinSelection?: ProteinSelection;
        representation?: VizRepresentationId;
        colorScheme?: VizColorSchemeId;
      };
      if (data.proteinSelection && data.proteinSelection.source !== "file") {
        setProteinSelection(data.proteinSelection);
      }
      if (data.representation) setRepresentationState(data.representation);
      if (data.colorScheme) setColorSchemeState(data.colorScheme);
    } catch {
      /* ignore */
    }
  }, []);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            proteinSelection: proteinSelection?.source === "file" ? undefined : proteinSelection,
            representation,
            colorScheme,
          }),
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [proteinSelection, representation, colorScheme]);

  const value = useMemo<ViewerContextValue>(
    () => ({
      proteinSelection,
      setProteinSelection,
      structureModel,
      setStructureModel,
      representation,
      setRepresentation,
      colorScheme,
      setColorScheme,
      isolateChainId,
      setIsolateChainId,
      setChainVisibilityNGL,
      spinEnabled,
      setSpinEnabled,
      renderOptions,
      setRenderOptions,
      measurementMode,
      setMeasurementMode,
      focusResidueQuery,
      setFocusResidueQuery,
      selectedResidueKey,
      setSelectedResidueKey,
      molecularFocus,
      setMolecularFocus,
      clearMolecularFocus,
      entryHint,
      hoverChainId,
      setHoverChainId,
      viewportShellRef,
      setViewportShell,
      stageRef,
      structureComponentRef,
      registerStage,
      registerStructureComponent,
      requestReprRefresh,
      reprGeneration,
      showContactsOverlay,
      msaVizBinding,
      setMsaVizBinding,
      runViewerCommand,
    }),
    [
      proteinSelection,
      structureModel,
      representation,
      colorScheme,
      isolateChainId,
      spinEnabled,
      renderOptions,
      measurementMode,
      focusResidueQuery,
      selectedResidueKey,
      molecularFocus,
      entryHint,
      hoverChainId,
      registerStage,
      registerStructureComponent,
      requestReprRefresh,
      reprGeneration,
      showContactsOverlay,
      msaVizBinding,
      setRepresentation,
      setColorScheme,
      setIsolateChainId,
      setChainVisibilityNGL,
      setSpinEnabled,
      setRenderOptions,
      setMeasurementMode,
      setFocusResidueQuery,
      setSelectedResidueKey,
      setMolecularFocus,
      clearMolecularFocus,
      setHoverChainId,
      setViewportShell,
      setMsaVizBinding,
      runViewerCommand,
    ],
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}

export function useViewerOptional(): ViewerContextValue | null {
  return useContext(ViewerContext);
}
