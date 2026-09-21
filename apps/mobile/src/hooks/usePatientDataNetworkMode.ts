// apps/mobile/src/hooks/usePatientDataNetworkMode.ts
// Unified hook: one toggle controls both PowerSync data sync and media cache WiFi-only preferences.
// Also auto-enables media caching for users who never decided (media_cache_enabled = null).

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TokenStorage } from '../services/TokenStorage';
import { syncNetworkController } from '../services/powersync/SyncNetworkController';

interface UsePatientDataNetworkModeReturn {
  /** true = WiFi only, false = WiFi + cellular (for both data sync and media cache) */
  wifiOnly: boolean;
  isLoading: boolean;
  /** Sets both dataSyncWifiOnly and mediaCacheWifiOnly together */
  setWifiOnly: (wifiOnly: boolean) => Promise<void>;
}

export function usePatientDataNetworkMode(): UsePatientDataNetworkModeReturn {
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const autoEnabledRef = useRef(false);

  const userId = TokenStorage.getUser()?.id ?? null;

  const settingsQuery = usePowerSyncQuery<{
    id: string;
    data_sync_wifi_only: number | null;
    media_cache_enabled: number | null;
  }>(
    `SELECT id, data_sync_wifi_only, media_cache_enabled FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
    userId ? [userId] : [],
    { enabled: !!userId },
  );

  const settingsRow = settingsQuery.data?.[0];

  // Determine effective value (default: false — sync on any network)
  let wifiOnly: boolean;
  if (localOverride !== null) {
    wifiOnly = localOverride;
  } else if (settingsRow && settingsRow.data_sync_wifi_only !== null) {
    wifiOnly = settingsRow.data_sync_wifi_only === 1;
  } else {
    wifiOnly = false;
  }

  // Auto-enable media cache for existing users who have media_cache_enabled = null
  useEffect(() => {
    if (
      settingsRow &&
      settingsRow.media_cache_enabled === null &&
      !autoEnabledRef.current &&
      userId
    ) {
      autoEnabledRef.current = true;
      getStoredToken().then(token => {
        if (!token) return;
        fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: { mediaCacheEnabled: true } }),
        }).catch(() => {});
      });
    }
  }, [settingsRow, userId]);

  const setWifiOnly = useCallback(
    async (value: boolean) => {
      // 1. Update local override for immediate UI feedback
      setLocalOverride(value);

      // 2. Update MMKV for SyncNetworkController (re-evaluates immediately)
      syncNetworkController.setWifiOnlyPreference(value);

      // 3. Persist both values + auto-enable media cache in a single API call
      try {
        const token = await getStoredToken();
        if (!token || !userId) return;

        await fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            settings: {
              dataSyncWifiOnly: value,
              mediaCacheWifiOnly: value,
              mediaCacheEnabled: true,
            },
          }),
        });
      } catch (err) {
        console.warn('[PatientDataNetworkMode] Failed to persist:', err);
      }
    },
    [userId],
  );

  return {
    wifiOnly,
    isLoading: settingsQuery.isLoading,
    setWifiOnly,
  };
}
