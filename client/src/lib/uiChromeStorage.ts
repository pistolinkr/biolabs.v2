/** Global UI chrome preferences (localStorage). */

export const NAVBAR_FIXED_STORAGE_KEY = "biolabs.ui.navbarFixed.v1";

const DEFAULT_NAVBAR_FIXED = false;

export function loadNavbarFixed(): boolean {
  if (typeof window === "undefined") return DEFAULT_NAVBAR_FIXED;
  try {
    const raw = localStorage.getItem(NAVBAR_FIXED_STORAGE_KEY);
    if (raw == null) return DEFAULT_NAVBAR_FIXED;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === true;
  } catch {
    return DEFAULT_NAVBAR_FIXED;
  }
}

export function saveNavbarFixed(fixed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAVBAR_FIXED_STORAGE_KEY, JSON.stringify(fixed));
    window.dispatchEvent(new CustomEvent("biolabs:navbar-fixed", { detail: fixed }));
  } catch {
    /* quota / private mode */
  }
}
