// apps/mobile/src/hooks/powersync/useSyncStatus.ts
// Hook for monitoring PowerSync synchronization status

import { useState, useEffect, useRef } from 'react';
import type { SyncProgress, SyncPriorityStatus } from '@powersync/react-native';
import { usePowerSync } from './usePowerSync';

// Flattened view of the SDK's SyncStatus, kept small because most consumers only
// need these three. The richer fields (progress, hasSynced, priorities) ride on
// SyncStatusResult alongside it rather than being squeezed in here.
interface SyncStatus {
  connected: boolean;
  connecting: boolean;
  downloading: boolean;
  uploading: boolean;
}

// Sync Status Result
export interface SyncStatusResult {
  status: SyncStatus;
  isConnected: boolean;
  isConnecting: boolean;
  connectionTimedOut: boolean;
  isDownloading: boolean;
  isUploading: boolean;
  hasPendingChanges: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastSyncTime?: Date;
  syncErrors: Error[];
  /**
   * Realtime download progress for the current sync iteration, or null when no
   * download is in flight. `downloadedFraction` is 0..1; use `untilPriority(p)`
   * for progress towards a single bucket priority.
   *
   * Note the fraction reaches 1.0 slightly *before* this clears — the SDK is
   * applying the downloaded changes locally in that window. Render that as
   * "Applying changes…" rather than a stalled 100%.
   */
  downloadProgress: SyncProgress | null;
  /** True once a first full sync has completed on this database. */
  hasSynced: boolean;
  /** Per-priority sync completion, for prioritised bucket rollouts. */
  priorityStatusEntries: SyncPriorityStatus[];
}

// Sync Status Options
export interface SyncStatusOptions {
  /**
   * @deprecated No longer used. Status is now driven by the SDK's `statusChanged`
   * listener instead of polling, so updates are immediate and this is ignored.
   * Retained so existing call sites keep compiling.
   */
  pollInterval?: number;
  enableDetailedLogging?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  onSyncStart?: () => void;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

const EMPTY_STATUS: SyncStatus = {
  connected: false,
  connecting: false,
  downloading: false,
  uploading: false,
};

// Stable reference — a fresh [] on every status event would re-render every
// consumer even when no priority information changed.
const NO_PRIORITY_ENTRIES: SyncPriorityStatus[] = [];

// Main Sync Status Hook
export function useSyncStatus(
  options: SyncStatusOptions = {}
): SyncStatusResult {
  const { service, isInitialized } = usePowerSync();

  const [status, setStatus] = useState<SyncStatus>(EMPTY_STATUS);
  const [syncErrors, setSyncErrors] = useState<Error[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [downloadProgress, setDownloadProgress] = useState<SyncProgress | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const [priorityStatusEntries, setPriorityStatusEntries] = useState<SyncPriorityStatus[]>(NO_PRIORITY_ENTRIES);

  // Default options
  const {
    enableDetailedLogging = __DEV__,
    onConnectionChange,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  // Ref-mirror the callbacks so the subscription effect doesn't need them in its
  // dep array — re-subscribing on every render of a parent that passes inline
  // closures would tear down and rebuild the SDK listener constantly.
  const callbacksRef = useRef({ onConnectionChange, onSyncStart, onSyncComplete, onSyncError });
  callbacksRef.current = { onConnectionChange, onSyncStart, onSyncComplete, onSyncError };

  // Previous status, for edge detection between listener events
  const prevStatusRef = useRef<SyncStatus>(EMPTY_STATUS);

  // Track when connecting started for timeout logic (30s)
  const connectingStartRef = useRef<number | null>(null);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const CONNECTING_TIMEOUT_MS = 30_000;

  // Subscribe to the service's status fan-out, replacing the setInterval polling
  // this hook used to do.
  //
  // Deliberately NOT service.addEventListener('onSyncStatusChange', ...): that
  // registry is a single-slot map — registering overwrites the previous handler,
  // and removeEventListener clears the slot for everyone. This hook is mounted
  // concurrently by SyncStatusSheet, ConnectionStatusOverlay,
  // useSyncDownloadBridge and useConnectionToasts, so through that registry only
  // the last mount would receive events and the first unmount would silence the
  // rest. The polling this replaced was what hid that.
  //
  // And deliberately NOT db.registerListener() either, even though it is properly
  // multi-listener: resetDatabase() swaps in a brand-new PowerSyncDatabase without
  // changing isInitialized, so a listener bound to the old instance would go dead
  // with no dependency change to trigger a re-subscribe. subscribeToSyncStatus()
  // is owned by the service and re-attached to whichever database is current.
  useEffect(() => {
    if (!isInitialized) return;

    const apply = (raw: any) => {
      const newStatus: SyncStatus = {
        connected: raw?.connected ?? false,
        connecting: raw?.connecting ?? false,
        // PowerSync nests these under dataFlowStatus
        downloading: raw?.dataFlowStatus?.downloading ?? false,
        uploading: raw?.dataFlowStatus?.uploading ?? false,
      };
      const previousStatus = prevStatusRef.current;

      setStatus(newStatus);
      prevStatusRef.current = newStatus;

      setDownloadProgress(raw?.downloadProgress ?? null);
      setHasSynced(!!raw?.hasSynced);
      setPriorityStatusEntries(raw?.priorityStatusEntries ?? NO_PRIORITY_ENTRIES);

      if (raw?.lastSyncedAt) {
        setLastSyncTime(new Date(raw.lastSyncedAt));
      }

      const { onSyncStart: start, onSyncComplete: done, onConnectionChange: conn } =
        callbacksRef.current;

      if (newStatus.uploading && !previousStatus.uploading) {
        start?.();
        if (enableDetailedLogging) console.log('🔄 Sync started');
      }

      if (
        !newStatus.uploading &&
        !newStatus.downloading &&
        (previousStatus.uploading || previousStatus.downloading)
      ) {
        done?.();
        if (enableDetailedLogging) console.log('✅ Sync completed');
      }

      if (newStatus.connected !== previousStatus.connected) {
        conn?.(newStatus.connected);
        if (enableDetailedLogging) {
          console.log(
            newStatus.connected ? '🔗 Connected to PowerSync' : '🔌 Disconnected from PowerSync',
          );
        }
      }
    };

    const safeApply = (raw: any) => {
      try {
        apply(raw);
      } catch (error) {
        const statusError = error as Error;
        setSyncErrors(prev => [...prev.slice(-4), statusError]); // Keep last 5 errors
        callbacksRef.current.onSyncError?.(statusError);
        if (enableDetailedLogging) console.error('❌ Sync status error:', statusError);
      }
    };

    // Seed from the live SDK status rather than getSyncStatus(), which returns a
    // mirrored copy seeded with a placeholder whose dataFlowStatus is the string
    // 'stopped' (so ?.downloading never reads as set).
    const seed = service.getLiveSyncStatus();
    if (seed) safeApply(seed);

    return service.subscribeToSyncStatus(safeApply);
  }, [service, isInitialized, enableDetailedLogging]);

  // Clear status when the service goes away (logout, reset). Without this the
  // last-known "connected" state would linger and the UI would keep claiming a
  // live sync stream. Keyed on isInitialized alone so a change to any other dep
  // of the subscription effect above does not flicker the status to empty.
  useEffect(() => {
    if (isInitialized) return;

    prevStatusRef.current = EMPTY_STATUS;
    setStatus(EMPTY_STATUS);
    setDownloadProgress(null);
    setHasSynced(false);
    setPriorityStatusEntries(NO_PRIORITY_ENTRIES);
  }, [isInitialized]);

  // Service-level error events still come through the service registry. 'onError'
  // has only this one registration site, so the single-slot limitation above does
  // not bite here.
  useEffect(() => {
    if (!isInitialized) return;

    const handleError = (error: Error) => {
      setSyncErrors(prev => [...prev.slice(-4), error]); // Keep last 5 errors
      callbacksRef.current.onSyncError?.(error);
    };

    service.addEventListener('onError', handleError);

    return () => {
      service.removeEventListener('onError');
    };
  }, [service, isInitialized]);

  // Connecting timeout: after 30s of not connecting, give up and show "offline"
  useEffect(() => {
    if (status.connected) {
      // Connected — reset timeout state
      connectingStartRef.current = null;
      setConnectionTimedOut(false);
      return;
    }

    if (!isInitialized) {
      connectingStartRef.current = null;
      return;
    }

    // Started connecting — record timestamp
    if (connectingStartRef.current === null) {
      connectingStartRef.current = Date.now();
    }

    const timer = setTimeout(() => {
      if (!status.connected && connectingStartRef.current !== null) {
        setConnectionTimedOut(true);
      }
    }, CONNECTING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [status.connected, isInitialized]);

  // Computed values
  const isConnected = status.connected;
  // Prefer the SDK's own `connecting` flag, but keep the derived fallback: the
  // SDK reports connecting only while a connection attempt is actually in
  // flight, and consumers here treat the gaps between retries as "connecting"
  // too, right up until the 30s timeout gives up.
  const isConnecting =
    status.connecting || (!status.connected && isInitialized && !connectionTimedOut);
  const isDownloading = status.downloading;
  const isUploading = status.uploading;

  // Estimate pending changes (this would be more accurate with actual PowerSync API)
  const hasPendingChanges = isUploading || syncErrors.length > 0;

  // Determine connection quality based on recent errors and sync status
  let connectionQuality: SyncStatusResult['connectionQuality'] = 'offline';

  if (isConnected) {
    const recentErrors = syncErrors.filter(
      error => Date.now() - (error as any).timestamp < 30000 // Last 30 seconds
    );

    if (recentErrors.length === 0) {
      connectionQuality = 'excellent';
    } else if (recentErrors.length <= 2) {
      connectionQuality = 'good';
    } else {
      connectionQuality = 'poor';
    }
  }

  return {
    status,
    isConnected,
    isConnecting,
    connectionTimedOut,
    isDownloading,
    isUploading,
    hasPendingChanges,
    connectionQuality,
    lastSyncTime,
    syncErrors,
    downloadProgress,
    hasSynced,
    priorityStatusEntries,
  };
}

// Utility hooks for specific sync states

// A PowerSync reconnect costs ~6.1s end to end (the SDK's 5s retryDelayMs plus a
// ~1.1s handshake), so a dropped sync stream is NOT the same thing as the device
// being offline — plain HTTP requests to the API keep succeeding straight through
// one. Most consumers of this hook gate real behaviour on it (offline queue vs
// direct send, upload vs queue, network vs cache), so a drop is only worth acting
// on once it has outlasted a full reconnect cycle.
//
// 8s, not 5s: 5s is shorter than the reconnect itself and would still surface
// every routine blip.
const DISCONNECT_GRACE_MS = 8000;

/**
 * Falling-edge debounce. `true` propagates immediately; `false` only after
 * `graceMs` of *continuous* disconnection. Recovery always wins instantly.
 */
function useStableConnection(connected: boolean, graceMs = DISCONNECT_GRACE_MS): boolean {
  const [stable, setStable] = useState(connected);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (connected) {
      // Reconnected — cancel any pending drop and report immediately.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStable(true);
      return;
    }

    // Already counting down; don't restart the window on every poll tick or the
    // drop would never be reported.
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStable(false);
    }, graceMs);
  }, [connected, graceMs]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return stable;
}

// Hook for connection status only
export function useSyncConnection(): {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: SyncStatusResult['connectionQuality'];
} {
  const {
    isConnected: rawConnected,
    isConnecting,
    connectionQuality,
  } = useSyncStatus();

  const isConnected = useStableConnection(rawConnected);

  // Inside the grace window we are asserting we're still online, so don't also
  // report "connecting" or "offline" — consumers would read the contradiction as
  // exactly the flap this is here to absorb.
  const inGraceWindow = isConnected && !rawConnected;

  return {
    isConnected,
    isConnecting: inGraceWindow ? false : isConnecting,
    connectionQuality: inGraceWindow ? 'good' : connectionQuality,
  };
}

// Hook for upload/download status
export function useSyncProgress(): {
  isDownloading: boolean;
  isUploading: boolean;
  hasPendingChanges: boolean;
  lastSyncTime?: Date;
  downloadProgress: SyncProgress | null;
} {
  const { isDownloading, isUploading, hasPendingChanges, lastSyncTime, downloadProgress } =
    useSyncStatus();

  return { isDownloading, isUploading, hasPendingChanges, lastSyncTime, downloadProgress };
}

// Hook for sync errors
export function useSyncErrors(): {
  errors: Error[];
  hasErrors: boolean;
  latestError?: Error;
  clearErrors: () => void;
} {
  const { syncErrors } = useSyncStatus();
  const [errors, setErrors] = useState<Error[]>([]);

  useEffect(() => {
    setErrors(syncErrors);
  }, [syncErrors]);

  const clearErrors = () => setErrors([]);

  return {
    errors,
    hasErrors: errors.length > 0,
    latestError: errors[errors.length - 1],
    clearErrors,
  };
}

// Hook for sync statistics
export function useSyncStatistics(): {
  totalSyncTime: number;
  recordsSynced: number;
  conflictsResolved: number;
  errors: number;
  lastSyncTimestamp: Date;
  averageSyncDuration: number;
} {
  usePowerSync();

  // In a real implementation, this would be updated in real-time
  // For now, return mock statistics
  return {
    totalSyncTime: 0,
    recordsSynced: 0,
    conflictsResolved: 0,
    errors: 0,
    lastSyncTimestamp: new Date(),
    averageSyncDuration: 0,
  };
}
