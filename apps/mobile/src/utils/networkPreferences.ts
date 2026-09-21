// apps/mobile/src/utils/networkPreferences.ts
//
// Non-React access to the clinician's "WiFi only" data preference.
//
// usePatientDataNetworkMode is the hook version, but background work — an audio
// backup upload that outlives the screen that started it — has no component to
// hang a hook on, and needs to answer the same question.

import NetInfo from '@react-native-community/netinfo';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import { TokenStorage } from '../services/TokenStorage';
import { TABLES } from '../db/powerSyncSchema';

/**
 * True when a large, deferrable transfer should be held back right now.
 *
 * Only blocks when the clinician asked for WiFi-only AND we are not on WiFi.
 * Defaults to allowing the transfer: this gates a backup, and failing closed
 * would silently skip backups for anyone whose settings have not synced yet.
 */
export async function isBlockedByWifiOnlyPolicy(): Promise<boolean> {
  try {
    const userId = TokenStorage.getUser()?.id;
    if (!userId) return false;

    const db = PowerSyncService.getInstance().getDatabase?.();
    if (!db) return false;

    const rows = await db.getAll<{ data_sync_wifi_only: number | null }>(
      `SELECT data_sync_wifi_only FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
      [userId],
    );

    const wifiOnly = rows?.[0]?.data_sync_wifi_only === 1;
    if (!wifiOnly) return false;

    const state = await NetInfo.fetch();
    return state.type !== 'wifi';
  } catch {
    // A preference we cannot read is not a reason to skip a backup.
    return false;
  }
}
