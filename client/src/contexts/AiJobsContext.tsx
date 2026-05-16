import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  type AiJob,
  type CreateAiJobBody,
  fetchAiHealth,
  fetchAiPipelines,
  getAiJob,
  postAiJob,
} from "@/lib/aiApi";
import { suggestContactsFromResult } from "@/lib/biolabsJobResult";

interface AiJobsContextValue {
  jobs: AiJob[];
  pipelines: readonly unknown[];
  apiKeyConfigured: boolean | null;
  refreshHealth: () => Promise<void>;
  submitJob: (body: CreateAiJobBody) => Promise<AiJob | null>;
  /** Subscribe to server SSE for job updates (merges into `jobs`). */
  trackJobStream: (jobId: string) => void;
  lastMsaResult: unknown | null;
  lastEvo2Result: unknown | null;
  lastGenmolResult: unknown | null;
  lastBoltzResult: unknown | null;
  lastAlphafold3Result: unknown | null;
  /** Job id for the last completed OpenFold3 inference (decode error toasts). */
  lastAlphafold3JobId: string | null;
  /** Last completed job suggested interface / contacts overlay (from normalized `suggestContacts`). */
  contactsJobHint: boolean;
  dismissContactsJobHint: () => void;
}

const AiJobsContext = createContext<AiJobsContextValue | null>(null);

function mergeJob(list: AiJob[], next: AiJob): AiJob[] {
  const i = list.findIndex((j) => j.id === next.id);
  if (i === -1) return [next, ...list];
  const cp = [...list];
  cp[i] = next;
  return cp;
}

export function AiJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [pipelines, setPipelines] = useState<readonly unknown[]>([]);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [lastMsaResult, setLastMsaResult] = useState<unknown | null>(null);
  const [lastEvo2Result, setLastEvo2Result] = useState<unknown | null>(null);
  const [lastGenmolResult, setLastGenmolResult] = useState<unknown | null>(null);
  const [lastBoltzResult, setLastBoltzResult] = useState<unknown | null>(null);
  const [lastAlphafold3Result, setLastAlphafold3Result] = useState<unknown | null>(null);
  const [lastAlphafold3JobId, setLastAlphafold3JobId] = useState<string | null>(null);
  const [contactsJobHint, setContactsJobHint] = useState(false);
  const streamsRef = useRef(new Set<string>());

  const refreshHealth = useCallback(async () => {
    try {
      const h = await fetchAiHealth();
      setApiKeyConfigured(h.apiKeyConfigured);
    } catch {
      setApiKeyConfigured(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void fetchAiPipelines()
      .then((p) => setPipelines(p.pipelines))
      .catch(() => setPipelines([]));
  }, [refreshHealth]);

  const dismissContactsJobHint = useCallback(() => setContactsJobHint(false), []);

  const ingestCompleted = useCallback((job: AiJob) => {
    if (job.status !== "completed" || job.result === undefined) return;
    if (suggestContactsFromResult(job.result)) setContactsJobHint(true);
    switch (job.service) {
      case "msa_search":
      case "msa_search_paired":
        setLastMsaResult(job.result);
        break;
      case "evo2_40b":
        setLastEvo2Result(job.result);
        break;
      case "genmol":
        setLastGenmolResult(job.result);
        break;
      case "boltz2":
        setLastBoltzResult(job.result);
        break;
      case "alphafold3":
        setLastAlphafold3JobId(job.id);
        setLastAlphafold3Result(job.result);
        break;
      default:
        break;
    }
  }, []);

  const trackJobStream = useCallback(
    (jobId: string) => {
      if (streamsRef.current.has(jobId)) return;
      streamsRef.current.add(jobId);
      const es = new EventSource(`/api/ai/jobs/${encodeURIComponent(jobId)}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string; job?: AiJob };
          if (msg.job) {
            setJobs((prev) => mergeJob(prev, msg.job!));
            if (msg.job.status === "completed" || msg.job.status === "failed") {
              ingestCompleted(msg.job);
              es.close();
              streamsRef.current.delete(jobId);
            }
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es.close();
        streamsRef.current.delete(jobId);
        void getAiJob(jobId)
          .then(({ job }) => {
            setJobs((prev) => mergeJob(prev, job));
            ingestCompleted(job);
          })
          .catch(() => {
            /* ignore */
          });
      };
    },
    [ingestCompleted],
  );

  const submitJob = useCallback(
    async (body: CreateAiJobBody): Promise<AiJob | null> => {
      try {
        const { job } = await postAiJob(body);
        setJobs((prev) => mergeJob(prev, job));
        trackJobStream(job.id);
        toast.message("AI job queued", { description: `${job.service} · ${job.id.slice(0, 8)}` });
        return job;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "AI job failed");
        return null;
      }
    },
    [trackJobStream],
  );

  const value = useMemo<AiJobsContextValue>(
    () => ({
      jobs,
      pipelines,
      apiKeyConfigured,
      refreshHealth,
      submitJob,
      trackJobStream,
      lastMsaResult,
      lastEvo2Result,
      lastGenmolResult,
      lastBoltzResult,
      lastAlphafold3Result,
      lastAlphafold3JobId,
      contactsJobHint,
      dismissContactsJobHint,
    }),
    [
      jobs,
      pipelines,
      apiKeyConfigured,
      refreshHealth,
      submitJob,
      trackJobStream,
      lastMsaResult,
      lastEvo2Result,
      lastGenmolResult,
      lastBoltzResult,
      lastAlphafold3Result,
      lastAlphafold3JobId,
      contactsJobHint,
      dismissContactsJobHint,
    ],
  );

  return <AiJobsContext.Provider value={value}>{children}</AiJobsContext.Provider>;
}

export function useAiJobs(): AiJobsContextValue {
  const ctx = useContext(AiJobsContext);
  if (!ctx) throw new Error("useAiJobs requires AiJobsProvider");
  return ctx;
}

export function useAiJobsOptional(): AiJobsContextValue | null {
  return useContext(AiJobsContext);
}
