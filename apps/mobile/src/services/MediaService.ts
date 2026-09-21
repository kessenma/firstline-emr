// apps/mobile/src/services/MediaService.ts
// Centralized media fetch + cache service for all media types.
// Downloads files from object storage via signed URLs, converts to base64 data URIs,
// and caches in both memory and SQLite for offline access.
//
// Replaces the fragmented implementations in:
//   - TelegramMediaCacheService.ts (telegram media)
//   - PatientMediaService.ts (patient photos)
//   - useMissionMedia.ts (mission attachments)
//   - useMediaManager.ts (internal message media)

import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TABLES } from '../db';

// ── Types ──

export type DbService = {
  execute: (sql: string, params?: any[]) => Promise<any>;
  query: (sql: string, params?: any[]) => Promise<any[]>;
};

// ── Module-scoped state ──

// In-memory cache for hot media (avoids SQLite reads on every render)
const memoryCache = new Map<string, string>();

// Track in-flight downloads to avoid duplicate fetches
const inflightDownloads = new Map<string, Promise<string | null>>();

// Track failed downloads to avoid hammering the server every 5s
const failureCache = new Map<string, number>();
const FAILURE_COOLDOWN_MS = 60_000; // Retry failed downloads after 1 minute

// ── Private helpers ──

/** Convert a Blob to a base64 data URI using FileReader (Hermes-safe) */
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Build the API URL for getting a signed URL */
function buildSignedUrlEndpoint(filePath: string, variant?: 'thumb'): string {
  const encodedPath = encodeURIComponent(filePath);
  const variantParam = variant ? `&variant=${variant}` : '';
  return getApiUrl(`/media/get-signed-url?filePath=${encodedPath}${variantParam}`);
}

// ── Public API ──

/**
 * Get a locally-cached data URI for a media file.
 * Checks memory cache first, then SQLite. Returns null if not cached.
 * This is a read-only operation — no network requests.
 */
export async function getCachedMedia(
  filePath: string,
  db: DbService,
): Promise<string | null> {
  if (!filePath) return null;

  // 1. Memory cache (instant)
  const mem = memoryCache.get(filePath);
  if (mem) return mem;

  // 2. SQLite media_cache (persistent)
  try {
    const rows = await db.query(
      `SELECT data_uri FROM ${TABLES.MEDIA_CACHE} WHERE id = ? LIMIT 1`,
      [filePath],
    );
    if (rows.length > 0 && rows[0].data_uri) {
      memoryCache.set(filePath, rows[0].data_uri);
      return rows[0].data_uri;
    }
  } catch {
    // Table might not exist yet on first run
  }

  return null;
}

/**
 * Get a signed URL for a media file (no download/cache).
 * Useful when you need the URL directly (e.g. for <Image> source).
 *
 * Pass `variant: 'thumb'` for a downscaled preview — the server generates one
 * lazily. It returns null when no thumbnail is possible (HEIC, oversized or
 * corrupt sources), so callers should fall back to the full-size URL.
 */
export async function getSignedUrl(
  filePath: string,
  opts?: { variant?: 'thumb' },
): Promise<string | null> {
  if (!filePath) return null;

  try {
    const token = await getStoredToken();
    if (!token) return null;

    const response = await fetch(buildSignedUrlEndpoint(filePath, opts?.variant), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.warn(`[MediaService] getSignedUrl failed for ${filePath}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.signedUrl || null;
  } catch (err) {
    console.warn('[MediaService] getSignedUrl error:', err);
    return null;
  }
}

/**
 * Download a media file, convert to base64 data URI, and cache it.
 *
 * Flow:
 *   1. Check memory cache → SQLite cache
 *   2. Check failure cooldown (don't retry too quickly)
 *   3. De-duplicate concurrent downloads
 *   4. Get signed URL from API
 *   5. Download file from S3 signed URL
 *   6. Convert blob → base64 data URI
 *   7. Cache in memory + SQLite
 */
export async function fetchMedia(
  filePath: string,
  db: DbService,
): Promise<string | null> {
  if (!filePath) return null;

  // Already cached?
  const existing = await getCachedMedia(filePath, db);
  if (existing) return existing;

  // Check failure cooldown
  const lastFailure = failureCache.get(filePath);
  if (lastFailure && Date.now() - lastFailure < FAILURE_COOLDOWN_MS) {
    return null;
  }

  // De-duplicate concurrent downloads
  const inflight = inflightDownloads.get(filePath);
  if (inflight) return inflight;

  const downloadPromise = (async (): Promise<string | null> => {
    try {
      const token = await getStoredToken();
      if (!token) return null;

      // Step 1: Get a signed URL from the API
      const metaResponse = await fetch(buildSignedUrlEndpoint(filePath), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!metaResponse.ok) {
        console.warn(`[MediaService] get-signed-url failed for ${filePath}: ${metaResponse.status}`);
        failureCache.set(filePath, Date.now());
        return null;
      }

      const metaData = await metaResponse.json();
      const signedUrl = metaData.signedUrl;
      if (!signedUrl) {
        console.warn(`[MediaService] No signedUrl returned for ${filePath}`);
        failureCache.set(filePath, Date.now());
        return null;
      }

      // Step 2: Download the file from S3
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        console.warn(`[MediaService] S3 download failed for ${filePath}: ${fileResponse.status}`);
        failureCache.set(filePath, Date.now());
        return null;
      }

      const blob = await fileResponse.blob();
      if (blob.size === 0) {
        failureCache.set(filePath, Date.now());
        return null;
      }

      // Step 3: Convert to base64 data URI
      const dataUri = await blobToDataUri(blob);

      const contentType =
        fileResponse.headers.get('content-type') || blob.type || 'application/octet-stream';

      // Step 4: Cache in memory + SQLite
      memoryCache.set(filePath, dataUri);

      try {
        await db.execute(
          `INSERT OR REPLACE INTO ${TABLES.MEDIA_CACHE} (id, data_uri, content_type, file_size, cached_at)
           VALUES (?, ?, ?, ?, ?)`,
          [filePath, dataUri, contentType, blob.size, new Date().toISOString()],
        );
      } catch (dbErr) {
        console.warn('[MediaService] SQLite write failed:', dbErr);
      }

      // Clear failure cache on success
      failureCache.delete(filePath);

      return dataUri;
    } catch (err) {
      console.warn('[MediaService] fetchMedia failed for', filePath, err);
      failureCache.set(filePath, Date.now());
      return null;
    } finally {
      inflightDownloads.delete(filePath);
    }
  })();

  inflightDownloads.set(filePath, downloadPromise);
  return downloadPromise;
}

/**
 * Pre-warm the memory cache from SQLite for a batch of file paths.
 * Call on mount to avoid per-image SQLite queries during rendering.
 */
export async function preloadMediaCache(
  filePaths: string[],
  db: DbService,
): Promise<void> {
  const uncached = filePaths.filter(url => url && !memoryCache.has(url));
  if (uncached.length === 0) return;

  try {
    const placeholders = uncached.map(() => '?').join(',');
    const rows = await db.query(
      `SELECT id, data_uri FROM ${TABLES.MEDIA_CACHE} WHERE id IN (${placeholders})`,
      uncached,
    );

    for (const row of rows) {
      if (row.id && row.data_uri) {
        memoryCache.set(row.id, row.data_uri);
      }
    }
  } catch {
    // Table might not exist yet
  }
}

/** Clear all cached media (memory + SQLite) */
export async function clearMediaCache(db: DbService): Promise<void> {
  memoryCache.clear();
  failureCache.clear();
  try {
    await db.execute(`DELETE FROM ${TABLES.MEDIA_CACHE}`);
  } catch {
    // ignore
  }
}
