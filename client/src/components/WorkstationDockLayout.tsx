import { DockviewDefaultTab, DockviewReact } from "dockview";
import type { DockviewApi, DockviewReadyEvent, IDockviewPanelProps } from "dockview";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import LeftWorkstationPanel from "@/components/workbench/LeftWorkstationPanel";
import RightWorkstationPanel from "@/components/workbench/RightWorkstationPanel";
import { useLocale } from "@/contexts/LocaleContext";
import { useColorScheme } from "@/contexts/ThemeContext";
import { useWorkstationLayout } from "@/contexts/WorkstationLayoutContext";
import { cn } from "@/lib/utils";
import { DOCK_LAYOUT_STORAGE_KEY } from "@/lib/workstationLayoutStorage";
import {
  PANEL_CENTER,
  PANEL_LEFT,
  PANEL_RIGHT,
  applyDockPanelTitles,
  applyLayoutPreset,
  hideAllGroupHeaders,
  layoutHasCorePanels,
} from "@/lib/workstationPresets";

const CenterSlotContext = createContext<React.ReactNode>(null);

function useCenterSlot() {
  return useContext(CenterSlotContext);
}

/** Close (×) removed; tab drag is disabled via disableDnd on DockviewReact. */
function WorkbenchDockTab(props: React.ComponentProps<typeof DockviewDefaultTab>) {
  return <DockviewDefaultTab {...props} hideClose />;
}

function DockPanelLeft(_props: IDockviewPanelProps) {
  return (
    <div className="workbench-surface flex h-full min-h-0 flex-col overflow-hidden">
      <LeftWorkstationPanel />
    </div>
  );
}

function DockPanelCenter(_props: IDockviewPanelProps) {
  const slot = useCenterSlot();
  return <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">{slot}</div>;
}

function DockPanelRight(_props: IDockviewPanelProps) {
  return (
    <div className="workbench-inspector-surface workbench-surface flex h-full min-h-0 flex-col overflow-hidden">
      <RightWorkstationPanel />
    </div>
  );
}

function tryRestoreLayout(api: DockviewApi): boolean {
  try {
    const raw = localStorage.getItem(DOCK_LAYOUT_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return false;
    api.fromJSON(data as Parameters<DockviewApi["fromJSON"]>[0]);
    if (!layoutHasCorePanels(api)) {
      api.clear();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const dockComponents = {
  [PANEL_LEFT]: DockPanelLeft,
  [PANEL_CENTER]: DockPanelCenter,
  [PANEL_RIGHT]: DockPanelRight,
} as const;

export interface WorkstationDockLayoutProps {
  centerContent: React.ReactNode;
}

/**
 * Photoshop-style dock: Data | Viewport | Inspector. Layout is preset-driven;
 * panel drag, drop, and floating are disabled.
 */
export default function WorkstationDockLayout({ centerContent }: WorkstationDockLayoutProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const apiRef = useRef<DockviewApi | null>(null);
  const { resolvedLocale } = useLocale();
  const colorScheme = useColorScheme();
  const { registerApi, getActivePreset } = useWorkstationLayout();

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    applyDockPanelTitles(api);
    hideAllGroupHeaders(api);
  }, [resolvedLocale]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
    },
    [],
  );

  const schedulePersist = useCallback((api: DockviewApi) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DOCK_LAYOUT_STORAGE_KEY, JSON.stringify(api.toJSON()));
      } catch {
        /* quota / private mode */
      }
    }, 320);
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const { api } = event;
      apiRef.current = api;
      registerApi(api);
      const restored = tryRestoreLayout(api);
      if (!restored) {
        applyLayoutPreset(api, getActivePreset());
        schedulePersist(api);
      } else {
        applyDockPanelTitles(api);
        hideAllGroupHeaders(api);
      }
      disposablesRef.current.push(api.onDidLayoutChange(() => schedulePersist(api)));
    },
    [schedulePersist, registerApi, getActivePreset],
  );

  const defaultTabComponent = useMemo(
    () => (props: React.ComponentProps<typeof DockviewDefaultTab>) => <WorkbenchDockTab {...props} />,
    [],
  );

  return (
    <CenterSlotContext.Provider value={centerContent}>
      <div
        className={cn(
          "workstation-dock-root flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground",
          colorScheme === "dark" ? "dockview-theme-dark" : "dockview-theme-light",
        )}
      >
        <DockviewReact
          className="dockview-biolabs-host h-full min-h-0 w-full flex-1"
          components={dockComponents}
          defaultTabComponent={defaultTabComponent}
          onReady={onReady}
          disableDnd
          disableFloatingGroups
          tabGroupAccent="off"
          singleTabMode="fullwidth"
        />
      </div>
    </CenterSlotContext.Provider>
  );
}
