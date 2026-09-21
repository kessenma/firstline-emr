// apps/mobile/src/hooks/powersync/useSyncDownloadBridge.ts
// Bridge hook: registers a 'sync' DownloadItem in DownloadProgressContext
// when PowerSync is actively syncing, so the tab bar badge shows automatically.
// Call this once in a component that's always mounted for authenticated users (e.g. CustomTabBar).

import { useEffect, useRef } from 'react';
import { useSyncProgress } from './useSyncStatus';
import { useDownloadProgress } from '../../contexts/DownloadProgressContext';

const SYNC_ITEM_ID = 'powersync-sync';
const DEBOUNCE_MS = 2000; // Prevent badge flicker on brief sync pauses

// Shown while syncing but with no measurable progress — uploads carry no
// progress object, and downloads have none until the first checkpoint lands.
const INDETERMINATE_PROGRESS = 0.5;

export function useSyncDownloadBridge(): void {
  const { isDownloading, isUploading, downloadProgress } = useSyncProgress();
  const { register, update, complete } = useDownloadProgress();
  const isRegistered = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSyncing = isDownloading || isUploading;
  const fraction = downloadProgress?.downloadedFraction ?? INDETERMINATE_PROGRESS;

  // Latest fraction, read by the register effect without making it a dependency.
  const fractionRef = useRef(fraction);
  fractionRef.current = fraction;

  // Registration lifecycle — keyed on isSyncing only, so a ticking progress
  // fraction doesn't tear down and re-arm the removal debounce on every update.
  useEffect(() => {
    if (isSyncing) {
      // Cancel any pending removal
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      if (!isRegistered.current) {
        register({
          id: SYNC_ITEM_ID,
          label: 'Data Sync',
          progress: fractionRef.current,
          type: 'sync',
        });
        isRegistered.current = true;
      }
    } else if (isRegistered.current) {
      // Debounce removal to prevent flicker
      debounceTimer.current = setTimeout(() => {
        complete(SYNC_ITEM_ID);
        isRegistered.current = false;
        debounceTimer.current = null;
      }, DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [isSyncing, register, complete]);

  // Progress updates — real download fraction from the SDK, replacing the
  // hardcoded 0.5 this hook used to report.
  useEffect(() => {
    if (!isRegistered.current) return;
    update(SYNC_ITEM_ID, fraction);
  }, [fraction, update]);
}
