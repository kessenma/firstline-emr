// apps/mobile/src/hooks/useTranslationModelWifiOnly.ts
// React hook for reading/writing translation model WiFi-only preference.

import { useState, useCallback } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TokenStorage } from '../services/TokenStorage';
import { storage } from '../utils/mmkv';

export const TRANSLATION_MODEL_WIFI_ONLY_KEY = 'translation_model_wifi_only';

interface UseTranslationModelWifiOnlyReturn {
  /** true = download models only on WiFi, false = WiFi + cellular */
  wifiOnly: boolean;
  isLoading: boolean;
  setWifiOnly: (wifiOnly: boolean) => Promise<void>;
}

export function useTranslationModelWifiOnly(): UseTranslationModelWifiOnlyReturn {
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);

  const userId = TokenStorage.getUser()?.id ?? null;

  const settingsQuery = usePowerSyncQuery<{
    id: string;
    translation_model_wifi_only: number | null;
  }>(
    `SELECT id, translation_model_wifi_only FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
    userId ? [userId] : [],
    { enabled: !!userId },
  );

  const settingsRow = settingsQuery.data?.[0];
  const localStoredValue = storage.getString(TRANSLATION_MODEL_WIFI_ONLY_KEY);

  let wifiOnly: boolean;
  if (localOverride !== null) {
    wifiOnly = localOverride;
  } else if (localStoredValue !== undefined) {
    wifiOnly = localStoredValue === 'true';
  } else if (settingsRow && settingsRow.translation_model_wifi_only !== null) {
    wifiOnly = settingsRow.translation_model_wifi_only === 1;
  } else {
    wifiOnly = true;
  }

  const setWifiOnly = useCallback(
    async (value: boolean) => {
      setLocalOverride(value);
      storage.set(TRANSLATION_MODEL_WIFI_ONLY_KEY, value ? 'true' : 'false');

      try {
        const token = await getStoredToken();
        if (!token || !userId) return;

        await fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: { translationModelWifiOnly: value } }),
        });
      } catch (err) {
        console.warn('[TranslationModelWifiOnly] Failed to persist preference:', err);
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
