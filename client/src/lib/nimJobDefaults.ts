import type { CreateAiJobBody } from "./aiApi";

/** Minimal valid NIM payloads for live demo (paths default to `/biology/...` on server). */
export function minimalLiveInput(service: CreateAiJobBody["service"]): Record<string, unknown> {
  const DEMO_PROT = "MKTVRQERLKSIVR";
  switch (service) {
    case "msa_search":
      return { sequence: DEMO_PROT, output_alignment_formats: ["a3m"] };
    case "msa_search_paired":
      return { sequences: { A: DEMO_PROT, B: "MKTVRQERLKSIVRK" }, pairing_strategy: "greedy" };
    case "alphafold3":
      return { sequence: DEMO_PROT };
    case "evo2_40b":
      return { sequence: "ATCGATCGATCGATCG", num_tokens: 48 };
    case "boltz2":
      return { sequence: DEMO_PROT };
    case "genmol":
      return {};
    case "local_echo":
      return {};
    default:
      return {};
  }
}

export function defaultInputJsonPretty(service: CreateAiJobBody["service"]): string {
  return JSON.stringify(minimalLiveInput(service), null, 2);
}
