export const AI_ONBOARDING_STORAGE_KEY = "biolabs.ai.onboarding.v1";
export const AI_OPEN_SETTINGS_SESSION_KEY = "biolabs.ai.openSettings";
/** Dispatched on window when first-session AI setup choice changes. */
export const AI_SETUP_CHANGED_EVENT = "biolabs:ai-setup-changed";

export type AiSetupChoice = "byok" | "platform";

export interface AiOnboardingState {
  /** User picked a setup path (or dismissed). */
  completed: boolean;
  choice: AiSetupChoice | null;
}

const DEFAULT_STATE: AiOnboardingState = {
  completed: false,
  choice: null,
};

function loadState(): AiOnboardingState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(AI_ONBOARDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const o = JSON.parse(raw) as Partial<AiOnboardingState>;
    const choice = o.choice === "byok" || o.choice === "platform" ? o.choice : null;
    return {
      completed: o.completed === true || choice != null,
      choice,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: AiOnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function getAiOnboardingState(): AiOnboardingState {
  return loadState();
}

export function isAiOnboardingComplete(): boolean {
  return loadState().completed;
}

export function getAiSetupChoice(): AiSetupChoice | null {
  return loadState().choice;
}

/**
 * Browser-direct BYOK only when the user explicitly chose “your API key”.
 * Otherwise (platform choice, dismissed, or first visit) use server /.env keys.
 */
export function usesBrowserApiKeys(): boolean {
  return loadState().choice === "byok";
}

/** Platform AI via server env keys — default unless the user opted into BYOK. */
export function prefersPlatformAi(): boolean {
  return !usesBrowserApiKeys();
}

/** Persist first-session choice. */
export function completeAiOnboarding(choice: AiSetupChoice): void {
  saveState({ completed: true, choice });
}

export function dismissAiOnboarding(): void {
  const prev = loadState();
  saveState({ completed: true, choice: prev.choice });
}

/** One-shot: open Settings → AI after navigating to a tool that hosts SettingsPanel. */
export function requestOpenAiSettings(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AI_OPEN_SETTINGS_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeOpenAiSettingsRequest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(AI_OPEN_SETTINGS_SESSION_KEY) !== "1") return false;
    sessionStorage.removeItem(AI_OPEN_SETTINGS_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
