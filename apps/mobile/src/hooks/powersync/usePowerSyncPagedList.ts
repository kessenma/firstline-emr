// apps/mobile/src/hooks/powersync/usePowerSyncPagedList.ts
// Reactive paginated list backed by PowerSync watched queries.
//
// Pagination is a growing LIMIT on a single watched query (no page/append
// state): loadMore() raises the limit, and db.watch() re-runs whenever the
// underlying table changes, so new rows appear without manual refreshes.
//
// hideRows() supports the hybrid write pattern (write via API, read via
// PowerSync): hide rows optimistically after a server write, and they are
// pruned automatically once sync removes them from the query result.

import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePowerSync } from './usePowerSync';
import { usePowerSyncQuery } from './usePowerSyncQuery';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_NOT_READY_MESSAGE =
  'Offline sync not available. Please ensure you are logged in.';

export interface PowerSyncPagedListOptions<Row extends { id: string }, Item> {
  /** List query. Must end with `LIMIT ?` — the limit param is appended after `params`. */
  listSql: string;
  /** COUNT query returning a single `count` column, using the same WHERE clause. */
  countSql: string;
  /** Params shared by both queries (everything except the LIMIT). */
  params?: any[];
  pageSize?: number;
  mapRow: (row: Row) => Item;
  enabled?: boolean;
  /** Error message surfaced while PowerSync is not initialized. */
  notReadyMessage?: string;
}

export interface PowerSyncPagedListResult<Item> {
  items: Item[];
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;

  // Pagination
  currentPage: number;
  totalPages: number;
  hasMore: boolean;

  error: string | null;

  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  /** Optimistically hide rows (e.g. after an API write) until sync removes them. */
  hideRows: (ids: string[]) => void;
}

export function usePowerSyncPagedList<Row extends { id: string }, Item>(
  options: PowerSyncPagedListOptions<Row, Item>,
): PowerSyncPagedListResult<Item> {
  const {
    listSql,
    countSql,
    params = [],
    pageSize = DEFAULT_PAGE_SIZE,
    mapRow,
    enabled = true,
    notReadyMessage = DEFAULT_NOT_READY_MESSAGE,
  } = options;

  const { isInitialized } = usePowerSync();
  const isEnabled = enabled && isInitialized;

  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const countQuery = usePowerSyncQuery<{ count: number }>(countSql, params, {
    enabled: isEnabled,
  });

  const rowsQuery = usePowerSyncQuery<Row>(
    listSql,
    [...params, visibleLimit],
    { enabled: isEnabled },
  );

  // Prune hidden ids once sync has removed the rows
  useEffect(() => {
    if (!rowsQuery.data || hiddenIds.length === 0) return;
    const presentIds = new Set(rowsQuery.data.map(row => row.id));
    const stillHidden = hiddenIds.filter(id => presentIds.has(id));
    if (stillHidden.length !== hiddenIds.length) {
      setHiddenIds(stillHidden);
    }
  }, [rowsQuery.data, hiddenIds]);

  const items = useMemo(
    () =>
      (rowsQuery.data ?? [])
        .filter(row => !hiddenIds.includes(row.id))
        .map(mapRow),
    // mapRow is expected to be a stable module-level function
    [rowsQuery.data, hiddenIds, mapRow],
  );

  const totalCount = Math.max(
    (countQuery.data?.[0]?.count ?? 0) - hiddenIds.length,
    0,
  );
  const hasMore = (rowsQuery.data?.length ?? 0) < totalCount;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.min(Math.ceil(visibleLimit / pageSize), totalPages);

  const isLoading =
    isEnabled && rowsQuery.loading && rowsQuery.data === undefined;
  const isRefreshing = rowsQuery.isRefetching;
  const isLoadingMore =
    rowsQuery.loading && !rowsQuery.isRefetching && rowsQuery.data !== undefined;

  const error = !isInitialized
    ? notReadyMessage
    : (rowsQuery.error?.message ?? countQuery.error?.message ?? null);

  const { refetch: refetchRows } = rowsQuery;
  const { refetch: refetchCount } = countQuery;
  const refresh = useCallback(async () => {
    setVisibleLimit(pageSize);
    await Promise.all([refetchRows(), refetchCount()]);
  }, [refetchRows, refetchCount, pageSize]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      setVisibleLimit(prev => prev + pageSize);
    }
  }, [hasMore, isLoadingMore, isLoading, pageSize]);

  const hideRows = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setHiddenIds(prev => [...prev, ...ids]);
  }, []);

  return {
    items,
    totalCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    currentPage,
    totalPages,
    hasMore,
    error,
    refresh,
    loadMore,
    hideRows,
  };
}
