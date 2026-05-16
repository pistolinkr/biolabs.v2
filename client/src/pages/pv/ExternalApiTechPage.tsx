import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchAiHealth, type AiHealthRouting } from "@/lib/aiApi";
import { ENV_DOC_LINES, HEALTHCARE_SPEC_URL, NIM_SERVICE_ROWS } from "@/lib/nimRoutingDoc";
import { PvApiPageShell } from "./PvApiConsole";

const BFF_ROWS: { method: string; path: string; note: string }[] = [
  { method: "POST", path: "/api/ai/jobs", note: "Create job: { service, input?, dryRun? }" },
  { method: "GET", path: "/api/ai/jobs/:id", note: "Job snapshot JSON" },
  { method: "GET", path: "/api/ai/jobs/:id/stream", note: "SSE: snapshot, update, done" },
  { method: "GET", path: "/api/ai/health", note: "apiKeyConfigured, keyHint, routing (no secrets)" },
  { method: "GET", path: "/api/ai/pipelines", note: "Preset pipeline metadata" },
];

function RoutingLiveBlock({ routing, error }: { routing: AiHealthRouting | undefined; error: string | null }) {
  if (error) {
    return <p className="border border-amber-900/50 bg-amber-950/20 p-2 font-mono text-[10px] text-amber-200/90">{error}</p>;
  }
  if (!routing) {
    return <p className="font-mono text-[10px] text-[#6A6A6A]">No routing payload returned.</p>;
  }
  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="text-[#9A9A9A]">
        <span className="text-[#6A6A6A]">baseUrl</span>{" "}
        <span className="text-[#C8C8C8]">{routing.baseUrl}</span>
      </div>
      <div className="text-[#6A6A6A]">paths (suffix after base)</div>
      <pre className="max-h-40 overflow-auto border border-[#2A2A2A] bg-[#080808] p-2 text-[#A8DCA8]">
        {JSON.stringify(routing.paths, null, 2)}
      </pre>
      {routing.resolvedPostUrls ? (
        <>
          <div className="text-[#6A6A6A]">resolvedPostUrls (curl-friendly)</div>
          <pre className="max-h-48 overflow-auto border border-[#2A2A2A] bg-[#080808] p-2 text-[#B8C8DC]">
            {JSON.stringify(routing.resolvedPostUrls, null, 2)}
          </pre>
        </>
      ) : null}
      {routing.asyncPoll ? (
        <div className="text-[#9A9A9A]">
          asyncPoll: {routing.asyncPoll.templateEnv}{" "}
          {routing.asyncPoll.templateConfigured ? "(set)" : "(not set)"}
        </div>
      ) : null}
      {routing.specReference ? (
        <a href={routing.specReference} target="_blank" rel="noreferrer" className="inline-block text-[#A8DCA8] hover:underline">
          Spec reference (server)
        </a>
      ) : null}
    </div>
  );
}

export default function ExternalApiTechPage() {
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [routing, setRouting] = useState<AiHealthRouting | undefined>();
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const h = await fetchAiHealth();
        if (cancelled) return;
        setHealthOk(h.ok);
        setApiKeyConfigured(h.apiKeyConfigured);
        setRouting(h.routing);
        setHealthError(!h.ok ? "GET /api/ai/health returned non-OK" : null);
      } catch (e) {
        if (!cancelled) setHealthError(e instanceof Error ? e.message : "Health fetch failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PvApiPageShell>
      <div className="h-full overflow-auto p-3 sm:p-4">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-2 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
            <h1 className="font-mono text-sm font-semibold tracking-tight text-[#F2F2F2]">외부 API · 기술 레퍼런스</h1>
            <p className="max-w-3xl font-mono text-[10px] leading-relaxed text-[#9A9A9A]">
              Biolabs가 노출하는 BFF 엔드포인트와, 업스트림 NVIDIA Healthcare NIM 경로·환경 변수를 한 페이지에 모았습니다. 서비스별 잡
              콘솔은{" "}
              <Link href="/msa-search" className="text-[#A8DCA8] hover:underline">
                MSA
              </Link>
              등 탭에서 실행합니다.
            </p>
            <a
              href={HEALTHCARE_SPEC_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block border border-[#3A3A3A] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[#A8DCA8] hover:border-[#5A5A5A]"
            >
              NVIDIA Healthcare APIs catalog
            </a>
          </header>

          <section className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">
              Biolabs BFF (same origin)
            </h2>
            <p className="mb-3 font-mono text-[10px] text-[#6A6A6A]">
              브라우저와 Vite dev 서버는 보통 동일 출처로 <code className="text-[#A8DCA8]">/api/ai/*</code>를 프록시합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[10px]">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-left text-[#6A6A6A]">
                    <th className="py-2 pr-3">Method</th>
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {BFF_ROWS.map((r) => (
                    <tr key={r.path} className="border-b border-[#1A1A1A] text-[#C8C8C8]">
                      <td className="py-2 pr-3 text-[#A8DCA8]">{r.method}</td>
                      <td className="py-2 pr-3 text-[#E8E8E8]">{r.path}</td>
                      <td className="py-2 text-[#9A9A9A]">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">
              NVIDIA NIM (job service → path suffix)
            </h2>
            <p className="mb-3 font-mono text-[10px] text-[#6A6A6A]">
              실제 URL은 <code className="text-[#A8DCA8]">{'${'}NVIDIA_HEALTHCARE_BASE_URL{'}'}</code> + 아래 suffix. 서버는{" "}
              <code className="text-[#9A9A9A]">buildRequest.ts</code>로 요청을 검증·매핑합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[10px]">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-left text-[#6A6A6A]">
                    <th className="py-2 pr-3">Biolabs service</th>
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Default path</th>
                    <th className="py-2">Env override</th>
                  </tr>
                </thead>
                <tbody>
                  {NIM_SERVICE_ROWS.map((r) => (
                    <tr key={r.jobService} className="border-b border-[#1A1A1A]">
                      <td className="py-2 pr-3 text-[#A8DCA8]">{r.jobService}</td>
                      <td className="py-2 pr-3 text-[#C8C8C8]">{r.label}</td>
                      <td className="py-2 pr-3 text-[#E8E8E8]">{r.defaultPath}</td>
                      <td className="py-2 text-[#9A9A9A]">{r.envOverride}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-mono text-[9px] text-[#5A5A5A]">
              상세 서버 구현: <code>server/core/config/nvidiaEndpoints.ts</code>, <code>server/core/providers/nvidia/buildRequest.ts</code>
            </p>
          </section>

          <section className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">
              환경 변수 (서버)
            </h2>
            <ul className="list-inside list-disc space-y-1 font-mono text-[10px] text-[#9A9A9A]">
              {ENV_DOC_LINES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[9px] text-[#5A5A5A]">전체 예시: 저장소 루트 `.env.example`</p>
          </section>

          <section className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
            <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">
              Live — GET /api/ai/health
            </h2>
            <div className="mb-3 flex flex-wrap gap-3 font-mono text-[10px] text-[#9A9A9A]">
              <span>
                ok:{" "}
                <span className={healthOk ? "text-[#A8DCA8]" : healthOk === false ? "text-red-400" : "text-[#6A6A6A]"}>
                  {healthOk === null ? "…" : String(healthOk)}
                </span>
              </span>
              <span>
                apiKeyConfigured:{" "}
                <span className={apiKeyConfigured ? "text-[#A8DCA8]" : apiKeyConfigured === false ? "text-amber-400" : "text-[#6A6A6A]"}>
                  {apiKeyConfigured === null ? "…" : String(apiKeyConfigured)}
                </span>
              </span>
            </div>
            <RoutingLiveBlock routing={routing} error={healthError} />
          </section>
        </div>
      </div>
    </PvApiPageShell>
  );
}
