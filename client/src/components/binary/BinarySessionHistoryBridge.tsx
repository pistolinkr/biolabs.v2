import { useEffect, useRef } from "react";
import { useAssistant } from "@/contexts/AssistantContext";
import {
  clearBinaryChatHistory,
  loadBinaryChatHistory,
  saveBinaryChatHistory,
} from "@/lib/ai/binaryChatHistory";
import { getOrCreateAppSessionId } from "@/lib/session/cookieSession";

/** Persist Binary chat thread to cookie-scoped localStorage (no DB). */
export default function BinarySessionHistoryBridge() {
  const { messages, replaceMessages } = useAssistant();
  const skipSaveRef = useRef(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    getOrCreateAppSessionId();
    skipSaveRef.current = true;
    replaceMessages(loadBinaryChatHistory());
    hydratedRef.current = true;
    queueMicrotask(() => {
      skipSaveRef.current = false;
    });
  }, [replaceMessages]);

  useEffect(() => {
    if (skipSaveRef.current || !hydratedRef.current) return;
    if (messages.length === 0) {
      clearBinaryChatHistory();
      return;
    }
    saveBinaryChatHistory(messages);
  }, [messages]);

  return null;
}
