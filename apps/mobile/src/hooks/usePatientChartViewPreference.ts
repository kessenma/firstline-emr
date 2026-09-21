// apps/mobile/src/hooks/usePatientChartViewPreference.ts
// React hook for reading/writing the patient_chart_view user setting.
// Uses MMKV for immediate cross-component persistence and API for server sync.

import { useState, useCallback, useEffect } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TokenStorage } from '../services/TokenStorage';
import { storage } from '../utils/mmkv';
import type { PatientChartViewMode } from '@fajr/shared/user';

export type { PatientChartViewMode };

const MMKV_KEY = 'patient_chart_view_preference';
// Tracks whether the user has explicitly set a value this session.
// Prevents stale PowerSync data from overwriting the user's choice
// before the API round-trip completes.
const MMKV_DIRTY_KEY = 'patient_chart_view_dirty';

function readFromMMKV(): PatientChartViewMode {
  const stored = storage.getString(MMKV_KEY);
  return stored === 'dashboard' ? 'dashboard' : 'tabs';
}

interface UsePatientChartViewPreferenceReturn {
  /** Current view mode: 'tabs' (classic tab bar) or 'dashboard' (summary cards + sheets) */
  chartView: PatientChartViewMode;
  isLoading: boolean;
  /** Switch to a different chart view mode */
  setChartView: (mode: PatientChartViewMode) => Promise<void>;
}

export function usePatientChartViewPreference(): UsePatientChartViewPreferenceReturn {
  // Read initial value from MMKV synchronously — shared across all hook instances
  const [chartView, setChartViewState] = useState<PatientChartViewMode>(readFromMMKV);

  const userId = TokenStorage.getUser()?.id ?? null;

  const settingsQuery = usePowerSyncQuery<{
    id: string;
    patient_chart_view: string | null;
  }>(
    `SELECT id, patient_chart_view FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
    userId ? [userId] : [],
    { enabled: !!userId },
  );

  const settingsRow = settingsQuery.data?.[0];

  // Seed MMKV from PowerSync on first load (fresh install / new login).
  // Skip if the user has a pending local write that hasn't synced yet,
  // otherwise the stale PowerSync value would overwrite their choice.
  useEffect(() => {
    if (!settingsRow) return;
    const isDirty = storage.getBoolean(MMKV_DIRTY_KEY) === true;
    if (isDirty) {
      // Local write is pending — check if PowerSync now matches it
      const serverValue: PatientChartViewMode =
        settingsRow.patient_chart_view === 'dashboard' ? 'dashboard' : 'tabs';
      if (serverValue === readFromMMKV()) {
        // Server caught up, clear dirty flag
        storage.remove(MMKV_DIRTY_KEY);
      }
      return;
    }
    // No pending local write — PowerSync is authoritative (handles
    // settings changed on web or another device)
    const serverValue: PatientChartViewMode =
      settingsRow.patient_chart_view === 'dashboard' ? 'dashboard' : 'tabs';
    const localValue = readFromMMKV();
    if (serverValue !== localValue) {
      storage.set(MMKV_KEY, serverValue);
      setChartViewState(serverValue);
    }
  }, [settingsRow?.patient_chart_view]);

  const setChartView = useCallback(
    async (mode: PatientChartViewMode) => {
      // 1. Write to MMKV for immediate cross-component persistence
      storage.set(MMKV_KEY, mode);
      storage.set(MMKV_DIRTY_KEY, true);
      setChartViewState(mode);

      // 2. Persist to server via API
      try {
        const token = await getStoredToken();
        if (!token || !userId) return;

        await fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: { patientChartView: mode } }),
        });
      } catch (err) {
        console.warn('[PatientChartView] Failed to persist view preference:', err);
      }
    },
    [userId],
  );

  return {
    chartView,
    isLoading: settingsQuery.isLoading,
    setChartView,
  };
}
