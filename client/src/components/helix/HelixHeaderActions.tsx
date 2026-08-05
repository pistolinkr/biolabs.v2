import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";
import HeaderExportMenu from "@/components/HeaderExportMenu";
import { useViewer } from "@/contexts/ViewerContext";
import { buildWorkspaceSnapshot, persistWorkspaceSnapshot } from "@/lib/workspaceSnapshot";
import { cn } from "@/lib/utils";

const iconBtn =
  "rounded-full border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground";

export function useHelixWorkspaceShortcuts(onCommandPaletteOpen: () => void) {
  const { t } = useTranslation("header");
  const viewer = useViewer();

  const saveWorkspace = useCallback(() => {
    const snapshot = buildWorkspaceSnapshot({
      proteinSelection: viewer.proteinSelection,
      representation: viewer.representation,
      colorScheme: viewer.colorScheme,
      isolateChainId: viewer.isolateChainId,
      contextContactRadiusAngstrom: viewer.contextContactRadiusAngstrom,
      selectedResidueKey: viewer.selectedResidueKey,
    });
    persistWorkspaceSnapshot(snapshot);
    toast.success(t("saveSuccess"), {
      description: snapshot.viewer.proteinSelection
        ? t("saveSuccessWithProtein", {
            source: snapshot.viewer.proteinSelection.source,
            id: snapshot.viewer.proteinSelection.id,
          })
        : t("saveSuccessGeneric"),
    });
  }, [viewer, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPaletteOpen();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveWorkspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPaletteOpen, saveWorkspace]);

  return saveWorkspace;
}

export default function HelixHeaderActions({ onSave }: { onSave: () => void }) {
  const { t } = useTranslation("header");

  return (
    <>
      <button type="button" onClick={onSave} title={t("saveWorkspace")} className={iconBtn}>
        <Save size={14} />
      </button>
      <HeaderExportMenu>
        <button type="button" title={t("exportMenu")} className={iconBtn}>
          <Download size={14} />
        </button>
      </HeaderExportMenu>
    </>
  );
}
