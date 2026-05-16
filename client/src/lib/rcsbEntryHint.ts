/** Minimal RCSB entry labels for inspector (CORS avoided via Vite `/api/rcsb-data` proxy in dev). */

export interface RcsbEntryHint {
  pdbId: string;
  title: string;
  depositDate?: string;
}

function normalizePdbId(raw: string): string | null {
  const id = raw.trim().toUpperCase();
  if (/^[0-9][A-Z0-9]{3}$/.test(id)) return id;
  return null;
}

export async function fetchRcsbEntryHint(pdbId: string): Promise<RcsbEntryHint | null> {
  const id = normalizePdbId(pdbId);
  if (!id) return null;
  try {
    const res = await fetch(`/api/rcsb-data/rest/v1/core/entry/${id}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const struct = data.struct as Record<string, unknown> | undefined;
    const title = struct?.title;
    const dates = data.rcsb_entry_info as Record<string, unknown> | undefined;
    const depositDate = typeof dates?.deposit_date === "string" ? dates.deposit_date : undefined;
    return {
      pdbId: id,
      title: typeof title === "string" && title.length ? title : id,
      depositDate,
    };
  } catch {
    return null;
  }
}
