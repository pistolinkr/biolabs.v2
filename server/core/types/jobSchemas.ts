import { z } from "zod";

/** External job service kinds (maps to NVIDIA adapters). */
export const jobServiceSchema = z.enum([
  "alphafold3",
  "msa_search",
  "msa_search_paired",
  "evo2_40b",
  "boltz2",
  "genmol",
  "local_echo",
]);

export type JobService = z.infer<typeof jobServiceSchema>;

export const jobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobRecordSchema = z.object({
  id: z.string(),
  service: jobServiceSchema,
  status: jobStatusSchema,
  progress: z.number().min(0).max(100).default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  logs: z.array(z.string()).default([]),
  error: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
  providerJobId: z.string().optional(),
});

export type JobRecord = z.infer<typeof jobRecordSchema>;

export const createJobBodySchema = z.object({
  service: jobServiceSchema,
  input: z.record(z.string(), z.unknown()).optional(),
  /** If true, run local stub only (no NVIDIA key required) */
  dryRun: z.boolean().optional(),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;
