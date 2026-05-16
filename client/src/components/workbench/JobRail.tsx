import React, { useState } from "react";
import { useAiJobs } from "@/contexts/AiJobsContext";

/** Bottom dock: AI job queue, logs, SSE-driven status. */
export default function JobRail() {
  const { jobs, apiKeyConfigured } = useAiJobs();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0A0A0A] font-mono text-[10px]">
      <div className="flex shrink-0 items-center justify-between border-b border-[#2A2A2A] px-2 py-1 uppercase tracking-widest text-[#8A8A8A]">
        <span>Jobs / Logs</span>
        <span className="text-[#6A6A6A]">
          API {apiKeyConfigured === null ? "…" : apiKeyConfigured ? "key OK" : "no key"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-2 text-[#6A6A6A]">No jobs yet — use pipeline bar or Cmd+K (AI …).</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {jobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setOpenId((o) => (o === j.id ? null : j.id))}
                  className="flex w-full flex-col border-0 bg-transparent px-2 py-1 text-left hover:bg-[#141414]"
                >
                  <div className="flex gap-2 text-[#F2F2F2]">
                    <span className="text-[#8A8A8A]">[{j.status}]</span>
                    <span>{j.service}</span>
                    <span className="truncate text-[#6A6A6A]">{j.id.slice(0, 12)}…</span>
                    <span className="ml-auto text-[#6A6A6A]">{j.progress}%</span>
                  </div>
                  {j.error ? <div className="text-[#E88]">{j.error}</div> : null}
                </button>
                {openId === j.id ? (
                  <div className="border-t border-[#2A2A2A] bg-[#111111] px-2 py-1 text-[9px] text-[#B0B0B0]">
                    <div className="max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {j.logs.length ? j.logs.join("\n") : "— no logs —"}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
