/** Landing greeting → BOA5 setup chat (sessionStorage, no DB). */

const HANDOFF_KEY = "biolabs.binary.greetingHandoff.v1";
const TRANSITION_KEY = "biolabs.boa5.transition.v1";
/** Suppress bottom AI-setup banner while chat owns first-session setup. */
export const AI_SETUP_VIA_CHAT_KEY = "biolabs.ai.setupViaChat.v1";

export const BOA5_TRANSITION_EVENT = "biolabs:boa5-transition";
export const BOA5_TRANSITION_END_EVENT = "biolabs:boa5-transition-end";
export const AI_SETUP_VIA_CHAT_EVENT = "biolabs:ai-setup-via-chat";

export interface GreetingHandoff {
  userText: string;
  createdAt: number;
}

/**
 * “Hello” nuance — short greetings / addressing Boa5.
 * Kept permissive for common variants users actually type.
 */
export function isGreetingNuance(text: string): boolean {
  const raw = text.trim();
  if (!raw || raw.length > 80) return false;

  const normalized = raw
    .toLowerCase()
    .replace(/[!?.,…~♪。！？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  // Exact short greetings
  if (
    /^(hi|hello|hey|hiya|howdy|yo|sup|hola|안녕|안녕하세요|헬로|하이|ㅎㅇ|반가워|방가)( there| everyone)?$/.test(
      normalized,
    )
  ) {
    return true;
  }

  // Good morning / evening
  if (/^(good )?(morning|afternoon|evening|day)$/.test(normalized)) return true;
  if (/^(what'?s up|whats up)$/.test(normalized)) return true;

  // Addressing Boa5 (with optional greeting / ?)
  if (/^(boa5|boa 5|boad5|보아5)$/.test(normalized)) return true;
  if (/^(hi|hello|hey|안녕|하이)\s*,?\s*(boa5|boa 5|boad5|보아5)$/.test(normalized)) return true;
  if (/^(boa5|boa 5|boad5|보아5)\s*[?？]?$/.test(normalized)) return true;

  return false;
}

export function setGreetingHandoff(userText: string): void {
  if (typeof sessionStorage === "undefined") return;
  const trimmed = userText.trim();
  if (!trimmed) return;
  try {
    const payload: GreetingHandoff = { userText: trimmed, createdAt: Date.now() };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    sessionStorage.setItem(AI_SETUP_VIA_CHAT_KEY, "1");
  } catch {
    /* quota */
  }
}

export function peekGreetingHandoff(): GreetingHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<GreetingHandoff>;
    if (typeof o.userText !== "string" || !o.userText.trim()) return null;
    return {
      userText: o.userText.trim(),
      createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Remove handoff after setup choice or user clears thread. */
export function clearGreetingHandoff(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated use clearGreetingHandoff — kept for call sites that "consume". */
export function consumeGreetingHandoff(): GreetingHandoff | null {
  const handoff = peekGreetingHandoff();
  clearGreetingHandoff();
  return handoff;
}

export function isAiSetupViaChat(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(AI_SETUP_VIA_CHAT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearAiSetupViaChat(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(AI_SETUP_VIA_CHAT_KEY);
  } catch {
    /* ignore */
  }
}

/** App-level transition overlay (survives Landing unmount). */
export function beginBoa5Transition(userText: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      TRANSITION_KEY,
      JSON.stringify({ userText: userText.trim(), at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(BOA5_TRANSITION_EVENT, { detail: { userText: userText.trim() } }),
  );
}

export function peekBoa5Transition(): { userText: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRANSITION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { userText?: string };
    if (typeof o.userText !== "string") return null;
    return { userText: o.userText };
  } catch {
    return null;
  }
}

export function endBoa5Transition(): void {
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(TRANSITION_KEY);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(BOA5_TRANSITION_END_EVENT));
}
