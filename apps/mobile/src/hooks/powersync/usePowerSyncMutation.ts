// apps/mobile/src/hooks/powersync/usePowerSyncMutation.ts
// Mutation hook for PowerSync database operations

import { useState, useCallback } from 'react';
import { usePowerSync } from './usePowerSync';

// Mutation Options
export interface PowerSyncMutationOptions<TData = any, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retry?: boolean | number;
  retryDelay?: number;
}

// Mutation Result
export interface PowerSyncMutationResult<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  loading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  isIdle: boolean;
  reset: () => void;
}

// Main Mutation Hook
export function usePowerSyncMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: PowerSyncMutationOptions<TData, TVariables> = {}
): PowerSyncMutationResult<TData, TVariables> {
  const { isInitialized } = usePowerSync();

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  // Default options
  const {
    onSuccess,
    onError,
    onSettled,
    retry = 0,
    retryDelay = 1000,
  } = options;

  // Execute mutation with retry logic
  const executeMutation = useCallback(async (
    variables: TVariables,
    attempt = 0
  ): Promise<TData> => {
    try {
      const result = await mutationFn(variables);

      setData(result);
      setError(null);

      onSuccess?.(result, variables);
      onSettled?.(result, null, variables);

      if (__DEV__) {
        console.log('✅ PowerSync mutation success:', result);
      }

      return result;
    } catch (err) {
      const mutationError = err as Error;

      console.error(`❌ PowerSync mutation failed (attempt ${attempt + 1}):`, mutationError);

      // Handle retries
      const shouldRetryMutation = shouldRetry(retry, attempt, mutationError);
      if (shouldRetryMutation) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeMutation(variables, attempt + 1);
      }

      setError(mutationError);

      onError?.(mutationError, variables);
      onSettled?.(undefined, mutationError, variables);

      throw mutationError;
    }
  }, [mutationFn, onSuccess, onError, onSettled, retry, retryDelay]);

  // Main mutation function
  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    if (!isInitialized) {
      throw new Error('PowerSync is not initialized. Ensure the PowerSyncProvider is properly configured.');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await executeMutation(variables);
      return result;
    } finally {
      setLoading(false);
    }
  }, [executeMutation, isInitialized]);

  // Alias for mutate (for consistency with other mutation libraries)
  const mutateAsync = mutate;

  // Reset function
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Computed states
  const isSuccess = data !== null;
  const isError = error !== null;
  const isLoading = loading;
  const isIdle = !isLoading && !isSuccess && !isError;

  return {
    mutate,
    mutateAsync,
    data,
    error,
    loading,
    isSuccess,
    isError,
    isLoading,
    isIdle,
    reset,
  };
}

// Helper function to determine if retry should happen
function shouldRetry(retry: boolean | number, attempt: number, error: Error): boolean {
  if (typeof retry === 'boolean') {
    return retry && attempt === 0; // Only retry once if boolean true
  }

  // Don't retry certain types of errors
  if (error.message.includes('authentication') ||
      error.message.includes('authorization') ||
      error.message.includes('validation')) {
    return false;
  }

  return attempt < retry;
}

// Specialized mutation hooks for common database operations

// Insert mutation hook
export function usePowerSyncInsert(tableName: string, options?: PowerSyncMutationOptions) {
  return usePowerSyncMutation(
    async (data: Record<string, any>) => {
      // This would be implemented when the actual PowerSync service is available
      // For now, return a mock result
      console.log(`Mock insert into ${tableName}:`, data);
      return { id: 'mock-id', ...data };
    },
    options
  );
}

// Update mutation hook
export function usePowerSyncUpdate(tableName: string, options?: PowerSyncMutationOptions) {
  return usePowerSyncMutation(
    async ({ id, data }: { id: string; data: Record<string, any> }) => {
      // This would be implemented when the actual PowerSync service is available
      console.log(`Mock update ${tableName} with id ${id}:`, data);
      return { id, ...data };
    },
    options
  );
}

// Delete mutation hook
export function usePowerSyncDelete(tableName: string, options?: PowerSyncMutationOptions) {
  return usePowerSyncMutation(
    async (id: string) => {
      // This would be implemented when the actual PowerSync service is available
      console.log(`Mock delete from ${tableName} with id ${id}`);
      return { id, deleted: true };
    },
    options
  );
}

// Batch mutation hook for multiple operations
export function usePowerSyncBatchMutation(options?: PowerSyncMutationOptions) {
  return usePowerSyncMutation(
    async (operations: Array<{
      type: 'insert' | 'update' | 'delete';
      table: string;
      data: any;
      id?: string;
    }>) => {
      // This would be implemented when the actual PowerSync service is available
      console.log('Mock batch operations:', operations);

      const results = operations.map((op, index) => ({
        operation: op,
        success: true,
        result: { id: op.id || `mock-id-${index}` },
      }));

      return { operations: results };
    },
    options
  );
}
