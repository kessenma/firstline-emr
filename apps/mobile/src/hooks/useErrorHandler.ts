// apps/mobile/src/hooks/useErrorHandler.ts
import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | string | null;
  hasError: boolean;
}

interface UseErrorHandlerReturn {
  error: Error | string | null;
  hasError: boolean;
  setError: (error: Error | string | null) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
  wrapAsync: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
  });

  const setError = useCallback((error: Error | string | null) => {
    setErrorState({
      error,
      hasError: error !== null,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error('Error caught by useErrorHandler:', error);

    if (error instanceof Error) {
      setError(error);
    } else if (typeof error === 'string') {
      setError(error);
    } else {
      setError(new Error('An unknown error occurred'));
    }
  }, [setError]);

  const wrapAsync = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        clearError();
        return await fn();
      } catch (error) {
        handleError(error);
        return undefined;
      }
    },
    [clearError, handleError],
  );

  return {
    error: errorState.error,
    hasError: errorState.hasError,
    setError,
    clearError,
    handleError,
    wrapAsync,
  };
}
