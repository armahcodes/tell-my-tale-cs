/**
 * Gorgias Widget Cache
 * Shared in-memory TTL cache for widget data, accessible from
 * both the widget GET endpoint and the actions POST endpoint.
 */

interface CacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
}

const widgetCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function getCached(email: string): Record<string, unknown> | null {
  const entry = widgetCache.get(email);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  if (entry) widgetCache.delete(email);
  return null;
}

export function setCache(email: string, data: Record<string, unknown>): void {
  widgetCache.set(email, { data, timestamp: Date.now() });

  // Evict stale entries to prevent unbounded growth
  if (widgetCache.size > 500) {
    const now = Date.now();
    for (const [key, entry] of widgetCache) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        widgetCache.delete(key);
      }
    }
  }
}

export function invalidateCache(email: string): boolean {
  return widgetCache.delete(email);
}
