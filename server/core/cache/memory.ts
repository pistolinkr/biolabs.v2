/** In-memory TTL cache for normalized provider responses (optional). */
const map = new Map<string, { exp: number; value: unknown }>();

export function cacheGet(key: string): unknown | undefined {
  const row = map.get(key);
  if (!row) return undefined;
  if (Date.now() > row.exp) {
    map.delete(key);
    return undefined;
  }
  return row.value;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  map.set(key, { exp: Date.now() + ttlMs, value });
}
