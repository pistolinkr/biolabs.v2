import React from "react";
import { useViewer } from "@/contexts/ViewerContext";
import type { VizColorSchemeId, VizRepresentationId } from "@/lib/nglRepr";

const REPR: { id: VizRepresentationId; label: string }[] = [
  { id: "cartoon", label: "Cartoon" },
  { id: "rope", label: "Ribbon" },
  { id: "surface", label: "Surface" },
  { id: "ball+stick", label: "Ball+Stick" },
  { id: "spacefill", label: "Spheres" },
  { id: "line", label: "Wireframe" },
];

const COLORS: { id: VizColorSchemeId; label: string }[] = [
  { id: "chainid", label: "Chain" },
  { id: "residueindex", label: "Residue" },
  { id: "hydrophobicity", label: "Hydrophobicity" },
  { id: "bfactor", label: "B-factor / pLDDT" },
  { id: "bfactor_gray", label: "Confidence (grey ramp)" },
  { id: "electrostatic", label: "Electrostatic" },
  { id: "msa_entropy", label: "MSA conservation (entropy)" },
  { id: "msa_gap", label: "MSA gap fraction" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2A2A2A] py-2">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8A8A]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function RowBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-2 py-1 text-left font-mono text-[10px] uppercase tracking-wide transition-colors ${
        active
          ? "border-[#F2F2F2] bg-[#1C1C1C] text-[#F2F2F2]"
          : "border-[#2A2A2A] bg-[#111111] text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-[#C8C8C8]"
      }`}
    >
      {label}
    </button>
  );
}

export default function VisualizationControlPanel() {
  const {
    representation,
    setRepresentation,
    colorScheme,
    setColorScheme,
    renderOptions,
    setRenderOptions,
    spinEnabled,
    setSpinEnabled,
    measurementMode,
    setMeasurementMode,
    showContactsOverlay,
    runViewerCommand,
  } = useViewer();

  return (
    <div className="min-h-0 flex-1 overflow-y-hidden px-2 pb-3 pt-1">
      <Section title="Representation">
        <div className="grid grid-cols-2 gap-1">
          {REPR.map((r) => (
            <RowBtn
              key={r.id}
              active={representation === r.id}
              label={r.label}
              onClick={() => setRepresentation(r.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Coloring">
        <div className="space-y-1">
          {COLORS.map((c) => (
            <RowBtn
              key={c.id}
              active={colorScheme === c.id}
              label={c.label}
              onClick={() => setColorScheme(c.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Rendering">
        {(
          [
            ["ambientOcclusion", "AO (stub)", renderOptions.ambientOcclusion] as const,
            ["shadows", "Shadows (stub)", renderOptions.shadows] as const,
            ["transparency", "Transparency", renderOptions.transparency] as const,
            ["edgeEnhancement", "Edge enhancement (stub)", renderOptions.edgeEnhancement] as const,
            ["depthCue", "Depth cue / fog", renderOptions.depthCue] as const,
          ] as const
        ).map(([key, label, val]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between gap-2 font-mono text-[10px] text-[#B0B0B0]"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={val}
              onChange={() => setRenderOptions({ [key]: !val })}
              className="accent-[#7C8A99]"
            />
          </label>
        ))}
      </Section>

      <Section title="Analysis overlays">
        <label className="flex cursor-pointer items-center justify-between font-mono text-[10px] text-[#B0B0B0]">
          <span>Contact pairs (NGL)</span>
          <input
            type="checkbox"
            checked={showContactsOverlay}
            onChange={() => runViewerCommand("overlay.contacts.toggle")}
            className="accent-[#7C8A99]"
          />
        </label>
        <p className="font-mono text-[9px] leading-tight text-[#6A6A6A]">
          RMSD / clash scoring still server-local (stub).
        </p>
      </Section>

      <Section title="Simulation">
        <label className="flex cursor-pointer items-center justify-between font-mono text-[10px] text-[#B0B0B0]">
          <span>Spin</span>
          <input
            type="checkbox"
            checked={spinEnabled}
            onChange={() => setSpinEnabled(!spinEnabled)}
            className="accent-[#7C8A99]"
          />
        </label>
        <p className="font-mono text-[9px] leading-tight text-[#6A6A6A]">
          Trajectory playback requires trajectory file (not loaded).
        </p>
      </Section>

      <Section title="Measurement">
        {(["none", "distance", "angle", "dihedral"] as const).map((m) => (
          <RowBtn
            key={m}
            active={measurementMode === m}
            label={m.toUpperCase()}
            onClick={() => setMeasurementMode(m)}
          />
        ))}
      </Section>
    </div>
  );
}
