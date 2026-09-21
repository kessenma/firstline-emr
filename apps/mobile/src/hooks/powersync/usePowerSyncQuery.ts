// apps/mobile/src/hooks/powersync/usePowerSyncQuery.ts
// Query hook for PowerSync database operations with reactive updates via db.watch()

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePowerSync } from './usePowerSync';

// Query Options
export interface PowerSyncQueryOptions {
  enabled?: boolean;              // Whether to run the query
  refetchInterval?: number;       // Ignored — db.watch() handles reactivity. Kept for backward compat.
  refetchOnWindowFocus?: boolean; // Ignored — kept for backward compat.
  staleTime?: number;            // Ignored — kept for backward compat.
  cacheTime?: number;            // Ignored — kept for backward compat.
  retry?: boolean | number;      // Retry failed queries
  retryDelay?: number;           // Delay between retries
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: any[] | undefined, error: Error | null) => void;
}

// Query Result
export interface PowerSyncQueryResult<T = any> {
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  isIdle: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

// Main Query Hook
export function usePowerSyncQuery<T = any>(
  sql: string,
  params: any[] = [],
  options: PowerSyncQueryOptions = {}
): PowerSyncQueryResult<T> {
  const { service, isInitialized } = usePowerSync();

  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  // Bump this counter to restart the watch (used by refetch)
  const [watchKey, setWatchKey] = useState(0);

  // Default options
  const {
    enabled = true,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onSettled,
  } = options;

  // Store callbacks in refs so watch loop always sees latest without restarting
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  // Reactive watch via db.watch() — callback-based (async iterables are not
  // supported in Hermes without a Symbol.asyncIterator polyfill).
  useEffect(() => {
    if (!enabled || !isInitialized) return;
    let cancelled = false;
    const abortController = new AbortController();

    setLoading(true);
    setError(null);

    service.watch<T>(
      sql,
      params,
      {
        onResult: (rows) => {
          if (cancelled) return;
          setData(rows);
          setLoading(false);
          setIsRefetching(false);
          setError(null);
          onSuccessRef.current?.(rows);
          onSettledRef.current?.(rows, null);
        },
        onError: (err) => {
          if (cancelled) return;
          setError(err);
          setLoading(false);
          setIsRefetching(false);
          onErrorRef.current?.(err);
          onSettledRef.current?.(undefined, err);

          console.error('❌ PowerSync watch failed:', sql, params, err);

          // Handle retries by restarting the watch
          if (shouldRetry(retry, err)) {
            setTimeout(() => {
              if (!cancelled) setWatchKey(k => k + 1);
            }, retryDelay);
          }
        },
      },
      { signal: abortController.signal },
    );

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [sql, JSON.stringify(params), enabled, isInitialized, watchKey]);

  // Manual refetch — restarts the watch
  const refetch = useCallback(async () => {
    setIsRefetching(true);
    setWatchKey(k => k + 1);
  }, []);

  // Determine query state
  const isSuccess = data !== undefined && !error;
  const isError = error !== null;
  const isLoading = loading && !isRefetching;
  const isIdle = !isLoading && !isSuccess && !isError;

  return {
    data,
    loading,
    error,
    isSuccess,
    isError,
    isLoading,
    isIdle,
    isRefetching,
    refetch,
  };
}

// Helper function to determine if retry should happen
function shouldRetry(retry: boolean | number, error: Error): boolean {
  if (typeof retry === 'boolean') {
    return retry;
  }

  // Don't retry certain types of errors
  if (error.message.includes('authentication') ||
      error.message.includes('authorization') ||
      error.message.includes('not found')) {
    return false;
  }

  return retry > 0;
}

// Specialized query hooks for common patterns

// Get single record by ID
export function usePowerSyncQueryById<T = any>(
  tableName: string,
  id: string | undefined,
  options: Omit<PowerSyncQueryOptions, 'enabled'> = {}
): PowerSyncQueryResult<T> & { record: T | null } {
  const enabled = id !== undefined && id !== null;
  const sql = `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`;
  const params = id ? [id] : [];

  const query = usePowerSyncQuery<T>(sql, params, { ...options, enabled });

  const record = query.data?.[0] || null;

  return {
    ...query,
    record,
  };
}

// Get multiple records with optional filtering
export function usePowerSyncQueryMany<T = any>(
  tableName: string,
  filters: Record<string, any> = {},
  options: PowerSyncQueryOptions = {}
): PowerSyncQueryResult<T> {
  const { whereClause, params } = buildWhereClause(filters);
  const sql = `SELECT * FROM ${tableName} ${whereClause}`;

  return usePowerSyncQuery<T>(sql, params, options);
}

// Get records with pagination
export function usePowerSyncQueryPaginated<T = any>(
  tableName: string,
  filters: Record<string, any> = {},
  pagination: { limit?: number; offset?: number } = {},
  options: PowerSyncQueryOptions = {}
): PowerSyncQueryResult<T> {
  const { whereClause, params: filterParams } = buildWhereClause(filters);

  let sql = `SELECT * FROM ${tableName} ${whereClause}`;
  const params = [...filterParams];

  if (pagination.limit) {
    sql += ` LIMIT ?`;
    params.push(pagination.limit);
  }

  if (pagination.offset) {
    sql += ` OFFSET ?`;
    params.push(pagination.offset);
  }

  return usePowerSyncQuery<T>(sql, params, options);
}

// Get count of records
export function usePowerSyncQueryCount(
  tableName: string,
  filters: Record<string, any> = {},
  options: PowerSyncQueryOptions = {}
): PowerSyncQueryResult<{ count: number }> & { count: number } {
  const { whereClause, params } = buildWhereClause(filters);
  const sql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;

  const query = usePowerSyncQuery<{ count: number }>(sql, params, options);
  const count = query.data?.[0]?.count || 0;

  return {
    ...query,
    count,
  };
}

// Helper function to build WHERE clause from filters
function buildWhereClause(filters: Record<string, any>): { whereClause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle array values (IN clause)
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'string' && (value.includes('%') || value.includes('*'))) {
        // Handle LIKE queries
        conditions.push(`${key} LIKE ?`);
        params.push(value.replace(/\*/g, '%'));
      } else {
        // Handle exact matches
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return { whereClause, params };
}
