import { Camera, Download, Fullscreen } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@/contexts/ViewerContext";
import { cn } from "@/lib/utils";

export function RailBtn({
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
        "flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
        active && "text-foreground underline decoration-foreground underline-offset-4",
      )}
    >
      {children}
    </button>
  );
}

/** Viewport I/O controls. */
export default function ViewportLeftToolRail() {
  const { t } = useTranslation("viewport");
  const { runViewerCommand } = useViewer();

  return (
    <div className="flex w-11 shrink-0 flex-col gap-1 rounded-br-[24px] border-r border-border bg-background px-1.5 py-1.5">
      <RailBtn title={t("rail.screenshot")} onClick={() => runViewerCommand("screenshot")}>
        <Camera className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title={t("rail.exportCoords")} onClick={() => runViewerCommand("export.cif")}>
        <Download className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
      <RailBtn title={t("rail.fullscreen")} onClick={() => runViewerCommand("view.fullscreen.toggle")}>
        <Fullscreen className="size-3.5" strokeWidth={1.25} />
      </RailBtn>
    </div>
  );
}
