// apps/mobile/src/hooks/useOfflineQueueSync.ts
// Hook to monitor and sync offline queue when back online

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import { offlineAccountSwitcher } from '../services/powersync/OfflineAccountSwitcherService';

interface UseOfflineQueueSyncOptions {
  /**
   * Auto-sync when app comes to foreground
   * @default true
   */
  autoSyncOnForeground?: boolean;

  /**
   * Auto-sync when connectivity changes to online
   * @default true
   */
  autoSyncOnOnline?: boolean;

  /**
   * Polling interval in milliseconds (0 to disable)
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

interface QueueSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  lastSyncResult: {
    processed: number;
    succeeded: number;
    failed: number;
  } | null;
  error: string | null;
}

/**
 * useOfflineQueueSync Hook
 *
 * Monitors offline queue and automatically syncs pending changes
 * when the device comes back online.
 *
 * Features:
 * - Auto-sync on app foreground
 * - Auto-sync on connectivity change
 * - Periodic polling
 * - Manual sync trigger
 * - Real-time queue count
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     pendingCount,
 *     isSyncing,
 *     isOnline,
 *     syncNow
 *   } = useOfflineQueueSync();
 *
 *   return (
 *     <View>
 *       <Text>Pending: {pendingCount}</Text>
 *       <Button onPress={syncNow}>Sync Now</Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useOfflineQueueSync(options: UseOfflineQueueSyncOptions = {}) {
  const {
    autoSyncOnForeground = true,
    autoSyncOnOnline = true,
    pollingInterval = 30000,
    debug = false,
  } = options;

  const [state, setState] = useState<QueueSyncState>({
    isOnline: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastSyncResult: null,
    error: null,
  });

  const previousOnlineState = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useOfflineQueueSync]', ...args);
    }
  }, [debug]);

  /**
   * Check online status
   */
  const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    try {
      const powerSync = PowerSyncService.getInstance();
      if (!powerSync.isReady()) {
        log('PowerSync not ready');
        return false;
      }

      const status = powerSync.getSyncStatus();
      return status.connected || false;
    } catch (error) {
      log('Error checking online status:', error);
      return false;
    }
  }, [log]);

  /**
   * Get pending queue count
   */
  const getPendingCount = useCallback(async (): Promise<number> => {
    try {
      const count = await offlineAccountSwitcher.getPendingCount();
      log('Pending count:', count);
      return count;
    } catch (error) {
      log('Error getting pending count:', error);
      return 0;
    }
  }, [log]);

  /**
   * Sync pending queue
   */
  const syncQueue = useCallback(async (): Promise<void> => {
    log('Starting queue sync...');

    setState(prev => ({
      ...prev,
      isSyncing: true,
      error: null,
    }));

    try {
      const result = await offlineAccountSwitcher.processPendingQueue();

      log('Queue sync complete:', result);

      // Update state
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        lastSyncResult: result,
        pendingCount: prev.pendingCount - result.succeeded,
        error: null,
      }));

      // Refresh pending count
      const newCount = await getPendingCount();
      setState(prev => ({
        ...prev,
        pendingCount: newCount,
      }));

    } catch (error) {
      log('Queue sync failed:', error);

      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [log, getPendingCount]);

  /**
   * Update state (online status and pending count)
   */
  const updateState = useCallback(async () => {
    try {
      const isOnline = await checkOnlineStatus();
      const pendingCount = await getPendingCount();

      setState(prev => ({
        ...prev,
        isOnline,
        pendingCount,
      }));

      // Detect online transition
      if (autoSyncOnOnline && isOnline && !previousOnlineState.current) {
        log('Device came online, triggering auto-sync...');
        await syncQueue();
      }

      previousOnlineState.current = isOnline;
    } catch (error) {
      log('Error updating state:', error);
    }
  }, [checkOnlineStatus, getPendingCount, syncQueue, autoSyncOnOnline, log]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    log('App state changed:', appStateRef.current, '->', nextAppState);

    // App came to foreground
    if (
      autoSyncOnForeground &&
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      log('App came to foreground, updating state...');
      await updateState();

      // Auto-sync if online and has pending items
      const isOnline = await checkOnlineStatus();
      const pendingCount = await getPendingCount();

      if (isOnline && pendingCount > 0) {
        log('Auto-syncing on foreground...');
        await syncQueue();
      }
    }

    appStateRef.current = nextAppState;
  }, [autoSyncOnForeground, updateState, checkOnlineStatus, getPendingCount, syncQueue, log]);

  /**
   * Manual sync trigger
   */
  const syncNow = useCallback(async (): Promise<boolean> => {
    try {
      const isOnline = await checkOnlineStatus();

      if (!isOnline) {
        log('Cannot sync: device is offline');
        setState(prev => ({
          ...prev,
          error: 'Device is offline',
        }));
        return false;
      }

      const pendingCount = await getPendingCount();

      if (pendingCount === 0) {
        log('No pending items to sync');
        return true;
      }

      await syncQueue();
      return true;
    } catch (error) {
      log('Manual sync failed:', error);
      return false;
    }
  }, [checkOnlineStatus, getPendingCount, syncQueue, log]);

  /**
   * Get pending queue items
   */
  const getPendingItems = useCallback(async () => {
    try {
      return await offlineAccountSwitcher.getPendingItems();
    } catch (error) {
      log('Error getting pending items:', error);
      return [];
    }
  }, [log]);

  /**
   * Clear queue (for testing/debugging)
   */
  const clearQueue = useCallback(async () => {
    try {
      await offlineAccountSwitcher.clearQueue();
      await updateState();
      log('Queue cleared');
    } catch (error) {
      log('Error clearing queue:', error);
    }
  }, [updateState, log]);

  // Initialize state on mount
  useEffect(() => {
    log('Initializing...');
    updateState();
  }, [updateState, log]);

  // Setup polling
  useEffect(() => {
    if (pollingInterval > 0) {
      log('Starting polling with interval:', pollingInterval);

      pollingIntervalRef.current = setInterval(() => {
        log('Polling...');
        updateState();
      }, pollingInterval);

      return () => {
        if (pollingIntervalRef.current) {
          log('Stopping polling');
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [pollingInterval, updateState, log]);

  // Setup app state listener
  useEffect(() => {
    log('Setting up app state listener');

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      log('Removing app state listener');
      subscription.remove();
    };
  }, [handleAppStateChange, log]);

  return {
    // State
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    lastSyncAt: state.lastSyncAt,
    lastSyncResult: state.lastSyncResult,
    error: state.error,

    // Actions
    syncNow,
    getPendingItems,
    clearQueue,
    refresh: updateState,
  };
}

/**
 * Hook for simple pending count monitoring
 *
 * Lightweight version that only tracks pending count
 * without automatic syncing.
 */
export function usePendingQueueCount() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const updateCount = useCallback(async () => {
    try {
      const count = await offlineAccountSwitcher.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.warn('[usePendingQueueCount] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    updateCount();
    const interval = setInterval(updateCount, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [updateCount]);

  return { pendingCount, isLoading, refresh: updateCount };
}
