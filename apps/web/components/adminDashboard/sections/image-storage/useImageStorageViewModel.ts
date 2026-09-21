'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  STORAGE_CATEGORIES,
  type StorageCategoryGroup,
  type StorageCategoryId,
  type StorageImage,
  type StorageOwnerDetails,
  type StorageStats,
} from '@fajr/shared/admin';

// Owner lookups keyed by category+scope, shared across tiles and pages —
// hovering ten files that belong to one patient should cost one request.
// Failed lookups cache as null; a remount retries because null entries are
// evicted on read.
const ownerDetailsCache = new Map<string, Promise<StorageOwnerDetails | null>>();

export type SortBy = 'uploadedAt' | 'fileName' | 'fileSize';
export type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 24;

// ── Listing cache ──
//
// Listings are keyed by their full query, so every distinct view (category,
// group, search, sort, page) gets its own entry. Toggling sort back and forth,
// paging backwards, or leaving the section and returning all hit the cache
// instead of the network.
//
// The cache lives at module scope, not in the hook, so it survives unmount —
// that is what makes returning to a section instant rather than merely making
// re-renders cheap.
//
// TTL matches lib/media/media-cache.ts for the same reason: the signed URLs
// embedded in a cached listing expire 60 minutes after the *server* minted
// them, so a 60-minute cache would happily serve a listing whose URLs die
// seconds later. The 15-minute gap is the safety margin.
const LIST_CACHE_TTL_MS = 45 * 60 * 1000;
// Roughly a session's worth of distinct views; bounded so a long session with
// heavy filtering cannot grow the map without limit.
const LIST_CACHE_MAX_ENTRIES = 60;

interface ListResult {
  images: StorageImage[];
  totalCount: number;
  totalPages: number;
  stats: StorageStats | null;
}

const listCache = new Map<string, { cachedAt: number; data: ListResult }>();
// Rapid toggling can fire the same request twice before the first resolves;
// sharing the in-flight promise collapses those into one round trip.
const listInFlight = new Map<string, Promise<ListResult>>();

function readListCache(key: string): ListResult | null {
  const entry = listCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > LIST_CACHE_TTL_MS) {
    listCache.delete(key);
    return null;
  }

  // Re-insert to move this key to the end — Map iterates in insertion order,
  // so the eviction loop below drops the least recently used.
  listCache.delete(key);
  listCache.set(key, entry);
  return entry.data;
}

function writeListCache(key: string, data: ListResult): void {
  listCache.set(key, { cachedAt: Date.now(), data });
  while (listCache.size > LIST_CACHE_MAX_ENTRIES) {
    const oldest = listCache.keys().next().value;
    if (oldest === undefined) break;
    listCache.delete(oldest);
  }
}

// Bumped on every cache clear. Requests capture it at start and refuse to write
// their result if it has moved on — otherwise a fetch already in flight when
// Refresh is clicked would resolve afterwards and quietly repopulate the cache
// with the pre-refresh data the admin just asked to discard.
let cacheGeneration = 0;

/**
 * Drop every cached listing. Called on explicit refresh, where the server also
 * rebuilds its index — keeping any client entry would show pre-refresh data in
 * whichever view the admin visited next.
 */
function clearListCache(): void {
  listCache.clear();
  listInFlight.clear();
  cacheGeneration += 1;
}

export function useImageStorageViewModel() {
  const { data: session } = useSession();
  const token = session?.user.token;

  const [images, setImages] = useState<StorageImage[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [group, setGroup] = useState<StorageCategoryGroup | null>(null);
  const [category, setCategory] = useState<StorageCategoryId | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // Thumbnail files are derived artifacts under thumbs/ — clutter, hidden by
  // default. The toggle exists mostly to verify generation is working.
  const [showThumbFiles, setShowThumbFiles] = useState(false);

  const [preview, setPreview] = useState<StorageImage | null>(null);

  // The console lives on its own host behind SSO — see the storage-admin proxy
  // in docker-compose.auth.yml. Kept as an escape hatch for bucket policies and
  // keys, which this browser deliberately does not touch.
  const consoleUrl =
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_RUSTFS_CONSOLE_URL
      : undefined) ?? 'https://storage-admin.fajrmission.org';

  const fetchPage = useCallback(
    async (targetPage: number, opts?: { refresh?: boolean; quiet?: boolean }) => {
      if (!token) return;

      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PAGE_SIZE),
        sortBy,
        order: sortOrder,
      });
      if (category) params.set('category', category);
      else if (group) params.set('group', group);
      if (search.trim()) params.set('search', search.trim());
      if (showThumbFiles) params.set('includeThumbs', 'true');

      // `refresh` is deliberately not part of the key — it is an instruction,
      // not a distinct view, and it clears the cache rather than populating a
      // separate entry.
      const cacheKey = params.toString();

      const apply = (data: ListResult) => {
        setImages(data.images);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setStats(data.stats);
        setPage(targetPage);
      };

      if (opts?.refresh) {
        clearListCache();
        params.set('refresh', 'true');
      } else {
        const hit = readListCache(cacheKey);
        if (hit) {
          // Applied without a spinner — a cache hit should feel like the data
          // was never gone. isLoading must still be cleared: it starts true, so
          // a hit on first mount would otherwise leave the skeleton up forever.
          setError(null);
          apply(hit);
          setIsLoading(false);
          return;
        }
      }

      try {
        if (opts?.refresh) setIsRefreshing(true);
        else if (!opts?.quiet) setIsLoading(true);
        setError(null);

        const generation = cacheGeneration;
        const pending =
          (!opts?.refresh && listInFlight.get(cacheKey)) ||
          (async (): Promise<ListResult> => {
            const res = await fetch(
              `/api/admin/GET/image-storage/list?${params.toString()}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );

            if (!res.ok) {
              throw new Error(
                res.status === 403
                  ? 'Admin access required to browse object storage.'
                  : `Failed to load storage (${res.status})`,
              );
            }

            const json = await res.json();
            return {
              images: json.images ?? [],
              totalCount: json.totalCount ?? 0,
              totalPages: json.totalPages ?? 1,
              stats: json.stats ?? null,
            };
          })();

        listInFlight.set(cacheKey, pending);

        try {
          const data = await pending;
          // A clear landed while this was in flight — the result describes the
          // world before the refresh, so neither cache it nor render it.
          if (cacheGeneration !== generation) return;
          writeListCache(cacheKey, data);
          apply(data);
        } finally {
          // Only clear the slot if it is still ours; a newer request for the
          // same key may have replaced it while this one was awaiting.
          if (listInFlight.get(cacheKey) === pending) {
            listInFlight.delete(cacheKey);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load storage');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, sortBy, sortOrder, category, group, search, showThumbFiles],
  );

  /**
   * Resolve who a stored object belongs to (patient / staff / system),
   * shaped for the owner popover. Cached per category+scope. `objectKey` lets
   * the server fall back to per-file lookups (e.g. legacy license keys that
   * carry no user id) — when provided, caching is per file instead.
   */
  const getOwnerDetails = useCallback(
    async (
      categoryId: string,
      scopeId?: string,
      objectKey?: string,
    ): Promise<StorageOwnerDetails | null> => {
      if (!token) return null;
      const cacheKey = `${categoryId}:${scopeId ?? ''}:${objectKey ?? ''}`;

      const cached = ownerDetailsCache.get(cacheKey);
      if (cached) {
        const value = await cached;
        if (value !== null) return value;
        ownerDetailsCache.delete(cacheKey); // failed earlier — allow a retry
      }

      const request = (async (): Promise<StorageOwnerDetails | null> => {
        try {
          const params = new URLSearchParams({ category: categoryId });
          if (scopeId) params.set('scopeId', scopeId);
          if (objectKey) params.set('key', objectKey);
          const res = await fetch(
            `/api/admin/GET/image-storage/owner?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) return null;
          return (await res.json()) as StorageOwnerDetails;
        } catch {
          return null;
        }
      })();

      ownerDetailsCache.set(cacheKey, request);
      return request;
    },
    [token],
  );

  /**
   * Resolve a thumbnail URL for an original object key, generating the
   * thumbnail server-side on first request. Returns null when none can be
   * made (HEIC, oversized, corrupt) — the tile shows its "no preview" state.
   */
  const getThumbUrl = useCallback(
    async (key: string): Promise<string | null> => {
      if (!token) return null;
      try {
        const res = await fetch(
          `/api/media/get-signed-url?filePath=${encodeURIComponent(key)}&variant=thumb`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.signedUrl ?? null;
      } catch {
        return null;
      }
    },
    [token],
  );

  // Reload from page 1 whenever a filter or sort changes. Debounced so typing in
  // the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPage(1);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchPage, search]);

  // Refresh is the escape hatch from every cache in this section: the server
  // rebuilds its storage index, and the client drops listings and owner lookups
  // so nothing pre-refresh survives into the next view the admin opens.
  // Thumb URLs are left alone — they are content-addressed by key and self-heal
  // when a signed URL expires, so discarding them would only cost refetches.
  const refresh = useCallback(() => {
    ownerDetailsCache.clear();
    return fetchPage(page, { refresh: true });
  }, [fetchPage, page]);

  const goToPage = useCallback(
    (target: number) => {
      if (target < 1 || target > totalPages) return;
      fetchPage(target, { quiet: true });
    },
    [fetchPage, totalPages],
  );

  const selectCategory = useCallback((id: StorageCategoryId | null) => {
    setCategory(id);
    setGroup(null);
  }, []);

  const selectGroup = useCallback((g: StorageCategoryGroup | null) => {
    setGroup(g);
    setCategory(null);
  }, []);

  const toggleSortOrder = useCallback(
    () => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')),
    [],
  );

  const openConsole = useCallback(() => {
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  }, [consoleUrl]);

  // Per-category counts for the nav, keyed for O(1) lookup while rendering.
  const categoryStats = useMemo(() => {
    const map = new Map<StorageCategoryId, { fileCount: number; totalBytes: number }>();
    for (const c of stats?.categories ?? []) {
      map.set(c.id, { fileCount: c.fileCount, totalBytes: c.totalBytes });
    }
    return map;
  }, [stats]);

  const groupedCategories = useMemo(
    () => ({
      clinical: STORAGE_CATEGORIES.filter((c) => c.group === 'clinical'),
      operational: STORAGE_CATEGORIES.filter((c) => c.group === 'operational'),
    }),
    [],
  );

  const usagePercentage =
    stats?.hasQuota && stats.totalSize > 0
      ? Math.min(100, Math.round((stats.usedSpace / stats.totalSize) * 100))
      : null;

  return {
    images,
    stats,
    totalCount,
    totalPages,
    page,
    isLoading,
    isRefreshing,
    error,
    group,
    category,
    search,
    sortBy,
    sortOrder,
    preview,
    consoleUrl,
    categoryStats,
    groupedCategories,
    usagePercentage,
    showThumbFiles,
    setShowThumbFiles,
    getThumbUrl,
    getOwnerDetails,
    setSearch,
    setSortBy,
    toggleSortOrder,
    setPreview,
    selectCategory,
    selectGroup,
    goToPage,
    refresh,
    openConsole,
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
