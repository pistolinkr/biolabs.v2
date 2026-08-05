import React, { type ReactNode } from "react";
import ViewportBottomInfoStrip from "@/components/viewport/ViewportBottomInfoStrip";
import ViewportLeftToolRail from "@/components/viewport/ViewportLeftToolRail";
import ViewportTopToolbar from "@/components/viewport/ViewportTopToolbar";

/**
 * RCSB-inspired viewport frame: top scientific toolbar, left tool rail, main canvas,
 * with the tool bottom bar overlaid so the canvas bottom edge meets the display bottom.
 */
export default function ViewportChrome({ children }: { children: ReactNode }) {
  return (
    <div className="workbench-viewport-frame flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ViewportTopToolbar />
      {/*
        L-frame: rail + canvas fill to the bottom. Footer docks as an overlay on the
        canvas so the canvas bottom border sits flush with the display edge.
      */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <ViewportLeftToolRail />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-bl-[24px]">
          {children}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-visible">
            {/* overflow-visible: BOA5 reply floats above the docked pill */}
            <div className="pointer-events-auto overflow-visible rounded-tl-[24px]">
              <ViewportBottomInfoStrip placement="footer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
