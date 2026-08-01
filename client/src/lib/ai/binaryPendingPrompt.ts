/** Landing → Binary handoff: one-shot prompt in sessionStorage (no DB). */
const KEY = "biolabs.binary.pendingPrompt.v1";

export function setBinaryPendingPrompt(text: string): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(KEY, trimmed);
  } catch {
    /* quota */
  }
}

export function consumeBinaryPendingPrompt(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}
