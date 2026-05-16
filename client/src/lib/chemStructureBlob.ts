/** Guess NGL-friendly blob MIME + extension for inline chemical structure text. */
export function guessChemBlobTypeFromText(text: string, fileNameHint = ""): { mime: string; ext: string } {
  const lower = fileNameHint.toLowerCase();
  if (lower.endsWith(".cif") || lower.endsWith(".mmcif")) {
    return { mime: "chemical/x-mmcif", ext: ".cif" };
  }
  if (lower.endsWith(".pdb")) {
    return { mime: "chemical/x-pdb", ext: ".pdb" };
  }
  if (lower.endsWith(".mol2")) {
    return { mime: "chemical/x-mol2", ext: ".mol2" };
  }
  if (lower.endsWith(".sdf") || lower.endsWith(".mol")) {
    return { mime: "chemical/x-mdl-sdffile", ext: ".sdf" };
  }

  const t = text.trimStart();
  if (t.startsWith("data_")) {
    return { mime: "chemical/x-mmcif", ext: ".cif" };
  }
  if (t.startsWith("@<TRIPOS>")) {
    return { mime: "chemical/x-mol2", ext: ".mol2" };
  }
  if (t.includes("V2000") || t.includes("V3000") || t.includes("$$$$")) {
    return { mime: "chemical/x-mdl-sdffile", ext: ".sdf" };
  }
  if (t.startsWith("HEADER") || t.startsWith("ATOM") || t.startsWith("CRYST1")) {
    return { mime: "chemical/x-pdb", ext: ".pdb" };
  }
  return { mime: "chemical/x-mdl-sdffile", ext: ".sdf" };
}

export function extFromUrlPath(urlStr: string): string | null {
  try {
    const u = new URL(urlStr, "http://placeholder.local");
    const base = u.pathname.split("/").pop() ?? "";
    const m = base.match(/(\.[a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}
