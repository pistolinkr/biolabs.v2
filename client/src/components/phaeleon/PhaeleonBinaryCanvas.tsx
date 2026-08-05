import React from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import PhaeleonBinaryAskDock from "@/components/phaeleon/PhaeleonBinaryAskDock";
import {
  AnalysisLoadingState,
  AnalysisReportBody,
} from "@/components/phaeleon/PhaeleonAnalysisReportContent";
import { PHAELEON_ANALYSIS_BAR_ANCHOR } from "@/components/phaeleon/PhaeleonAnalysisPanel";
import { usePhaeleonAnalysisReport } from "@/hooks/usePhaeleonAnalysisReport";
import { cn } from "@/lib/utils";

const BINARY_ASK_DOCK_SPRING = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.9 };

/** Binary preset — result card + inline Binary ask dock (Pencil: Phaeleon result 2/3). */
export default function PhaeleonBinaryCanvas() {
  const { t } = useTranslation("phaeleon");
  const {
    analysis,
    report,
    reportPending,
    emptyMode,
    showLocalizedReveal,
    initialAnalysisPending,
  } = usePhaeleonAnalysisReport();

  const reportLoading = initialAnalysisPending || (reportPending && !report);
  const showEmpty = emptyMode !== "none" && !reportPending && !initialAnalysisPending;
  const showReport = Boolean(analysis && report && !reportPending);
  const showResultShell = !showEmpty;

  return (
    <main
      data-tool-bottom-bar-anchor={PHAELEON_ANALYSIS_BAR_ANCHOR}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background"
    >
      {showEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <p className="max-w-md text-center text-sm text-muted-foreground">{t("layout.binaryEmpty")}</p>
        </div>
      ) : showResultShell ? (
        <LayoutGroup id="phaeleon-binary-canvas">
          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-4">
            <motion.div
              layout
              transition={BINARY_ASK_DOCK_SPRING}
              className={cn(
                "workstation-scroll-region flex min-h-0 w-full flex-col overflow-y-auto",
                "rounded-[20px] border border-border bg-card px-4 py-0",
                "min-h-0 flex-1",
              )}
            >
              {reportLoading ? (
                <AnalysisLoadingState slim />
              ) : (
                <AnalysisReportBody
                  report={report ?? undefined}
                  source={analysis ?? undefined}
                  emptyMode={emptyMode}
                  reveal={showLocalizedReveal}
                  flushVertical
                />
              )}
            </motion.div>

            <AnimatePresence initial={false}>
              {showReport ? (
                <motion.div
                  key="binary-ask-dock"
                  layout
                  initial={{ opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 32 }}
                  transition={BINARY_ASK_DOCK_SPRING}
                  className="w-full shrink-0 overflow-hidden"
                >
                  <PhaeleonBinaryAskDock />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      ) : null}
    </main>
  );
}
