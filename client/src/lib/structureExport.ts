import type { ProteinSelection } from "@/lib/proteinApis";
import { resolveStructure } from "@/lib/structureSources";

function safeBasename(sel: ProteinSelection): string {
  const base =
    sel.fileName?.replace(/[^\w.\-]+/g, "_") ??
    (sel.source === "rcsb" ? `${sel.id}` : sel.id.replace(/[^\w.\-]+/g, "_"));
  return base.endsWith(".cif") || base.endsWith(".pdb") ? base : `${base}.cif`;
}

/** Download coordinates for remote selections via the same URLs NGL uses. Local files: not re-fetched. */
export async function downloadStructureCoordinates(sel: ProteinSelection): Promise<void> {
  if (sel.source === "file") {
    throw new Error("Use the original file on disk — local upload is already your source.");
  }
  const resolved = await resolveStructure(sel);
  const res = await fetch(resolved.url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeBasename(sel);
  a.click();
  URL.revokeObjectURL(url);
}
