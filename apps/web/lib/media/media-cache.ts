// apps/web/lib/media/media-cache.ts
// Client-side signed URL cache for the web app.
// Signed URLs from RustFS are valid for 1 hour — we cache them for 45 minutes
// to avoid redundant /api/media/get-signed-url calls on every render.

interface CacheEntry {
  signedUrl: string;
  cachedAt: number;
}

// ── Module-scoped state ──

const urlCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes (URLs expire at 60 min)

// De-duplicate concurrent requests for the same filePath
const inflightRequests = new Map<string, Promise<string | null>>();

// ── Private helpers ──

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

async function fetchSignedUrl(filePath: string, proxy?: boolean): Promise<string | null> {
  const params = new URLSearchParams({ filePath });
  if (proxy) params.set('proxy', 'true');

  const res = await fetch(`/api/media/get-signed-url?${params.toString()}`);
  if (!res.ok) {
    console.warn(`[media-cache] get-signed-url failed for ${filePath}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data.signedUrl || null;
}

// ── Public API ──

/**
 * Get a signed URL for a media file, using the cache when possible.
 * Returns a cached URL if still valid, otherwise fetches a fresh one.
 * Concurrent requests for the same filePath share a single fetch.
 */
export async function getMediaUrl(filePath: string, proxy?: boolean): Promise<string | null> {
  if (!filePath) return null;

  // Check cache
  const cached = urlCache.get(filePath);
  if (cached && !isExpired(cached)) {
    return cached.signedUrl;
  }

  // De-duplicate concurrent requests
  const inflight = inflightRequests.get(filePath);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const signedUrl = await fetchSignedUrl(filePath, proxy);
      if (signedUrl) {
        urlCache.set(filePath, { signedUrl, cachedAt: Date.now() });
      }
      return signedUrl;
    } finally {
      inflightRequests.delete(filePath);
    }
  })();

  inflightRequests.set(filePath, request);
  return request;
}

/**
 * Resolve signed URLs for multiple file paths concurrently.
 * Returns a Map of filePath → signedUrl for successful resolutions.
 */
export async function getMediaUrls(filePaths: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  const entries = await Promise.all(
    filePaths.map(async (fp) => {
      const url = await getMediaUrl(fp);
      return [fp, url] as const;
    }),
  );

  for (const [fp, url] of entries) {
    if (url) results.set(fp, url);
  }

  return results;
}

/**
 * Invalidate a single cached URL (e.g. after re-uploading a file).
 */
export function invalidateMediaUrl(filePath: string): void {
  urlCache.delete(filePath);
}

/**
 * Clear the entire URL cache.
 */
export function clearMediaUrlCache(): void {
  urlCache.clear();
}
