import React, { useMemo, useState } from "react";
import { entityKindLabel, groupChainsByEntityKind, type BiomolecularEntityKind } from "@/lib/biomolecularEntities";
import { useViewer, type ChainModel } from "@/contexts/ViewerContext";
import { useAiJobs } from "@/contexts/AiJobsContext";
import Evo2AnnotationPanel from "@/components/workbench/Evo2AnnotationPanel";
import GenerativeWorkspacePanel from "@/components/workbench/GenerativeWorkspacePanel";

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
    <div className="border-b border-[#2A2A2A]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#F2F2F2] hover:bg-[#141414]"
      >
        {title}
        <span className="text-[#6A6A6A]">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="space-y-0.5 px-2 pb-2 pt-0">{children}</div> : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 font-mono text-[10px] leading-tight text-[#C8C8C8]">
      <span className="w-[40%] shrink-0 uppercase tracking-wide text-[#8A8A8A]">{k}</span>
      <span className="min-w-0 flex-1 text-[#F2F2F2]">{v}</span>
    </div>
  );
}

export default function RightWorkstationPanel() {
  const {
    proteinSelection,
    structureModel,
    colorScheme,
    isolateChainId,
    runViewerCommand,
    showContactsOverlay,
    molecularFocus,
    clearMolecularFocus,
    entryHint,
  } = useViewer();
  const { contactsJobHint, dismissContactsJobHint } = useAiJobs();
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
    const uni = sel.source === "uniprot" ? sel.id : sel.pdbIds?.length ? "(see PDB)" : "—";
    return {
      name: sel.label.split("—")[0]?.trim() ?? sel.id,
      organism: "—",
      uniprot: uni,
      pdb,
      resolution: "—",
      method:
        sel.source === "file"
          ? "LOCAL FILE"
          : sel.preferredStructure === "alphafold"
            ? "PREDICTION (AFDB)"
            : "—",
    };
  }, [proteinSelection]);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111111]">
      <div className="shrink-0 border-b border-[#2A2A2A] px-2 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A8A]">
        Inspector
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {contactsJobHint && molecularFocus && !showContactsOverlay ? (
          <div className="mx-2 mt-2 border border-[#4A3A2A] bg-[#1A1510] px-2 py-1.5 font-mono text-[9px] text-[#D8C8A8]">
            <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-[#9A8A6A]">Job · Interaction hint</div>
            <div className="mb-1">Last AI job suggests reviewing contacts around your molecular focus.</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  runViewerCommand("overlay.contacts.enable");
                  dismissContactsJobHint();
                }}
                className="border border-[#5A4A3A] px-2 py-0.5 text-[8px] uppercase tracking-wide hover:border-[#7A6A5A] hover:text-[#F2F2F2]"
              >
                Enable contacts overlay
              </button>
              <button
                type="button"
                onClick={() => dismissContactsJobHint()}
                className="border border-[#3A3A3A] px-2 py-0.5 text-[8px] uppercase tracking-wide text-[#8A8A8A] hover:border-[#5A5A5A]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <Section title="Basic info">
          <Row k="Protein" v={basic.name} />
          <Row k="Organism" v={basic.organism} />
          <Row k="UniProt" v={basic.uniprot} />
          <Row k="PDB" v={basic.pdb} />
          <Row k="RCSB title" v={entryHint?.title ?? "—"} />
          <Row k="Deposit" v={entryHint?.depositDate ?? "—"} />
          <Row k="Resolution" v={basic.resolution} />
          <Row k="Method" v={basic.method} />
        </Section>

        <Section title="Molecular focus" defaultOpen>
          {molecularFocus ? (
            <>
              <Row k="Primary" v={molecularFocus.primary.label} />
              <Row k="Type" v={molecularFocus.primary.type} />
              <Row k="Radius" v={`${molecularFocus.radiusAngstrom} Å`} />
              <Row k="Chains in shell" v={molecularFocus.emphasizedChainIds.join(", ") || "—"} />
              <Row
                k="Shell atoms"
                v={molecularFocus.neighborhoodAtomCount != null ? String(molecularFocus.neighborhoodAtomCount) : "—"}
              />
              <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-1 font-mono text-[8px] text-[#7A7A7A]">
                <div className="mb-0.5 text-[#6A6A6A]">neighborhood sele</div>
                <div className="break-all text-[#B0B0B0]">{molecularFocus.neighborhoodSele}</div>
              </div>
              <button
                type="button"
                onClick={() => clearMolecularFocus()}
                className="mt-1 w-full border border-[#2A2A2A] bg-[#141414] py-1 font-mono text-[9px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
              >
                Clear focus overlay
              </button>
            </>
          ) : (
            <div className="font-mono text-[9px] leading-snug text-[#6A6A6A]">
              Click atom / residue / bond in the viewport. Contextual neighbors highlight within ~5&nbsp;Å. Measurement
              mode (ruler) pauses auto-expansion.
            </div>
          )}
        </Section>

        <Section title="Structure stats">
          <Row k="Atoms" v={structure.atoms} />
          <Row k="Residues" v={structure.residues} />
          <Row k="Chains" v={structure.chains} />
          <Row k="Ligands" v={structure.ligands} />
          <Row k="Missing" v={structure.missing} />
        </Section>

        <Section title="Entity inspector">
          <Row k="Lanes" v={polymerMock.entityLanes} />
          <Row k="Assembly" v="placeholder — import BIounit metadata" />
        </Section>

        <Section title="Biological" defaultOpen={false}>
          <Row k="Function" v="not fetched" />
          <Row k="Family" v="—" />
          <Row k="Localization" v="—" />
          <Row k="Binding" v="—" />
        </Section>

        <Section title="Confidence" defaultOpen>
          <div className="space-y-2 border border-[#2A2A2A] bg-[#0A0A0A] p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#6A6A6A]">
              pLDDT / B-factor ramp
            </div>
            <div
              className="h-2.5 w-full border border-[#2A2A2A]"
              style={{
                background:
                  "linear-gradient(90deg, #303030 0%, #6A6F74 35%, #9EA8B0 65%, #D2D6DC 100%)",
              }}
            />
            <div className="flex justify-between font-mono text-[8px] text-[#5A5A5A]">
              <span>Disordered</span>
              <span>Uncertain</span>
              <span>Confident</span>
            </div>
            <Row k="Source" v={proteinSelection?.preferredStructure === "alphafold" ? "AFDB (B-factor)" : "Experimental B / N/A"} />
            <Row k="Active scheme" v={colorScheme} />
            <button
              type="button"
              onClick={() => runViewerCommand("overlay.confidence.toggle")}
              className="w-full border border-[#2A2A2A] bg-[#141414] py-1 font-mono text-[9px] uppercase tracking-wide text-[#9A9A9A] hover:border-[#5A5A5A] hover:text-[#F2F2F2]"
            >
              {colorScheme === "bfactor" || colorScheme === "bfactor_gray"
                ? "Clear heatmap"
                : "Apply confidence heatmap"}
            </button>
          </div>
        </Section>

        <Section title="Polymer / complex" defaultOpen>
          <Row k="Chain IDs" v={polymerMock.subunits} />
          <Row k="Interfaces" v={polymerMock.interfaces} />
          <Row k="H-bonds" v={polymerMock.hbonds} />
          <Row k="Salt bridges" v={polymerMock.salt} />
          <Row k="Hydrophobic" v={polymerMock.hp} />
          <div className="flex flex-col gap-1 py-0.5">
            <span className="w-[40%] font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A]">
              Bio assembly
            </span>
            <select
              value={assemblyPick}
              onChange={(e) => setAssemblyPick(e.target.value)}
              disabled={!structureModel}
              className="border border-[#2A2A2A] bg-[#0A0A0A] px-1.5 py-1 font-mono text-[10px] text-[#F2F2F2] disabled:opacity-40"
            >
              <option value="asu">Asymmetric unit</option>
              <option value="bio1">Biological assembly 1 (RCSB metadata N/A)</option>
              <option value="bio2">Biological assembly 2 (stub)</option>
            </select>
          </div>
          <Row k="Stoichiometry (heuristic)" v={polymerMock.stoich} />
          <Row k="Symmetry" v={polymerMock.symmetry} />
          <Row k="Iface area (Å²)" v={polymerMock.ifaceArea} />
          <Row k="ΔG_bind (mock)" v={polymerMock.bindEnergy} />
          <Row k="Interactions" v={polymerMock.ixnCount} />
        </Section>

        <Section title="Structure analysis" defaultOpen={false}>
          <Row k="RMSD" v="— (reference structure required)" />
          <Row k="Clashes" v="not computed" />
          <Row
            k="Contacts (NGL)"
            v={showContactsOverlay ? "on — distance contact repr" : "off — palette / left panel"}
          />
          <Row k="Interface area" v={polymerMock.ifaceArea} />
        </Section>

        <Section title="EVO2 reasoning" defaultOpen={false}>
          <Evo2AnnotationPanel />
        </Section>

        <Section title="Generative workspace" defaultOpen={false}>
          <GenerativeWorkspacePanel />
        </Section>

        <Section title="Interaction graph" defaultOpen={false}>
          <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-2 font-mono text-[9px] leading-snug text-[#7A7A7A]">
            Graph view (chain–chain edges, ligand spokes) — pipeline not attached. Export interface list from future
            analysis worker.
          </div>
        </Section>

        <Section title="Simulation" defaultOpen={false}>
          <Row k="MD engine" v="not connected" />
          <Row k="Folding run" v="placeholder trajectory slot" />
          <Row k="Docking" v="placeholder pose stack" />
          <Row k="Mutagenesis" v="future variant grid" />
          <p className="font-mono text-[8px] leading-tight text-[#5A5A5A]">
            Types reserved in client/src/lib/futureWorkspace.ts (idle hooks).
          </p>
        </Section>
      </div>
    </div>
  );
}
