import { useEffect, useRef } from "react";
import { useAssistant } from "@/contexts/AssistantContext";
import {
  loadActiveBinaryThreadMessages,
  saveActiveBinaryThreadMessages,
} from "@/lib/ai/binaryChatThreads";
import { peekGreetingHandoff } from "@/lib/ai/greetingHandoff";
import { getOrCreateAppSessionId } from "@/lib/session/cookieSession";

/** Persist BOA5 chat threads to cookie-scoped localStorage (no DB). */
export default function BinarySessionHistoryBridge() {
  const { messages, replaceMessages } = useAssistant();
  const skipSaveRef = useRef(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    getOrCreateAppSessionId();
    skipSaveRef.current = true;
    // Greeting handoff owns the first paint — don't clobber it with stale history.
    if (!peekGreetingHandoff()) {
      replaceMessages(loadActiveBinaryThreadMessages());
    }
    hydratedRef.current = true;
    queueMicrotask(() => {
      skipSaveRef.current = false;
    });
  }, [replaceMessages]);

  useEffect(() => {
    if (skipSaveRef.current || !hydratedRef.current) return;
    saveActiveBinaryThreadMessages(messages);
  }, [messages]);

  return null;
}
