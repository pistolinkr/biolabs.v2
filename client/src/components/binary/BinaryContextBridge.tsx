import { useEffect } from "react";
import { useAssistant } from "@/contexts/AssistantContext";

/** Marks AI requests as Binary bioengineering workstation (general chat, not agent). */
export default function BinaryContextBridge() {
  const { registerContextExtension } = useAssistant();

  useEffect(() => {
    return registerContextExtension({
      workstation_id: "binary",
      domain: "binary.bioengineering",
    });
  }, [registerContextExtension]);

  return null;
}
