import React from "react";
import { useTranslation } from "react-i18next";
import {
  AnalysisFailedState,
  AnalysisLoadingState,
  AnalysisReportBody,
  AnalysisRiskBadge,
  PairTitle,
} from "@/components/phaeleon/PhaeleonAnalysisReportContent";
import { PhaeleonPanelHeader, phaeleonPanel } from "@/components/phaeleon/phaeleonPanelChrome";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { usePhaeleonAnalysisReport } from "@/hooks/usePhaeleonAnalysisReport";
import { cn } from "@/lib/utils";

/** Floating tool bar centers on this node (Phaeleon). */
export const PHAELEON_ANALYSIS_BAR_ANCHOR = "phaeleon-analysis";

function analysisPanelProps(className?: string) {
  return {
    "data-tool-bottom-bar-anchor": PHAELEON_ANALYSIS_BAR_ANCHOR,
    className: cn(phaeleonPanel.shell, "h-full min-h-0 min-w-0 flex-1", className),
  } as const;
}

export default function PhaeleonAnalysisPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation("phaeleon");
  const { setInspectorSlot } = usePhaeleon();
  const {
    drug1,
    drug2,
    analysis,
    report,
    reportPending,
    pairReady,
    emptyMode,
    showLocalizedReveal,
    analysisTranslationFailed,
    needsLocalizedReport,
  } = usePhaeleonAnalysisReport();

  const headerTitle = pairReady ? (
    <PairTitle
      drug1={drug1!.name}
      drug2={drug2!.name}
      onSelectDrug1={() => setInspectorSlot("drug1")}
      onSelectDrug2={() => setInspectorSlot("drug2")}
    />
  ) : (
    t("panels.analysis.title")
  );

  const headerTrailing =
    analysis && !reportPending ? (
      <AnalysisRiskBadge risk={analysis.risk} label={t(`risk.${analysis.risk}`)} />
    ) : pairReady && reportPending ? (
      <AnalysisRiskBadge risk="unknown" label={t("panels.analysis.loading")} />
    ) : null;

  if (reportPending && !report) {
    return (
      <main {...analysisPanelProps()}>
        {!embedded ? (
          <PhaeleonPanelHeader kicker={t("panels.analysis.kicker")} title={headerTitle} trailing={headerTrailing} />
        ) : null}
        <AnalysisLoadingState />
      </main>
    );
  }

  if (analysisTranslationFailed && needsLocalizedReport) {
    return (
      <main {...analysisPanelProps()}>
        <PhaeleonPanelHeader kicker={t("panels.analysis.kicker")} title={headerTitle} trailing={headerTrailing} />
        <div className="min-h-0 flex-1 p-4">
          <AnalysisFailedState mode="translation" />
        </div>
      </main>
    );
  }

  return (
    <main {...analysisPanelProps()}>
      {!embedded ? (
        <PhaeleonPanelHeader
          kicker={t("panels.analysis.kicker")}
          title={
            report ? (
              <PairTitle
                drug1={report.drug1}
                drug2={report.drug2}
                onSelectDrug1={() => setInspectorSlot("drug1")}
                onSelectDrug2={() => setInspectorSlot("drug2")}
              />
            ) : (
              headerTitle
            )
          }
          trailing={headerTrailing}
        />
      ) : null}
      <AnalysisReportBody
        report={report ?? undefined}
        source={analysis ?? undefined}
        emptyMode={emptyMode}
        reveal={showLocalizedReveal}
        embedded={embedded}
      />
    </main>
  );
}
