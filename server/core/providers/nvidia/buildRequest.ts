/**
 * NVIDIA NIM request bodies — strip UI-only fields, validate, map to official OpenAPI shapes.
 *
 * Spec index: https://docs.api.nvidia.com/nim/reference/healthcare-apis
 */

/** Keys that must never be forwarded to NVIDIA. */
export function stripBiolabsUiMeta(input: Record<string, unknown>): Record<string, unknown> {
  const out = { ...input };
  delete out.note;
  delete out.cmdPalette;
  delete out.mode;
  delete out.__biolabsDryRun;
  delete out.msa_alignment_text;
  delete out.use_external_msa;
  return out;
}

export type BuildRequestResult<T = unknown> = { ok: true; body: T } | { ok: false; error: string };

/** Standard protein alphabet + X (NIM MSA docs). */
const AA_RE = /^[ARNDCQEGHILKMFPSTWYVX]+$/i;
const DNA_RE = /^[ACGT]+$/i;

const GENMOL_DEFAULT_SMILES = "[C@H]1O[C@@H](CO)[C@H](O)[C@@H]1O.[*{15-15}]";

/** ColabFold MSA Search POST /biology/colabfold/msa-search/predict */
export function buildMsaRequest(input: Record<string, unknown>): BuildRequestResult {
  const base = stripBiolabsUiMeta({ ...input });
  let sequence = typeof base.sequence === "string" ? base.sequence.trim() : "";
  if (!sequence && typeof base.query === "string") sequence = base.query.trim();
  if (!sequence) {
    return { ok: false, error: "msa_search: missing required `sequence` (protein, 1–4096 aa)" };
  }
  if (sequence.length < 1 || sequence.length > 4096) {
    return { ok: false, error: `msa_search: sequence length ${sequence.length} out of range (1–4096)` };
  }
  if (!AA_RE.test(sequence)) {
    return { ok: false, error: "msa_search: sequence must use standard amino-acid letters plus X" };
  }

  const body: Record<string, unknown> = {
    sequence: sequence.toUpperCase(),
    output_alignment_formats: Array.isArray(base.output_alignment_formats)
      ? base.output_alignment_formats
      : ["a3m"],
    search_type: typeof base.search_type === "string" ? base.search_type : "colabfold",
  };
  if (base.databases != null) body.databases = base.databases;
  if (typeof base.e_value === "number") body.e_value = base.e_value;
  if (typeof base.iterations === "number") body.iterations = base.iterations;
  if (typeof base.max_msa_sequences === "number") body.max_msa_sequences = base.max_msa_sequences;

  return { ok: true, body };
}

/** Paired MSA — POST /biology/colabfold/msa-search/paired/predict (multimer / co-evolution). */
export function buildPairedMsaRequest(input: Record<string, unknown>): BuildRequestResult {
  const base = stripBiolabsUiMeta({ ...input });
  const rawSeq = base.sequences;

  const lengthError = (seq: string, chainLabel: string): BuildRequestResult | null =>
    seq.length > 4096
      ? { ok: false, error: `msa_search_paired: chain ${chainLabel} exceeds 4096 residues` }
      : null;

  if (Array.isArray(rawSeq)) {
    const arr: string[] = [];
    for (let i = 0; i < rawSeq.length; i++) {
      const item = rawSeq[i];
      if (typeof item !== "string") {
        return { ok: false, error: "msa_search_paired: sequences array must contain only strings" };
      }
      const s = item.trim().toUpperCase();
      if (!s) continue;
      const lenErr = lengthError(s, String(i));
      if (lenErr) return lenErr;
      if (!AA_RE.test(s)) {
        return { ok: false, error: "msa_search_paired: each sequence must use standard amino-acid letters plus X" };
      }
      arr.push(s);
    }
    if (arr.length < 2) {
      return { ok: false, error: "msa_search_paired: need at least two non-empty protein sequences in array" };
    }
    const body: Record<string, unknown> = { sequences: arr };
    if (base.databases != null) body.databases = base.databases;
    if (typeof base.pairing_strategy === "string") body.pairing_strategy = base.pairing_strategy;
    if (typeof base.unpack === "boolean") body.unpack = base.unpack;
    if (typeof base.e_value === "number") body.e_value = base.e_value;
    if (typeof base.max_msa_sequences === "number") body.max_msa_sequences = base.max_msa_sequences;
    return { ok: true, body };
  }

  if (rawSeq && typeof rawSeq === "object" && !Array.isArray(rawSeq)) {
    const rec: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawSeq as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const s = v.trim().toUpperCase();
      if (!s) continue;
      const lenErr = lengthError(s, k);
      if (lenErr) return lenErr;
      if (!AA_RE.test(s)) {
        return { ok: false, error: `msa_search_paired: sequence for chain ${k} must use standard amino acids plus X` };
      }
      rec[k] = s;
    }
    if (Object.keys(rec).length < 2) {
      return { ok: false, error: "msa_search_paired: need at least two chains with valid sequences" };
    }
    const body: Record<string, unknown> = { sequences: rec };
    if (base.databases != null) body.databases = base.databases;
    if (typeof base.pairing_strategy === "string") body.pairing_strategy = base.pairing_strategy;
    if (typeof base.unpack === "boolean") body.unpack = base.unpack;
    if (typeof base.e_value === "number") body.e_value = base.e_value;
    if (typeof base.max_msa_sequences === "number") body.max_msa_sequences = base.max_msa_sequences;
    return { ok: true, body };
  }

  return {
    ok: false,
    error: "msa_search_paired: missing required `sequences` (array of 2+ strings, or chain id → sequence record)",
  };
}

/**
 * OpenFold3 — POST /biology/openfold/openfold3/predict
 * Minimal demo uses CSV MSA (matches NVIDIA cloud samples); full `inputs` pass-through if present.
 */
export function buildOpenFold3Request(input: Record<string, unknown>): BuildRequestResult {
  const msaA3m = typeof input.msa_alignment_text === "string" ? input.msa_alignment_text.trim() : "";
  const useExternal = input.use_external_msa === true;

  const base = stripBiolabsUiMeta({ ...input });
  if (Array.isArray(base.inputs)) {
    return { ok: true, body: base };
  }
  const seq = typeof base.sequence === "string" ? base.sequence.trim() : "";
  if (!seq) {
    return { ok: false, error: "alphafold3: send official `inputs` or a top-level `sequence` for the demo builder" };
  }
  if (seq.length > 4096) {
    return { ok: false, error: "alphafold3: sequence exceeds 4096 residues" };
  }
  if (!AA_RE.test(seq)) {
    return { ok: false, error: "alphafold3: sequence must use standard amino-acid letters plus X" };
  }

  const upper = seq.toUpperCase();
  const inputId = typeof base.input_id === "string" ? base.input_id : "biolabs-demo";

  if (useExternal) {
    if (!msaA3m) {
      return { ok: false, error: "alphafold3: use_external_msa requires non-empty msa_alignment_text (A3M/FASTA)" };
    }
    const body = {
      request_id: typeof base.request_id === "string" ? base.request_id : inputId,
      inputs: [
        {
          input_id: inputId,
          molecules: [
            {
              type: "protein",
              sequence: upper,
              msa: {
                main_db: {
                  a3m: {
                    alignment: msaA3m,
                    format: "a3m",
                  },
                },
              },
            },
          ],
          diffusion_samples: typeof base.diffusion_samples === "number" ? base.diffusion_samples : 1,
          output_format: typeof base.output_format === "string" ? base.output_format : "cif",
        },
      ],
    };
    return { ok: true, body };
  }

  const csv = `key,sequence\n-1,${upper}\n-1,${upper}\n`;

  const body = {
    request_id: typeof base.request_id === "string" ? base.request_id : inputId,
    inputs: [
      {
        input_id: inputId,
        molecules: [
          {
            type: "protein",
            sequence: upper,
            msa: {
              main_db: {
                csv: {
                  alignment: csv,
                  format: "csv",
                },
              },
            },
          },
        ],
        diffusion_samples: typeof base.diffusion_samples === "number" ? base.diffusion_samples : 1,
        output_format: typeof base.output_format === "string" ? base.output_format : "cif",
      },
    ],
  };
  return { ok: true, body };
}

/** Arc Evo2-40b — POST /biology/arc/evo2-40b/generate */
export function buildEvo2Request(input: Record<string, unknown>): BuildRequestResult {
  const base = stripBiolabsUiMeta({ ...input });
  let sequence = typeof base.sequence === "string" ? base.sequence.trim().toUpperCase() : "";
  if (!sequence) {
    return { ok: false, error: "evo2_40b: missing required DNA `sequence` (A,C,G,T only per NIM generate API)" };
  }
  if (!DNA_RE.test(sequence)) {
    return { ok: false, error: "evo2_40b: sequence must be DNA (A,C,G,T) only" };
  }

  const body: Record<string, unknown> = { sequence };
  const nt = base.num_tokens ?? 48;
  body.num_tokens = typeof nt === "string" ? Number(nt) : nt;
  if (typeof base.temperature === "number") body.temperature = base.temperature;
  if (typeof base.top_k === "number") body.top_k = base.top_k;
  if (typeof base.top_p === "number") body.top_p = base.top_p;
  if (typeof base.random_seed === "number") body.random_seed = base.random_seed;

  return { ok: true, body };
}

/** MIT Boltz2 — POST /biology/mit/boltz2/predict */
export function buildBoltz2Request(input: Record<string, unknown>): BuildRequestResult {
  const msaA3m = typeof input.msa_alignment_text === "string" ? input.msa_alignment_text.trim() : "";
  const useExternal = input.use_external_msa === true;

  const base = stripBiolabsUiMeta({ ...input });
  if (Array.isArray(base.polymers)) {
    return { ok: true, body: base };
  }
  const seq = typeof base.sequence === "string" ? base.sequence.trim() : "";
  if (!seq) {
    return { ok: false, error: "boltz2: send `polymers` array or top-level `sequence` for minimal protein demo" };
  }
  if (seq.length > 4096) {
    return { ok: false, error: "boltz2: sequence exceeds 4096 residues" };
  }
  if (!AA_RE.test(seq)) {
    return { ok: false, error: "boltz2: sequence must use standard amino-acid letters plus X" };
  }
  const upper = seq.toUpperCase();
  if (useExternal && !msaA3m) {
    return { ok: false, error: "boltz2: use_external_msa requires non-empty msa_alignment_text" };
  }
  const alignment = useExternal && msaA3m ? msaA3m : `>query\n${upper}`;
  const body: Record<string, unknown> = {
    polymers: [
      {
        id: "A",
        molecule_type: "protein",
        sequence: upper,
        msa: {
          uniref90: {
            a3m: {
              alignment,
              format: "a3m",
            },
          },
        },
      },
    ],
  };
  if (typeof base.recycling_steps === "number") body.recycling_steps = base.recycling_steps;
  if (typeof base.sampling_steps === "number") body.sampling_steps = base.sampling_steps;
  if (typeof base.diffusion_samples === "number") body.diffusion_samples = base.diffusion_samples;
  return { ok: true, body };
}

/** NVIDIA GenMol — POST /biology/nvidia/genmol/generate */
export function buildGenmolRequest(input: Record<string, unknown>): BuildRequestResult {
  const base = stripBiolabsUiMeta({ ...input });
  if (typeof base.smiles === "string" && base.smiles.trim() === "") {
    return { ok: false, error: "genmol: `smiles` must be non-empty (masked SAFE/SMILES)" };
  }
  let smiles = typeof base.smiles === "string" ? base.smiles.trim() : "";
  if (!smiles) smiles = GENMOL_DEFAULT_SMILES;

  const body: Record<string, unknown> = { smiles };
  const nm = base.num_molecules ?? 5;
  body.num_molecules = typeof nm === "string" ? Number(nm) : nm;
  if (typeof base.temperature === "number") body.temperature = base.temperature;
  if (typeof base.noise === "number") body.noise = base.noise;
  if (typeof base.step_size === "number") body.step_size = base.step_size;
  if (typeof base.scoring === "string") body.scoring = base.scoring;
  if (typeof base.unique === "boolean") body.unique = base.unique;

  return { ok: true, body };
}
