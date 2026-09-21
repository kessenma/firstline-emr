// apps/web/lib/storage/storage-index.ts
//
// An in-memory index of every object in the bucket, built from one full listing
// and reused across requests.
//
// Why an index instead of paging S3 directly: the admin browser sorts by name,
// size, and date across the *whole* category. S3's ListObjectsV2 returns keys in
// lexicographic order only, so serving a page straight from S3 would sort within
// that page and silently lie about the rest. Scanning once and slicing locally
// makes sorting and page numbers correct, and it lets the stats endpoint reuse
// the same pass instead of scanning again.
//
// The scan is O(objects) — roughly one request per 1000 keys. At current volume
// (~150 MB) that is a handful of requests, and the TTL keeps it off the hot path.

import {
  STORAGE_CATEGORIES,
  type StorageCategoryId,
  type StorageCategoryStats,
  type StorageStats,
} from "@fajr/shared/admin";
import { storageService } from "./storage-service";
import { THUMBS_SEGMENT } from "./thumbnails";

export interface IndexedObject {
  key: string;
  fileName: string;
  size: number;
  lastModified: Date | undefined;
  mimeType: string;
  categoryId: StorageCategoryId;
  /** Owning entity id parsed from the key (patient / chat / thread / user). */
  scopeId: string | undefined;
  /**
   * True for derived thumbnails under `{env}/thumbs/`. They carry the category
   * of their original but are excluded from category stats and hidden from
   * listings unless explicitly requested.
   */
  isThumb: boolean;
}

export interface StorageIndex {
  /** Categorized media objects, browsable in the admin UI. */
  objects: IndexedObject[];
  /** Every byte under the environment prefix, including backups and uncategorized keys. */
  totalBytes: number;
  totalFiles: number;
  categories: StorageCategoryStats[];
  /** True when the listing hit its cap or errored — totals are a floor, not exact. */
  truncated: boolean;
  builtAt: Date;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: StorageIndex | null = null;
// Concurrent requests during a cold cache share one scan rather than each
// kicking off their own full listing.
let inFlight: Promise<StorageIndex> | null = null;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

/** Object storage keys carry no content type, so infer it from the extension. */
function mimeTypeFor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// Uploads are stored as `{timestamp}-{originalName}` (see buildFilePath), where
// the timestamp is an ISO string with `:` and `.` swapped for `-`. Strip it so
// admins see the name the uploader chose.
const UPLOAD_TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-/;

function stripTimestamp(fileName: string): string {
  return fileName.replace(UPLOAD_TIMESTAMP_PREFIX, "");
}

/**
 * Match a key (already stripped of its environment prefix) to a category.
 * Returns undefined for keys outside the media taxonomy — backups, setup-temp,
 * and anything a future upload path adds without registering a category.
 */
function categorize(
  relativeKey: string,
): { categoryId: StorageCategoryId; prefix: string } | undefined {
  for (const category of STORAGE_CATEGORIES) {
    for (const prefix of category.prefixes) {
      if (relativeKey.startsWith(prefix)) {
        return { categoryId: category.id, prefix };
      }
    }
  }
  return undefined;
}

/**
 * The environment prefix the admin browser lists under.
 *
 * Defaults to this instance's own prefix (dev/staging/prod, from NODE_ENV).
 * `OBJECT_STORAGE_BROWSE_PREFIX` overrides it so a local dev server can inspect
 * another environment's objects — without it, browsing locally shows almost
 * nothing, because uploads from a dev instance are rare and everything real
 * lives under `prod/`.
 *
 * Deliberately read-only: uploads still use storageService's own prefix, so
 * setting this can never cause a dev instance to write into another
 * environment's tree.
 */
export function getBrowsePrefix(): string {
  const override = process.env.OBJECT_STORAGE_BROWSE_PREFIX?.trim();
  return override || storageService.getEnvironmentPrefix();
}

async function buildIndex(): Promise<StorageIndex> {
  const env = getBrowsePrefix();
  const { files, truncated } = await storageService.listAllFiles(`${env}/`);

  const objects: IndexedObject[] = [];
  const byCategory = new Map<
    StorageCategoryId,
    { fileCount: number; totalBytes: number }
  >();
  for (const category of STORAGE_CATEGORIES) {
    byCategory.set(category.id, { fileCount: 0, totalBytes: 0 });
  }

  let totalBytes = 0;

  for (const file of files) {
    // Every byte counts toward usage, even uncategorized ones — the quota bar
    // is about disk, not about what happens to be browsable.
    totalBytes += file.size;

    const relativeKey = file.key.slice(env.length + 1);

    // Thumbnails mirror the original tree under `thumbs/` — categorize them
    // by the original's prefix, but keep them out of category stats so those
    // numbers keep answering "how much patient media", not "plus artifacts".
    const isThumb = relativeKey.startsWith(`${THUMBS_SEGMENT}/`);
    const categorizableKey = isThumb
      ? relativeKey.slice(THUMBS_SEGMENT.length + 1)
      : relativeKey;

    const match = categorize(categorizableKey);
    if (!match) continue;

    const remainder = categorizableKey.slice(match.prefix.length);
    const segments = remainder.split("/");
    const rawFileName = segments[segments.length - 1];
    if (!rawFileName) continue; // directory marker, not an object

    const fileName = stripTimestamp(rawFileName);

    if (!isThumb) {
      const bucket = byCategory.get(match.categoryId)!;
      bucket.fileCount += 1;
      bucket.totalBytes += file.size;
    }

    objects.push({
      key: file.key,
      fileName,
      size: file.size,
      lastModified: file.lastModified,
      mimeType: mimeTypeFor(fileName),
      categoryId: match.categoryId,
      // Keys are `{prefix}/{scopeId}/{file}`; a single segment means the
      // category has no per-entity scoping (e.g. admin-notifications).
      scopeId: segments.length > 1 ? segments[0] : undefined,
      isThumb,
    });
  }

  return {
    objects,
    totalBytes,
    totalFiles: files.length,
    categories: STORAGE_CATEGORIES.map((category) => ({
      id: category.id,
      ...byCategory.get(category.id)!,
    })),
    truncated,
    builtAt: new Date(),
  };
}

/**
 * Get the storage index, rebuilding it when stale.
 *
 * @param force - Bypass the TTL. Used by the refresh control in the admin UI so
 *                an admin who just deleted something is not told to wait 5 min.
 */
export async function getStorageIndex(force = false): Promise<StorageIndex> {
  const isFresh =
    cached !== null && Date.now() - cached.builtAt.getTime() < CACHE_TTL_MS;

  if (isFresh && !force) return cached!;
  if (inFlight && !force) return inFlight;

  inFlight = buildIndex()
    .then((index) => {
      cached = index;
      return index;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Drop the cache so the next read rebuilds. Call after mutating the bucket. */
export function invalidateStorageIndex(): void {
  cached = null;
}

/**
 * Shape an index into the StorageStats both clients render.
 *
 * `totalSize` is the configured budget (OBJECT_STORAGE_QUOTA_BYTES), not disk
 * capacity — S3 cannot report free space, and RustFS shares its volume with
 * Postgres and everything else on the host. When no quota is set, `hasQuota` is
 * false and clients must show counts instead of a percentage rather than
 * dividing by zero.
 */
export function buildStorageStats(index: StorageIndex): StorageStats {
  const quotaRaw = Number(process.env.OBJECT_STORAGE_QUOTA_BYTES);
  const quota = Number.isFinite(quotaRaw) && quotaRaw > 0 ? quotaRaw : 0;

  return {
    totalSize: quota,
    totalFiles: index.totalFiles,
    usedSpace: index.totalBytes,
    availableSpace: quota > 0 ? Math.max(0, quota - index.totalBytes) : 0,
    bucketName: process.env.OBJECT_STORAGE_BUCKET ?? "",
    lastUpdated: index.builtAt.toISOString(),
    hasQuota: quota > 0,
    categories: index.categories,
  };
}
