import React from "react";
import { useTranslation } from "react-i18next";
import AIChatPanel from "@/components/assistant/AIChatPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAssistant } from "@/contexts/AssistantContext";

export default function AIChatSheet() {
  const { chatOpen, setChatOpen } = useAssistant();
  const { t } = useTranslation("assistant");

  return (
    <Sheet open={chatOpen} onOpenChange={setChatOpen}>
      <SheetContent side="right" className="w-[min(440px,100vw)] gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("aiName")}</SheetTitle>
        </SheetHeader>
        <AIChatPanel />
      </SheetContent>
    </Sheet>
  );
}
