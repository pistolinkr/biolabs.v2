import type { ProteinSearchHit, ProteinSearchSource } from "@/lib/proteinApis";

export const SOURCE_SEARCH_STORAGE_KEY = "biolabs.workspace.sourceSearch.v1";

export interface SourceSearchPersisted {
  searchQuery: string;
  searchSource: ProteinSearchSource;
  hits: ProteinSearchHit[];
  error: string | null;
}

export function isNavigationReload(): boolean {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return false;
  }
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav?.type === "reload";
}

export function loadSourceSearchFromSession(): SourceSearchPersisted {
  const empty: SourceSearchPersisted = {
    searchQuery: "",
    searchSource: "rcsb",
    hits: [],
    error: null,
  };
  if (typeof window === "undefined") return empty;

  if (isNavigationReload()) {
    try {
      sessionStorage.removeItem(SOURCE_SEARCH_STORAGE_KEY);
    } catch {
      /* */
    }
    return empty;
  }

  try {
    const raw = sessionStorage.getItem(SOURCE_SEARCH_STORAGE_KEY);
    if (!raw) return empty;
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      searchQuery: typeof o.searchQuery === "string" ? o.searchQuery : "",
      searchSource: o.searchSource === "uniprot" ? "uniprot" : "rcsb",
      hits: Array.isArray(o.hits) ? (o.hits as ProteinSearchHit[]) : [],
      error: typeof o.error === "string" ? o.error : null,
    };
  } catch {
    return empty;
  }
}

export function saveSourceSearchToSession(data: SourceSearchPersisted): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SOURCE_SEARCH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
