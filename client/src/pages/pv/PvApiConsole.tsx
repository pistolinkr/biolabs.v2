import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, RotateCcw, Wand2 } from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import SettingsPanel from "@/components/SettingsPanel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useAiJobs } from "@/contexts/AiJobsContext";
import type { CreateAiJobBody } from "@/lib/aiApi";
import { defaultInputJsonPretty } from "@/lib/nimJobDefaults";
import PvChromeHeader from "./PvChromeHeader";

export type PvNimService = Exclude<CreateAiJobBody["service"], "local_echo">;

export function PvApiPageShell({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#0A0A0A]">
      <PvChromeHeader
        onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export interface PvApiConsoleProps {
  service: PvNimService;
  title: string;
  nimPath: string;
  description: string;
  docsUrl: string;
  chatgptPrompts: string[];
}

export default function PvApiConsole({ service, title, nimPath, description, docsUrl, chatgptPrompts }: PvApiConsoleProps) {
  const { jobs, submitJob, apiKeyConfigured } = useAiJobs();
  const [text, setText] = useState(() => defaultInputJsonPretty(service));

  const latestJob = useMemo(() => {
    const same = jobs.filter((j) => j.service === service);
    same.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return same[0] ?? null;
  }, [jobs, service]);

  const parseInput = (): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(text) as unknown;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        toast.error("Input must be a JSON object");
        return null;
      }
      return v as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON");
      return null;
    }
  };

  const runDry = async () => {
    const input = parseInput();
    if (!input) return;
    const job = await submitJob({ service, input, dryRun: true });
  };

  const runLive = async () => {
    if (apiKeyConfigured !== true) {
      toast.error("Live inference unavailable", {
        description: "Configure NVIDIA_HEALTHCARE_API_KEY on the server.",
      });
      return;
    }
    const input = parseInput();
    if (!input) return;
    const job = await submitJob({ service, input, dryRun: false });
  };

  const formatJson = () => {
    const o = parseInput();
    if (!o) return;
    setText(JSON.stringify(o, null, 2));
  };

  const copyPrompt = async (q: string) => {
    try {
      await navigator.clipboard.writeText(q);
      toast.message("Copied question for ChatGPT");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3 sm:p-4">
      <div className="space-y-2 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-tight text-[#F2F2F2]">{title}</h1>
            <p className="mt-1 max-w-3xl font-mono text-[10px] leading-relaxed text-[#9A9A9A]">{description}</p>
          </div>
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 border border-[#3A3A3A] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[#A8DCA8] hover:border-[#5A5A5A]"
          >
            Healthcare APIs · spec
          </a>
        </div>
        <div className="font-mono text-[10px] text-[#6A6A6A]">
          <span className="text-[#8A8A8A]">POST</span> <span className="text-[#C8C8C8]">{nimPath}</span>
          <span className="ml-2 text-[#5A5A5A]">(base: server `NVIDIA_HEALTHCARE_BASE_URL`)</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-[240px] flex-col gap-2 border border-[#2A2A2A] bg-[#0D0D0D] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#8A8A8A]">Request JSON</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-none border-[#2A2A2A] font-mono text-[9px]"
              onClick={() => setText(defaultInputJsonPretty(service))}
            >
              <RotateCcw className="mr-1 size-3" />
              Reset demo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-none border-[#2A2A2A] font-mono text-[9px]"
              onClick={() => void formatJson()}
            >
              <Wand2 className="mr-1 size-3" />
              Format
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-7 rounded-none border-[#2A2A2A] font-mono text-[9px]"
              onClick={() => void runDry()}
            >
              Dry run
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-none bg-[#2A4A2A] font-mono text-[9px] hover:bg-[#356035]"
              onClick={() => void runLive()}
            >
              Live
            </Button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] flex-1 resize-y border border-[#2A2A2A] bg-[#080808] p-2 font-mono text-[10px] leading-snug text-[#D0D0D0] focus:border-[#5A5A5A] focus:outline-none"
            spellCheck={false}
            aria-label="Job input JSON"
          />
          {apiKeyConfigured === false ? (
            <p className="font-mono text-[9px] text-amber-600/90">Live calls need `NVIDIA_HEALTHCARE_API_KEY` on the server.</p>
          ) : null}
        </div>

        <div className="flex min-h-[240px] flex-col gap-2 border border-[#2A2A2A] bg-[#0D0D0D] p-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#8A8A8A]">Latest job · {service}</span>
          {!latestJob ? (
            <p className="font-mono text-[10px] text-[#6A6A6A]">Submit a dry or live job to see status and normalized `biolabs` output.</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-auto font-mono text-[10px]">
              <div className="flex flex-wrap gap-2 text-[#9A9A9A]">
                <span>
                  <span className="text-[#6A6A6A]">id</span> {latestJob.id.slice(0, 12)}…
                </span>
                <span>
                  <span className="text-[#6A6A6A]">status</span>{" "}
                  <span
                    className={
                      latestJob.status === "completed"
                        ? "text-[#A8DCA8]"
                        : latestJob.status === "failed"
                          ? "text-red-400"
                          : "text-[#C8C8C8]"
                    }
                  >
                    {latestJob.status}
                  </span>
                </span>
                <span>
                  <span className="text-[#6A6A6A]">progress</span> {latestJob.progress}%
                </span>
              </div>
              {latestJob.error ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border border-red-900/40 bg-red-950/20 p-2 text-red-200/90">
                  {latestJob.error}
                </pre>
              ) : null}
              {latestJob.result != null ? (
                <>
                  <div className="text-[9px] uppercase tracking-wide text-[#6A6A6A]">result.biolabs</div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border border-[#2A2A2A] bg-[#080808] p-2 text-[#B8DCA8]">
                    {JSON.stringify((latestJob.result as Record<string, unknown>).biolabs ?? {}, null, 2)}
                  </pre>
                  <details className="text-[9px]">
                    <summary className="cursor-pointer text-[#8A8A8A]">raw</summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words border border-[#2A2A2A] bg-[#080808] p-2 text-[#9A9A9A]">
                      {JSON.stringify(latestJob.result, null, 2)}
                    </pre>
                  </details>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Accordion type="single" collapsible className="border border-[#2A2A2A] bg-[#0D0D0D] px-3">
        <AccordionItem value="chatgpt" className="border-0">
          <AccordionTrigger className="font-mono text-[10px] uppercase tracking-widest text-[#8A8A8A] hover:no-underline">
            품질 개선용 ChatGPT 질문
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="font-mono text-[9px] leading-relaxed text-[#6A6A6A]">
              아래 문장을 복사해 ChatGPT(또는 다른 LLM)에 붙이면 UI 카피, 스키마 대응, 접근성 등 피드백을 받기 좋습니다.
            </p>
            <ul className="space-y-2">
              {chatgptPrompts.map((q, i) => (
                <li key={i} className="flex gap-2 border border-[#2A2A2A] bg-[#080808] p-2">
                  <p className="min-w-0 flex-1 font-mono text-[10px] leading-snug text-[#B0B0B0]">{q}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-none text-[#9A9A9A] hover:text-[#F2F2F2]"
                    title="Copy"
                    onClick={() => void copyPrompt(q)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
