import {
  Camera,
  Focus,
  Fullscreen,
  Maximize2,
  Ruler,
  Sun,
  SwitchCamera,
  Download,
} from "lucide-react";
import React from "react";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

function TbBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center border border-[#2A2A2A] bg-[#111111]/95 text-[#9A9A9A] transition-colors hover:border-[#4A4A4A] hover:text-[#F2F2F2]",
        active && "border-[#5A6A6A] text-[#F2F2F2]",
      )}
    >
      {children}
    </button>
  );
}

/** Floating monochrome tools — OpenFold / PyMOL-adjacent idiom. */
export default function ViewportFloatingToolbar() {
  const {
    runViewerCommand,
    measurementMode,
    setMeasurementMode,
    renderOptions,
    setRenderOptions,
  } = useViewer();

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-col gap-0.5 border border-[#2A2A2A] bg-[#0A0A0A]/90 p-0.5 shadow-none">
      <TbBtn title="Reset camera" onClick={() => runViewerCommand("view.reset")}>
        <SwitchCamera className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn title="Fit structure" onClick={() => runViewerCommand("view.fit.structure")}>
        <Maximize2 className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn title="Fit selection / isolate" onClick={() => runViewerCommand("view.fit.selection")}>
        <Focus className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn title="Screenshot PNG" onClick={() => runViewerCommand("screenshot")}>
        <Camera className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn title="Export coordinates (remote)" onClick={() => runViewerCommand("export.cif")}>
        <Download className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn title="Fullscreen" onClick={() => runViewerCommand("view.fullscreen.toggle")}>
        <Fullscreen className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn
        title="Depth cue"
        active={renderOptions.depthCue}
        onClick={() => setRenderOptions({ depthCue: !renderOptions.depthCue })}
      >
        <Sun className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
      <TbBtn
        title="Measurement mode — picks use distance/angle tools; contextual focus is paused while active."
        active={measurementMode !== "none"}
        onClick={() =>
          setMeasurementMode(
            measurementMode === "none" ? "distance" : measurementMode === "distance" ? "angle" : "none",
          )
        }
      >
        <Ruler className="size-3.5" strokeWidth={1.25} />
      </TbBtn>
    </div>
  );
}
