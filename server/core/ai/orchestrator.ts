import type { AiEnvConfig } from "../config/env.js";
import { loadAiEnv } from "../config/env.js";
import { JobStore } from "../jobs/store.js";
import type { JobRecord, JobService } from "../types/jobSchemas.js";
import {
  dryRunLocalEcho,
  runAlphafold3,
  runBoltz2,
  runEvo2,
  runGenmol,
  runMsaSearch,
  runMsaSearchPaired,
} from "../providers/nvidia/services.js";
import { normalizeJobResult } from "../providers/nvidia/resultNormalize.js";
import { capMessage } from "../providers/nvidia/nvidiaError.js";

type Subscriber = (job: JobRecord) => void;

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribeJob(jobId: string, fn: Subscriber): () => void {
  let set = subscribers.get(jobId);
  if (!set) {
    set = new Set();
    subscribers.set(jobId, set);
  }
  set.add(fn);
  return () => {
    const s = subscribers.get(jobId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) subscribers.delete(jobId);
  };
}

function notify(job: JobRecord): void {
  const set = subscribers.get(job.id);
  if (!set) return;
  Array.from(set).forEach((fn) => {
    try {
      fn(job);
    } catch {
      /* ignore */
    }
  });
}

export async function executeJob(jobId: string, store: JobStore, cfg: AiEnvConfig): Promise<void> {
  const job = await store.get(jobId);
  if (!job) return;

  await store.update(jobId, { status: "running", progress: 5 });
  const j0 = (await store.get(jobId))!;
  notify(j0);
  await store.appendLog(jobId, `service=${job.service}`);

  try {
    const input = (job.input ?? {}) as Record<string, unknown>;
    if (input.__biolabsDryRun === true) {
      const { __biolabsDryRun: _d, ...rest } = input;
      await store.appendLog(jobId, "dry-run: no upstream call");
      const jDry = (await store.update(jobId, {
        status: "completed",
        progress: 100,
        result: {
          stub: true,
          targetService: job.service,
          payload: rest,
          biolabs: { version: 1, service: job.service, stub: true },
        },
      }))!;
      notify(jDry);
      return;
    }

    if (job.service === "local_echo") {
      const out = dryRunLocalEcho(job);
      await store.appendLog(jobId, "local echo complete");
      const norm = normalizeJobResult("local_echo", out.result);
      const j1 = (await store.update(jobId, {
        status: "completed",
        progress: 100,
        result: { biolabs: norm.biolabs, raw: norm.raw },
      }))!;
      notify(j1!);
      return;
    }

    let out: { result: unknown } | { error: string };
    const { __biolabsDryRun: _strip, ...payload } = input;
    const append = async (line: string) => {
      await store.appendLog(jobId, line);
    };
    const onProviderJobId = async (pid: string) => {
      await store.update(jobId, { providerJobId: pid });
    };

    switch (job.service as JobService) {
      case "alphafold3":
        out = await runAlphafold3(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      case "msa_search":
        out = await runMsaSearch(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      case "msa_search_paired":
        out = await runMsaSearchPaired(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      case "evo2_40b":
        out = await runEvo2(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      case "boltz2":
        out = await runBoltz2(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      case "genmol":
        out = await runGenmol(cfg, payload as Record<string, unknown>, append, onProviderJobId);
        break;
      default:
        out = { error: `Unknown service: ${job.service}` };
    }

    if ("error" in out) {
      await store.appendLog(jobId, `error: ${out.error}`);
      const j2 = (await store.update(jobId, {
        status: "failed",
        progress: 100,
        error: capMessage(out.error),
      }))!;
      notify(j2!);
      return;
    }

    await store.appendLog(jobId, "upstream complete");
    const norm = normalizeJobResult(job.service as JobService, out.result);
    const j3 = (await store.update(jobId, {
      status: "completed",
      progress: 100,
      result: { biolabs: norm.biolabs, raw: norm.raw },
    }))!;
    notify(j3!);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await store.appendLog(jobId, `exception: ${msg}`);
    const j4 = (await store.update(jobId, { status: "failed", error: capMessage(msg) }))!;
    notify(j4!);
  }
}

export function scheduleJob(jobId: string, store: JobStore, cfg: AiEnvConfig): void {
  void executeJob(jobId, store, cfg);
}

export { loadAiEnv };
