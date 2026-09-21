// apps/mobile/src/utils/gatherSyncDiagnostics.ts
// Captures a snapshot of PowerSync sync state for offline_access feedback reports.

import { Platform } from 'react-native';
import { PowerSyncService } from '../services/powersync/PowerSyncService';

export interface SyncDiagnosticSnapshot {
  tableCounts: Record<string, number>;
  isConnected: boolean;
  connectionTimedOut: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  errors: string[];
  serverUrl: string;
  devicePlatform: string;
}

/**
 * Gather a serializable snapshot of the current sync state.
 * Accepts already-computed hook values to avoid duplicate queries.
 */
export async function gatherSyncDiagnostics(
  counts: Record<string, number>,
  syncErrors: Error[],
  connectionTimedOut: boolean,
  lastSyncTime: Date | undefined,
): Promise<SyncDiagnosticSnapshot> {
  const service = PowerSyncService.getInstance();

  let serverUrl = '';
  let isConnected = false;
  let pendingChanges = 0;

  try {
    const debug = service.getDebugInfo();
    serverUrl = debug.config?.serverUrl ?? '';
    isConnected = debug.syncStatus?.connected ?? false;
  } catch {
    // service may not be initialized
  }

  try {
    pendingChanges = await service.getPendingChangesCount();
  } catch {
    // ignore if unavailable
  }

  return {
    tableCounts: { ...counts },
    isConnected,
    connectionTimedOut,
    lastSyncTime: lastSyncTime?.toISOString() ?? null,
    pendingChanges,
    errors: syncErrors.slice(-5).map(e => e.message),
    serverUrl,
    devicePlatform: Platform.OS,
  };
}

/**
 * Format diagnostics into a human-readable description for feedback submission.
 */
export function formatDiagnosticsDescription(snap: SyncDiagnosticSnapshot): string {
  const lines: string[] = [];

  if (snap.connectionTimedOut) {
    lines.push('Sync connection timed out after 30 seconds.');
  } else if (!snap.isConnected) {
    lines.push('Unable to connect to sync server.');
  }

  lines.push('');
  lines.push('Table Counts:');
  for (const [table, count] of Object.entries(snap.tableCounts)) {
    lines.push(`  ${table}: ${count}`);
  }

  lines.push('');
  lines.push(`Last Sync: ${snap.lastSyncTime ?? 'Never'}`);
  lines.push(`Pending Changes: ${snap.pendingChanges}`);
  lines.push(`Server: ${snap.serverUrl || 'unknown'}`);
  lines.push(`Platform: ${snap.devicePlatform}`);

  if (snap.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const err of snap.errors) {
      lines.push(`  - ${err}`);
    }
  }

  return lines.join('\n');
}
