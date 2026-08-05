import { useEffect, useRef } from "react";
import { useAssistant } from "@/contexts/AssistantContext";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { appendBoa5SharedMessages } from "@/lib/ai/binaryChatThreads";
import {
  loadPhaeleonChatHistory,
  savePhaeleonChatHistory,
} from "@/lib/phaeleon/phaeleonChatHistory";
import { upsertPhaeleonPairSession } from "@/lib/phaeleon/phaeleonPairSessionHistory";
import { savePhaeleonActiveSession } from "@/lib/phaeleon/phaeleonActiveSessionStorage";
import { getOrCreateAppSessionId } from "@/lib/session/cookieSession";

/** Cookie session bootstrap + chat / pair history persistence for Phaeleon. */
export default function PhaeleonSessionHistoryBridge() {
  const { drug1, drug2, analysis, assistantPairContextPinned } = usePhaeleon();
  const { messages, replaceMessages } = useAssistant();
  const pairLabel = drug1 && drug2 ? `${drug1.name}|${drug2.name}` : null;
  const skipSaveRef = useRef(true);
  const sessionReadyRef = useRef(false);

  useEffect(() => {
    getOrCreateAppSessionId();
    sessionReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!sessionReadyRef.current) return;
    savePhaeleonActiveSession({ drug1, drug2, assistantPairContextPinned });
  }, [drug1, drug2, assistantPairContextPinned]);

  useEffect(() => {
    skipSaveRef.current = true;
    if (!drug1 || !drug2) {
      replaceMessages([]);
      queueMicrotask(() => {
        skipSaveRef.current = false;
      });
      return;
    }
    replaceMessages(loadPhaeleonChatHistory(drug1.name, drug2.name));
    queueMicrotask(() => {
      skipSaveRef.current = false;
    });
  }, [pairLabel, drug1, drug2, replaceMessages]);

  useEffect(() => {
    if (skipSaveRef.current || !drug1 || !drug2) return;
    savePhaeleonChatHistory(drug1.name, drug2.name, messages);
    // Mirror into the shared BOA5 thread so Binary / Helix can continue the same chat.
    appendBoa5SharedMessages(messages);
  }, [messages, drug1, drug2]);

  useEffect(() => {
    if (!drug1 || !drug2 || !analysis) return;
    upsertPhaeleonPairSession({
      drug1: drug1.name,
      drug2: drug2.name,
      risk: analysis.risk,
      messageCount: messages.filter((m) => !m.pending && !m.error).length,
    });
  }, [analysis, drug1, drug2, messages]);

  return null;
}
