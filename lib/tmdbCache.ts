interface CacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const TTL = 300_000 // 5 dakika

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() })
}

/** Fetch with in-memory cache. URL = cache key. */
export async function fetchCached(url: string): Promise<unknown> {
  const hit = getCached(url)
  if (hit !== null) return hit
  const res = await fetch(url)
  const data = await res.json()
  setCached(url, data)
  return data
}
