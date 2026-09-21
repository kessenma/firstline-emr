import { useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  interval?: number;
  onError?: (error: Error) => void;
  stopOn404?: boolean;
  enabled?: boolean;
}

export function usePolling(
  fetchFn: () => Promise<any>,
  options: PollingOptions = {}
) {
  const {
    interval = 3000,
    onError,
    stopOn404 = true,
    enabled = true,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPollingRef = useRef(false);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    isPollingRef.current = false;
  }, []);

  const poll = useCallback(async () => {
    if (!mountedRef.current || !isPollingRef.current) {
      return;
    }

    try {
      await fetchFn();
      
      // Schedule next poll only if still mounted and polling
      if (mountedRef.current && isPollingRef.current) {
        timeoutRef.current = setTimeout(poll, interval);
      }
    } catch (error: any) {
      // Stop polling on 404 errors
      if (stopOn404 && (error?.response?.status === 404 || error?.status === 404)) {
        console.warn('Resource not found (404), stopping polling');
        stopPolling();
        return;
      }

      onError?.(error);

      // Continue polling on other errors if still mounted
      if (mountedRef.current && isPollingRef.current) {
        timeoutRef.current = setTimeout(poll, interval);
      }
    }
  }, [fetchFn, interval, onError, stopOn404, stopPolling]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      isPollingRef.current = true;
      poll();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [enabled, poll, stopPolling]);

  return { stopPolling };
}
