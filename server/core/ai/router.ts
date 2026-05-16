import express, { type Request, type Response, type Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createJobBodySchema } from "../types/jobSchemas.js";
import { JobStore } from "../jobs/store.js";
import { loadAiEnv, type AiEnvConfig } from "../config/env.js";
import { nvidiaRoutingDebugInfo } from "../config/nvidiaEndpoints.js";
import { PRESET_PIPELINES } from "../pipelines/presets.js";
import { runFastaMsaAf3Pipeline, runPairedMsaBoltz2Pipeline } from "../pipelines/runner.js";
import { scheduleJob, subscribeJob } from "./orchestrator.js";

const runPipelineBodySchema = z.object({
  sequence: z.string().min(1).max(4096).optional(),
  sequences: z.record(z.string(), z.string().min(1).max(4096)).optional(),
  dryRun: z.boolean().optional(),
});

function maskToken(s: string): string {
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function logUsageLine(cfg: AiEnvConfig, msg: string, extra?: Record<string, unknown>): void {
  if (!cfg.logUsage) return;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), channel: "ai_usage", msg, ...extra }));
}

function createLimiter() {
  return rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests, slow down." },
  });
}

export function createAiRouter(): Router {
  const router = express.Router();
  const cfg = loadAiEnv();
  const store = new JobStore(cfg);

  const limiter = createLimiter();
  router.use(limiter);

  router.post("/jobs", async (req: Request, res: Response) => {
    const parsed = createJobBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;
    const baseInput = body.input ? { ...body.input } : {};
    if (body.dryRun) {
      (baseInput as Record<string, unknown>).__biolabsDryRun = true;
    }
    const job = await store.create(body.service, baseInput);
    logUsageLine(cfg, "job_created", { jobId: job.id, service: job.service, dryRun: !!body.dryRun });
    scheduleJob(job.id, store, cfg);
    res.status(202).json({ job });
  });

  router.get("/jobs/:id", async (req: Request, res: Response) => {
    const job = await store.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ job });
  });

  router.get("/jobs/:id/stream", async (req: Request, res: Response) => {
    const job = await store.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send({ type: "snapshot", job });

    if (job.status === "completed" || job.status === "failed") {
      send({ type: "done", job });
      res.end();
      return;
    }

    const unsub = subscribeJob(job.id, (j) => {
      send({ type: "update", job: j });
      if (j.status === "completed" || j.status === "failed") {
        send({ type: "done", job: j });
        res.end();
      }
    });

    req.on("close", () => {
      unsub();
    });
  });

  router.get("/pipelines", (_req: Request, res: Response) => {
    res.json({ pipelines: PRESET_PIPELINES });
  });

  router.post("/pipelines/:presetId/run", async (req: Request, res: Response) => {
    const presetId = req.params.presetId;
    const parsed = runPipelineBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
      return;
    }
    const { sequence, sequences, dryRun } = parsed.data;

    if (presetId === "fasta_msa_af3") {
      if (!sequence?.trim()) {
        res.status(400).json({ error: "fasta_msa_af3 requires `sequence`" });
        return;
      }
      try {
        const out = await runFastaMsaAf3Pipeline(store, sequence, dryRun ?? false);
        if (!out.ok) {
          res.status(500).json(out);
          return;
        }
        logUsageLine(cfg, "pipeline_run", {
          presetId: out.presetId,
          msaJobId: out.msaJob.id,
          foldJobId: out.foldJob.id,
          dryRun: !!dryRun,
        });
        res.status(200).json(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        res.status(500).json({ ok: false, presetId: req.params.presetId ?? "unknown", error: msg });
      }
      return;
    }

    if (presetId === "paired_msa_boltz2") {
      if (!sequences || Object.keys(sequences).length < 2) {
        res.status(400).json({ error: "paired_msa_boltz2 requires `sequences` with at least two chains" });
        return;
      }
      try {
        const out = await runPairedMsaBoltz2Pipeline(store, sequences, dryRun ?? false);
        if (!out.ok) {
          res.status(500).json(out);
          return;
        }
        logUsageLine(cfg, "pipeline_run", {
          presetId: out.presetId,
          msaJobId: out.msaJob.id,
          foldJobId: out.foldJob.id,
          dryRun: !!dryRun,
        });
        res.status(200).json(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        res.status(500).json({ ok: false, presetId: req.params.presetId ?? "unknown", error: msg });
      }
      return;
    }

    res.status(404).json({ error: "Unknown preset" });
  });

  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      apiKeyConfigured: Boolean(cfg.apiKey),
      keyHint: cfg.apiKey ? maskToken(cfg.apiKey) : null,
      routing: nvidiaRoutingDebugInfo(cfg.baseUrl, cfg.paths),
    });
  });

  return router;
}
