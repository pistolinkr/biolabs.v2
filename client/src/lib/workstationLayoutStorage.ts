/** Workstation layout preset + density preferences (localStorage). */

/** v2: research assistant dock panel removed from Helix. */
export const DOCK_LAYOUT_STORAGE_KEY = "biolabs.dockview.layout.v2";
export const LAYOUT_PRESET_STORAGE_KEY = "biolabs.workstation.layoutPreset.v2";
export const DENSITY_STORAGE_KEY = "biolabs.workstation.density.v1";

export type LayoutPresetId = "classic" | "focus" | "analysis" | "compact";

export type WorkstationDensity = "comfortable" | "compact";

export const LAYOUT_PRESET_IDS: LayoutPresetId[] = [
  "classic",
  "focus",
  "analysis",
  "compact",
];

export const DEFAULT_LAYOUT_PRESET: LayoutPresetId = "classic";
export const DEFAULT_DENSITY: WorkstationDensity = "comfortable";

function isPresetId(v: unknown): v is LayoutPresetId {
  return typeof v === "string" && (LAYOUT_PRESET_IDS as string[]).includes(v);
}

function isDensity(v: unknown): v is WorkstationDensity {
  return v === "comfortable" || v === "compact";
}

export function loadLayoutPreset(): LayoutPresetId {
  if (typeof window === "undefined") return DEFAULT_LAYOUT_PRESET;
  try {
    const raw = localStorage.getItem(LAYOUT_PRESET_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT_PRESET;
    const parsed = JSON.parse(raw) as unknown;
    return isPresetId(parsed) ? parsed : DEFAULT_LAYOUT_PRESET;
  } catch {
    return DEFAULT_LAYOUT_PRESET;
  }
}

export function saveLayoutPreset(preset: LayoutPresetId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_PRESET_STORAGE_KEY, JSON.stringify(preset));
  } catch {
    /* quota / private mode */
  }
}

export function loadDensity(): WorkstationDensity {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const raw = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (!raw) return DEFAULT_DENSITY;
    const parsed = JSON.parse(raw) as unknown;
    return isDensity(parsed) ? parsed : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function saveDensity(density: WorkstationDensity): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, JSON.stringify(density));
  } catch {
    /* quota / private mode */
  }
}

/** Clearing the persisted dock layout forces a fresh preset application on next ready. */
export function clearStoredDockLayout(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DOCK_LAYOUT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
