/**
 * Arc Evo2-40b generate response — DNA continuation fields.
 * Breaking changes: arc/evo2 OpenAPI on Healthcare APIs catalog.
 */

import { z } from "zod";

const evoSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
  residueRef: z.string().optional(),
});

export const evo2VendorBodySchema = z
  .object({
    generated_sequence: z.string().optional(),
    generatedSequence: z.string().optional(),
    output_sequence: z.string().optional(),
    output: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    summary: z.string().optional(),
    answer: z.string().optional(),
    sections: z.array(z.record(z.string(), z.unknown())).optional(),
    analysis: z.array(z.record(z.string(), z.unknown())).optional(),
    blocks: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export type Evo2VendorBody = z.infer<typeof evo2VendorBodySchema>;

export function evo2SectionsFromVendor(raw: Record<string, unknown>): { sections: z.infer<typeof evoSectionSchema>[]; summary?: string } {
  const p = evo2VendorBodySchema.safeParse(raw);
  const o = p.success ? p.data : raw;
  const sections: z.infer<typeof evoSectionSchema>[] = [];

  const arr = (o as Evo2VendorBody).sections ?? (o as Evo2VendorBody).analysis ?? (o as Evo2VendorBody).blocks;
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const title =
        typeof row.title === "string" ? row.title : typeof row.heading === "string" ? row.heading : "Section";
      const body =
        typeof row.body === "string"
          ? row.body
          : typeof row.text === "string"
            ? row.text
            : typeof row.content === "string"
              ? row.content
              : JSON.stringify(row);
      const residueRef = typeof row.residueRef === "string" ? row.residueRef : undefined;
      sections.push({ title, body, residueRef });
    }
  }

  if (sections.length === 0 && typeof (o as Evo2VendorBody).output === "string") {
    sections.push({ title: "Model output", body: (o as Evo2VendorBody).output as string });
  }

  if (sections.length === 0) {
    const gen =
      (typeof (o as Evo2VendorBody).generated_sequence === "string" && (o as Evo2VendorBody).generated_sequence) ||
      (typeof (o as Evo2VendorBody).generatedSequence === "string" && (o as Evo2VendorBody).generatedSequence) ||
      (typeof (o as Evo2VendorBody).output_sequence === "string" && (o as Evo2VendorBody).output_sequence) ||
      undefined;
    if (gen) sections.push({ title: "Generated sequence", body: gen });
  }

  const summary =
    typeof (o as Evo2VendorBody).summary === "string"
      ? (o as Evo2VendorBody).summary
      : typeof (o as Evo2VendorBody).answer === "string"
        ? (o as Evo2VendorBody).answer
        : undefined;

  return { sections, summary };
}
