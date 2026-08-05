import type { AssistantUiMessage } from "@/contexts/AssistantContext";
import {
  clearScopedStore,
  readScopedStore,
  writeScopedStore,
} from "@/lib/session/scopedHistoryStore";

/** Cookie-scoped Binary chat — localStorage (survives tab close; no DB). */
export const BINARY_CHAT_HISTORY_BASE_KEY = "biolabs.binary.chatHistory.v1";

const MAX_MESSAGES = 120;

export interface StoredBinaryChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface BinaryChatHistoryStore {
  version: 1;
  messages: StoredBinaryChatMessage[];
}

function emptyStore(): BinaryChatHistoryStore {
  return { version: 1, messages: [] };
}

function readStore(): BinaryChatHistoryStore {
  const store = readScopedStore(BINARY_CHAT_HISTORY_BASE_KEY, emptyStore, "local");
  if (!store || store.version !== 1 || !Array.isArray(store.messages)) {
    return emptyStore();
  }
  return store;
}

function writeStore(store: BinaryChatHistoryStore): void {
  writeScopedStore(BINARY_CHAT_HISTORY_BASE_KEY, store, "local");
}

export function serializeBinaryChatMessages(messages: AssistantUiMessage[]): StoredBinaryChatMessage[] {
  return messages
    .filter(
      (m): m is AssistantUiMessage & { role: "user" | "assistant" } =>
        !m.pending && !m.error && (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0,
    )
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date().toISOString(),
    }));
}

export function deserializeBinaryChatMessages(stored: StoredBinaryChatMessage[]): AssistantUiMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));
}

export function loadBinaryChatHistory(): AssistantUiMessage[] {
  return deserializeBinaryChatMessages(readStore().messages);
}

export function saveBinaryChatHistory(messages: AssistantUiMessage[]): StoredBinaryChatMessage[] {
  const store = readStore();
  store.messages = serializeBinaryChatMessages(messages).slice(-MAX_MESSAGES);
  writeStore(store);
  return store.messages;
}

export function clearBinaryChatHistory(): void {
  clearScopedStore(BINARY_CHAT_HISTORY_BASE_KEY, "local");
}
