import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { entityKindLabel, groupChainsByEntityKind, type BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import { useViewer, type ChainModel } from "@/contexts/ViewerContext";
import PolymerProximityGraph from "@/components/workbench/PolymerProximityGraph";
import WorkstationSelect from "@/components/WorkstationSelect";

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground hover:bg-secondary"
      >
        {title}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-0.5 px-2 pb-2 pt-0">{children}</div> : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 font-mono text-[10px] leading-tight text-foreground">
      <span className="w-[40%] shrink-0 uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="min-w-0 flex-1 text-card-foreground">{v}</span>
    </div>
  );
}

export default function RightWorkstationPanel() {
  const { t } = useTranslation("workbench");
  const {
    proteinSelection,
    structureModel,
    colorScheme,
    isolateChainId,
    runViewerCommand,
    polymerContextSnapshot,
    contextContactRadiusAngstrom,
    polymerInteractionOverlayEnabled,
    setPolymerInteractionOverlayEnabled,
    nucleicBackboneAccentEnabled,
    setNucleicBackboneAccentEnabled,
    requestReprRefresh,
  } = useViewer();
  const [assemblyPick, setAssemblyPick] = useState("asu");

  const basic = useMemo(() => {
    const sel = proteinSelection;
    if (!sel) {
      return {
        name: "—",
        organism: "—",
        uniprot: "—",
        pdb: "—",
        resolution: "—",
        method: "—",
      };
    }
    const pdb = sel.pdbIds?.[0] ?? (sel.source === "rcsb" ? sel.id : "—");
    const uni = sel.source === "uniprot" ? sel.id : sel.pdbIds?.length ? t("metadata.seePdb") : t("metadata.dash");
    return {
      name: sel.label.split("—")[0]?.trim() ?? sel.id,
      organism: t("metadata.dash"),
      uniprot: uni,
      pdb,
      resolution: t("metadata.dash"),
      method:
        sel.source === "file"
          ? t("metadata.localFile")
          : sel.preferredStructure === "alphafold"
            ? t("metadata.prediction")
            : t("metadata.dash"),
    };
  }, [proteinSelection, t]);

  const structure = useMemo(() => {
    if (!structureModel) {
      return {
        atoms: "—",
        residues: "—",
        chains: "—",
        ligands: "—",
        missing: "—",
      };
    }
    return {
      atoms: structureModel.atomCount.toLocaleString(),
      residues: structureModel.residueCount.toLocaleString(),
      chains: String(structureModel.chains.length),
      ligands: "hetero / solvent (NGL)",
      missing: "not parsed",
    };
  }, [structureModel]);

  const polymerMock = {
    subunits: structureModel ? structureModel.chains.map((c: ChainModel) => c.id).join(", ") : "—",
    entityLanes:
      structureModel?.chains
        .map((c: ChainModel) => `${c.id}·${entityKindLabel(c.entityKind)}`)
        .join(" · ") ?? "—",
    interfaces: isolateChainId ? `isolated: ${isolateChainId}` : "full assembly view",
    hbonds: "—",
    salt: "—",
    hp: "—",
    stoich: structureModel
      ? Object.entries(groupChainsByEntityKind(structureModel.chains))
          .map(([k, arr]) =>
            arr?.length ? `${arr.length}×${entityKindLabel(k as BiomolecularEntityKind)}` : null,
          )
          .filter(Boolean)
          .join(" · ") || "—"
      : "—",
    symmetry: "—",
    ifaceArea: "—",
    bindEnergy: "—",
    ixnCount: "—",
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-card text-card-foreground">
      <div className="workbench-panel-nav px-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {t("inspector.title")}
      </div>
      <div className="workstation-scroll-region min-h-0 overflow-y-auto">
        <Section title={t("inspector.sections.basicInfo")}>
          <Row k={t("inspector.rows.protein")} v={basic.name} />
          <Row k={t("inspector.rows.organism")} v={basic.organism} />
          <Row k={t("inspector.rows.uniprot")} v={basic.uniprot} />
          <Row k={t("inspector.rows.pdb")} v={basic.pdb} />
          <Row k={t("inspector.rows.resolution")} v={basic.resolution} />
          <Row k={t("inspector.rows.method")} v={basic.method} />
        </Section>

        <Section title={t("inspector.sections.structureStats")}>
          <Row k={t("inspector.rows.atoms")} v={structure.atoms} />
          <Row k={t("inspector.rows.residues")} v={structure.residues} />
          <Row k={t("inspector.rows.chains")} v={structure.chains} />
          <Row k={t("inspector.rows.ligands")} v={structure.ligands} />
          <Row k={t("inspector.rows.missing")} v={structure.missing} />
        </Section>

        <Section title={t("inspector.sections.polymerContext")}>
          {!polymerContextSnapshot ? (
            <p className="font-mono text-[9px] leading-snug text-muted-foreground">
              {t("inspector.polymerEmpty", { radius: contextContactRadiusAngstrom })}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 py-1 font-mono text-[9px]">
                <label className="flex cursor-pointer items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={polymerInteractionOverlayEnabled}
                    onChange={(e) => {
                      setPolymerInteractionOverlayEnabled(e.target.checked);
                      requestReprRefresh();
                    }}
                    className="accent-accent"
                  />
                  {t("inspector.contactLines")}
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={nucleicBackboneAccentEnabled}
                    onChange={(e) => {
                      setNucleicBackboneAccentEnabled(e.target.checked);
                      requestReprRefresh();
                    }}
                    className="accent-accent"
                  />
                  {t("inspector.nucleicLineAccent")}
                </label>
              </div>
              <Row k={t("inspector.rows.radius")} v={`${polymerContextSnapshot.radiusAngstrom} Å (preset ${contextContactRadiusAngstrom} Å)`} />
              <Row
                k={t("inspector.rows.center")}
                v={`${polymerContextSnapshot.center.x.toFixed(2)}, ${polymerContextSnapshot.center.y.toFixed(2)}, ${polymerContextSnapshot.center.z.toFixed(2)}`}
              />
              <Row k={t("inspector.rows.chains")} v={polymerContextSnapshot.chainsTouched.join(", ") || t("metadata.dash")} />
              <Row k={t("inspector.rows.nucleicChains")} v={polymerContextSnapshot.nucleicChains.join(", ") || t("metadata.dash")} />
              <Row k={t("inspector.rows.residuesProtein")} v={String(polymerContextSnapshot.proteinResidueCount)} />
              <Row k={t("inspector.rows.residuesNucleic")} v={String(polymerContextSnapshot.nucleicResidueCount)} />
              <Row k={t("inspector.rows.residuesOther")} v={String(polymerContextSnapshot.otherResidueCount)} />
              <Row k={t("inspector.rows.codon")} v={t("inspector.codonNa")} />
              <Row
                k={t("inspector.rows.polarContacts")}
                v={t("inspector.polarCandidates", { count: polymerContextSnapshot.candidatePolarContactCount })}
              />
              <Row k={t("inspector.rows.heavyContacts")} v={String(polymerContextSnapshot.candidateHeavyContactCount)} />
              <Row k={t("inspector.rows.phosphatePairs")} v={String(polymerContextSnapshot.candidatePhosphateContactCount)} />
              {polymerContextSnapshot.nearestNucleic ? (
                <Row
                  k={t("inspector.rows.nearestNt")}
                  v={`chain ${polymerContextSnapshot.nearestNucleic.chainId} · PDB ${polymerContextSnapshot.nearestNucleic.pdbResno} · seq #${polymerContextSnapshot.nearestNucleic.stripOrdinal}${polymerContextSnapshot.nearestNucleic.baseLetter ? ` · ${polymerContextSnapshot.nearestNucleic.baseLetter}` : ""}`}
                />
              ) : (
                <Row k={t("inspector.rows.nearestNt")} v={t("inspector.noneInRadius")} />
              )}
              <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">{t("inspector.topPairs")}</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap border border-border bg-background p-1.5 font-mono text-[8px] text-muted-foreground">
                {polymerContextSnapshot.candidatePairSummaries.length
                  ? polymerContextSnapshot.candidatePairSummaries.join("\n")
                  : "—"}
              </pre>
              <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">{t("inspector.proteinSnippets")}</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap border border-border bg-background p-1.5 font-mono text-[9px] text-foreground">
                {Object.keys(polymerContextSnapshot.proteinSnippets).length
                  ? Object.entries(polymerContextSnapshot.proteinSnippets)
                      .map(([c, s]) => `${c}: ${s}`)
                      .join("\n")
                  : "—"}
              </pre>
              <div className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">{t("inspector.nucleicSnippets")}</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap border border-border bg-background p-1.5 font-mono text-[9px] text-foreground">
                {Object.keys(polymerContextSnapshot.nucleicSnippets).length
                  ? Object.entries(polymerContextSnapshot.nucleicSnippets)
                      .map(([c, s]) => `${c}: ${s}`)
                      .join("\n")
                  : "—"}
              </pre>
            </>
          )}
        </Section>

        <Section title={t("inspector.sections.entityInspector")}>
          <Row k={t("inspector.rows.lanes")} v={polymerMock.entityLanes} />
          <Row k={t("inspector.rows.assembly")} v={t("inspector.assemblyPlaceholder")} />
        </Section>

        <Section title={t("inspector.sections.biological")} defaultOpen={false}>
          <Row k={t("inspector.rows.function")} v={t("inspector.notFetched")} />
          <Row k={t("inspector.rows.family")} v={t("metadata.dash")} />
          <Row k={t("inspector.rows.localization")} v={t("metadata.dash")} />
          <Row k={t("inspector.rows.binding")} v={t("metadata.dash")} />
        </Section>

        <Section title={t("inspector.sections.confidence")} defaultOpen>
          <div className="space-y-2 border border-border bg-background p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("inspector.plddtRamp")}
            </div>
            <div
              className="h-2.5 w-full border border-border"
              style={{
                background:
                  "linear-gradient(90deg, #303030 0%, #6A6F74 35%, #9EA8B0 65%, #D2D6DC 100%)",
              }}
            />
            <div className="flex justify-between font-mono text-[8px] text-muted-foreground">
              <span>{t("inspector.disordered")}</span>
              <span>{t("inspector.uncertain")}</span>
              <span>{t("inspector.confident")}</span>
            </div>
            <Row
              k={t("inspector.rows.source")}
              v={proteinSelection?.preferredStructure === "alphafold" ? t("inspector.afdbSource") : t("inspector.experimentalB")}
            />
            <Row k={t("inspector.rows.activeScheme")} v={colorScheme} />
            <button
              type="button"
              onClick={() => runViewerCommand("overlay.confidence.toggle")}
              className="w-full border border-border bg-secondary py-1 font-mono text-[9px] uppercase tracking-wide text-secondary-foreground hover:border-muted-foreground hover:text-foreground"
            >
              {colorScheme === "bfactor" || colorScheme === "bfactor_gray"
                ? t("inspector.clearHeatmap")
                : t("inspector.applyHeatmap")}
            </button>
          </div>
        </Section>

        <Section title={t("inspector.sections.polymerComplex")} defaultOpen>
          <Row k={t("inspector.rows.chainIds")} v={polymerMock.subunits} />
          <Row k={t("inspector.rows.interfaces")} v={polymerMock.interfaces} />
          <Row k={t("inspector.rows.hbonds")} v={polymerMock.hbonds} />
          <Row k={t("inspector.rows.saltBridges")} v={polymerMock.salt} />
          <Row k={t("inspector.rows.hydrophobic")} v={polymerMock.hp} />
          <div className="flex flex-col gap-1 py-0.5">
            <span className="w-[40%] font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("inspector.bioAssembly")}
            </span>
            <WorkstationSelect
              value={assemblyPick}
              onValueChange={setAssemblyPick}
              disabled={!structureModel}
              className="w-full min-w-0"
              align="start"
              options={[
                { value: "asu", label: t("inspector.asu") },
                { value: "bio1", label: t("inspector.bio1") },
                { value: "bio2", label: t("inspector.bio2") },
              ]}
            />
          </div>
          <Row k={t("inspector.rows.stoichiometry")} v={polymerMock.stoich} />
          <Row k={t("inspector.rows.symmetry")} v={polymerMock.symmetry} />
          <Row k={t("inspector.rows.ifaceArea")} v={polymerMock.ifaceArea} />
          <Row k={t("inspector.rows.bindEnergy")} v={polymerMock.bindEnergy} />
          <Row k={t("inspector.rows.interactions")} v={polymerMock.ixnCount} />
        </Section>

        <Section title={t("inspector.sections.interactionGraph")} defaultOpen={false}>
          {!polymerContextSnapshot?.proximityGraphEdges?.length ? (
            <p className="border border-border bg-background p-2 font-mono text-[9px] leading-snug text-muted-foreground">
              {t("inspector.graphEmpty")}
            </p>
          ) : (
            <PolymerProximityGraph
              edges={polymerContextSnapshot.proximityGraphEdges}
              fingerprint={polymerContextSnapshot.contextFingerprint}
            />
          )}
        </Section>

        <Section title={t("inspector.sections.simulation")} defaultOpen={false}>
          <Row k={t("inspector.rows.mdEngine")} v={t("inspector.notConnected")} />
          <Row k={t("inspector.rows.foldingRun")} v={t("inspector.trajectoryPlaceholder")} />
          <Row k={t("inspector.rows.docking")} v={t("inspector.dockingPlaceholder")} />
          <Row k={t("inspector.rows.mutagenesis")} v={t("inspector.mutagenesisPlaceholder")} />
          <p className="font-mono text-[8px] leading-tight text-muted-foreground">{t("inspector.simulationNote")}</p>
        </Section>
      </div>
    </div>
  );
}
