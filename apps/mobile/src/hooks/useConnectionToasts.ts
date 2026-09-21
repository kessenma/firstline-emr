// apps/mobile/src/hooks/useConnectionToasts.ts
// Hook that fires toast notifications on meaningful connection state transitions.
// Mounted once in MainNavigator; exposes notifyOfflineSave via context for child screens.

import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useSyncConnection } from './powersync';
import { usePowerSyncReady } from './powersync';
import { useToast } from './useToast';

// Context for sharing notifyOfflineSave with child screens
interface ConnectionToastsContextType {
  notifyOfflineSave: () => void;
}

const ConnectionToastsContext = createContext<ConnectionToastsContextType>({
  notifyOfflineSave: () => {},
});

export const ConnectionToastsProvider = ConnectionToastsContext.Provider;

/** Use in child screens to call notifyOfflineSave() after offline writes */
export const useOfflineSaveNotification = () => useContext(ConnectionToastsContext);

interface ConnectionToastState {
  isConnected: boolean;
  timestamp: number;
}

const DEBOUNCE_MS = 3000;
const MIN_OFFLINE_DURATION_MS = 5000;

/**
 * Watches PowerSync connection status and fires toasts on meaningful transitions.
 * Returns { notifyOfflineSave } to pass into ConnectionToastsProvider.
 */
export function useConnectionToasts(): ConnectionToastsContextType {
  const { toast } = useToast();
  const isReady = usePowerSyncReady();
  const { isConnected } = useSyncConnection();

  // Track previous state for transition detection
  const prevStateRef = useRef<ConnectionToastState | null>(null);
  // Track when we first went offline (for duration filtering)
  const offlineSinceRef = useRef<number | null>(null);
  // Debounce timer to prevent toast spam during network flapping
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether initial boot has completed (skip offline toast on initial boot)
  const hasInitialConnectionRef = useRef(false);
  // Guard against duplicate "Saved locally" toasts
  const lastOfflineSaveToastRef = useRef(0);

  useEffect(() => {
    if (!isReady) return;

    const now = Date.now();
    const prevState = prevStateRef.current;

    // First time we see a connected state — mark initial boot as complete
    if (isConnected && !hasInitialConnectionRef.current) {
      hasInitialConnectionRef.current = true;
      prevStateRef.current = { isConnected: true, timestamp: now };
      return;
    }

    // Skip if initial connection hasn't happened yet (still booting)
    if (!hasInitialConnectionRef.current) {
      prevStateRef.current = { isConnected, timestamp: now };
      return;
    }

    // No change — skip
    if (prevState && prevState.isConnected === isConnected) return;

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isConnected && prevState?.isConnected) {
      // Went offline
      offlineSinceRef.current = now;

      debounceTimerRef.current = setTimeout(() => {
        toast({
          title: 'You are offline',
          description: 'Changes will be saved locally',
          variant: 'default',
          duration: 4000,
        });
      }, DEBOUNCE_MS);
    } else if (isConnected && prevState && !prevState.isConnected) {
      // Came back online
      const offlineDuration = offlineSinceRef.current
        ? now - offlineSinceRef.current
        : 0;
      offlineSinceRef.current = null;

      // Skip "back online" toast if offline for < 5s (transient blip)
      if (offlineDuration >= MIN_OFFLINE_DURATION_MS) {
        debounceTimerRef.current = setTimeout(() => {
          toast({
            title: 'Back online',
            description: 'Syncing your changes...',
            variant: 'success',
            duration: 3000,
          });
        }, DEBOUNCE_MS);
      }
    }

    prevStateRef.current = { isConnected, timestamp: now };
  }, [isReady, isConnected, toast]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const notifyOfflineSave = useCallback(() => {
    const now = Date.now();
    // Deduplicate: only show if > 3s since last offline-save toast
    if (now - lastOfflineSaveToastRef.current < 3000) return;
    // Only show if actually offline
    if (prevStateRef.current?.isConnected) return;

    lastOfflineSaveToastRef.current = now;
    toast({
      title: 'Saved locally',
      description: 'Will sync when connected',
      variant: 'info',
      duration: 2000,
    });
  }, [toast]);

  return { notifyOfflineSave };
}
