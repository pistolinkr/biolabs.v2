import type { AssistantUiMessage } from "@/contexts/AssistantContext";
import {
  BINARY_CHAT_HISTORY_BASE_KEY,
  deserializeBinaryChatMessages,
  serializeBinaryChatMessages,
  type StoredBinaryChatMessage,
} from "@/lib/ai/binaryChatHistory";
import {
  clearScopedStore,
  readScopedStore,
  writeScopedStore,
} from "@/lib/session/scopedHistoryStore";

/** Multi-thread BOA5 chats — localStorage, cookie-scoped. */
export const BINARY_CHAT_THREADS_BASE_KEY = "biolabs.binary.chatThreads.v1";

const MAX_THREADS = 40;
const MAX_MESSAGES = 120;

export interface BinaryChatThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: StoredBinaryChatMessage[];
}

interface BinaryChatThreadsStore {
  version: 1;
  activeId: string | null;
  threads: BinaryChatThread[];
}

export interface BinaryChatThreadMeta {
  id: string;
  title: string;
  updatedAt: string;
  active: boolean;
}

function emptyStore(): BinaryChatThreadsStore {
  return { version: 1, activeId: null, threads: [] };
}

function newId(): string {
  return `thr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromMessages(messages: StoredBinaryChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "New chat";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 42 ? `${text.slice(0, 41)}…` : text;
}

function readStore(): BinaryChatThreadsStore {
  const store = readScopedStore(BINARY_CHAT_THREADS_BASE_KEY, emptyStore, "local");
  if (!store || store.version !== 1 || !Array.isArray(store.threads)) {
    return migrateFromLegacySingleThread();
  }
  return store;
}

function writeStore(store: BinaryChatThreadsStore): void {
  writeScopedStore(BINARY_CHAT_THREADS_BASE_KEY, store, "local");
}

/** One-time lift of the old single-thread history into a thread list. */
function migrateFromLegacySingleThread(): BinaryChatThreadsStore {
  try {
    const legacy = readScopedStore<{ version?: number; messages?: StoredBinaryChatMessage[] }>(
      BINARY_CHAT_HISTORY_BASE_KEY,
      () => ({ version: 1, messages: [] }),
      "local",
    );
    const messages = Array.isArray(legacy?.messages) ? legacy.messages : [];
    if (messages.length === 0) return emptyStore();

    const id = newId();
    const next: BinaryChatThreadsStore = {
      version: 1,
      activeId: id,
      threads: [
        {
          id,
          title: titleFromMessages(messages),
          updatedAt: messages[messages.length - 1]?.createdAt ?? new Date().toISOString(),
          messages: messages.slice(-MAX_MESSAGES),
        },
      ],
    };
    writeStore(next);
    clearScopedStore(BINARY_CHAT_HISTORY_BASE_KEY, "local");
    return next;
  } catch {
    return emptyStore();
  }
}

export function listBinaryChatThreads(): BinaryChatThreadMeta[] {
  const store = readStore();
  return [...store.threads]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((t) => ({
      id: t.id,
      title: t.title || "New chat",
      updatedAt: t.updatedAt,
      active: t.id === store.activeId,
    }));
}

export function getActiveBinaryThreadId(): string | null {
  return readStore().activeId;
}

export function loadActiveBinaryThreadMessages(): AssistantUiMessage[] {
  const store = readStore();
  if (!store.activeId) return [];
  const thread = store.threads.find((t) => t.id === store.activeId);
  if (!thread) return [];
  return deserializeBinaryChatMessages(thread.messages);
}

/** Persist messages onto a specific thread without changing the active selection. */
export function saveBinaryThreadMessages(threadId: string, messages: AssistantUiMessage[]): void {
  const store = readStore();
  const serialized = serializeBinaryChatMessages(messages).slice(-MAX_MESSAGES);
  const now = new Date().toISOString();

  if (serialized.length === 0) {
    const idx = store.threads.findIndex((t) => t.id === threadId);
    if (idx < 0) return;
    store.threads[idx] = {
      ...store.threads[idx],
      title: "New chat",
      updatedAt: now,
      messages: [],
    };
    writeStore(store);
    return;
  }

  const idx = store.threads.findIndex((t) => t.id === threadId);
  if (idx < 0) {
    store.threads.unshift({
      id: threadId,
      title: titleFromMessages(serialized),
      updatedAt: now,
      messages: serialized,
    });
  } else {
    const prev = store.threads[idx];
    store.threads[idx] = {
      ...prev,
      title: prev.title === "New chat" || !prev.title ? titleFromMessages(serialized) : prev.title,
      updatedAt: now,
      messages: serialized,
    };
    if (prev.messages.length === 0 || prev.title === "New chat") {
      store.threads[idx].title = titleFromMessages(serialized);
    }
  }

  store.threads = store.threads
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, MAX_THREADS);
  writeStore(store);
}

export function saveActiveBinaryThreadMessages(messages: AssistantUiMessage[]): void {
  const store = readStore();
  const serialized = serializeBinaryChatMessages(messages).slice(-MAX_MESSAGES);

  if (serialized.length === 0) {
    // Empty active thread — keep a blank draft if one exists; otherwise noop.
    if (!store.activeId) return;
    saveBinaryThreadMessages(store.activeId, messages);
    return;
  }

  if (!store.activeId) {
    const id = newId();
    store.activeId = id;
    writeStore(store);
    saveBinaryThreadMessages(id, messages);
    return;
  }

  saveBinaryThreadMessages(store.activeId, messages);
}

/**
 * Start a fresh empty thread and make it active. Returns new thread id.
 * @param forceNew — always create a new thread (do not reuse an empty active draft).
 */
export function createBinaryChatThread(options?: { forceNew?: boolean; activate?: boolean }): string {
  const activate = options?.activate !== false;
  const store = readStore();
  // Drop empty drafts so we don't pile up blank threads.
  store.threads = store.threads.filter((t) => t.messages.length > 0 || t.id === store.activeId);
  const active = store.threads.find((t) => t.id === store.activeId);
  if (activate && !options?.forceNew && active && active.messages.length === 0) {
    return active.id;
  }

  const id = newId();
  if (activate) {
    store.activeId = id;
  }
  store.threads.unshift({
    id,
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [],
  });
  store.threads = store.threads.slice(0, MAX_THREADS);
  writeStore(store);
  return id;
}

/** Session-scoped id for the Helix/Phaeleon → BOA5 shared chat (never an old Binary chat). */
const WORKSTATION_SHARED_THREAD_KEY = "biolabs.boa5.workstationSharedThread.v1";

function readWorkstationSharedThreadId(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(WORKSTATION_SHARED_THREAD_KEY);
  } catch {
    return null;
  }
}

function writeWorkstationSharedThreadId(id: string): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(WORKSTATION_SHARED_THREAD_KEY, id);
  } catch {
    /* private mode */
  }
}

/**
 * Dedicated BOA5 thread for Helix/Phaeleon turns.
 * Never appends into a pre-existing Binary conversation — opens a new chat once per session, then continues it.
 */
export function ensureBoa5WorkstationSharedThread(): string {
  const store = readStore();
  const saved = readWorkstationSharedThreadId();
  if (saved) {
    const found = store.threads.find((t) => t.id === saved);
    if (found) return saved;
  }

  const id = createBinaryChatThread({ forceNew: true, activate: false });
  writeWorkstationSharedThreadId(id);
  return id;
}

/** History for continuing a Helix/Phaeleon → BOA5 conversation (empty until that shared chat exists). */
export function loadBoa5WorkstationSharedMessages(): AssistantUiMessage[] {
  const saved = readWorkstationSharedThreadId();
  if (!saved) return [];
  const store = readStore();
  const thread = store.threads.find((t) => t.id === saved);
  if (!thread) return [];
  return deserializeBinaryChatMessages(thread.messages);
}

export function switchBinaryChatThread(id: string): AssistantUiMessage[] {
  const store = readStore();
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) return loadActiveBinaryThreadMessages();
  store.activeId = id;
  writeStore(store);
  return deserializeBinaryChatMessages(thread.messages);
}

export function deleteBinaryChatThread(id: string): AssistantUiMessage[] {
  const store = readStore();
  store.threads = store.threads.filter((t) => t.id !== id);
  if (store.activeId === id) {
    store.activeId = store.threads[0]?.id ?? null;
  }
  writeStore(store);
  if (!store.activeId) return [];
  const active = store.threads.find((t) => t.id === store.activeId);
  return active ? deserializeBinaryChatMessages(active.messages) : [];
}

export function clearAllBinaryChatThreads(): void {
  clearScopedStore(BINARY_CHAT_THREADS_BASE_KEY, "local");
}

/**
 * Append messages into the workstation shared BOA5 thread (skip duplicates).
 * Always targets a dedicated new chat — never an already-existing Binary conversation.
 */
export function appendBoa5SharedMessages(messages: AssistantUiMessage[]): void {
  const incoming = messages.filter(
    (m) =>
      !m.pending &&
      !m.error &&
      (m.role === "user" || m.role === "assistant") &&
      m.content.trim().length > 0,
  );
  if (!incoming.length) return;

  const threadId = ensureBoa5WorkstationSharedThread();
  const existing = loadBoa5WorkstationSharedMessages();
  const seen = new Set(existing.map((m) => m.id));
  const toAdd = incoming.filter((m) => !seen.has(m.id));
  if (!toAdd.length) return;

  saveBinaryThreadMessages(threadId, [...existing, ...toAdd]);
}

/** Append one user + assistant turn to the dedicated Helix/Phaeleon → BOA5 chat. */
export function appendBoa5SharedTurn(userText: string, assistantText: string): void {
  const user = userText.trim();
  const assistant = assistantText.trim();
  if (!user && !assistant) return;
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const msgs: AssistantUiMessage[] = [];
  if (user) msgs.push({ id: `boa5-${stamp}-u`, role: "user", content: user });
  if (assistant) msgs.push({ id: `boa5-${stamp}-a`, role: "assistant", content: assistant });
  appendBoa5SharedMessages(msgs);
}
