// apps/mobile/src/hooks/useNotificationPreferences.ts
// Hook for reading/writing notification preferences from PowerSync + API.
// Pattern: same as usePatientDataNetworkMode.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TokenStorage } from '../services/TokenStorage';

interface NotificationPreferences {
  pushEnabled: boolean;
  notifyInternalMessages: boolean;
  notifyPatientMessages: boolean;
  notifyPatientActions: boolean;
  notifyCalls: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
}

interface UseNotificationPreferencesReturn {
  prefs: NotificationPreferences;
  isLoading: boolean;
  updatePref: (field: string, value: any) => Promise<void>;
  updatePrefs: (fields: Record<string, any>) => Promise<void>;
}

const DEFAULTS: NotificationPreferences = {
  pushEnabled: true,
  notifyInternalMessages: true,
  notifyPatientMessages: true,
  notifyPatientActions: true,
  notifyCalls: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({});
  const timezoneCheckedRef = useRef(false);

  const userId = TokenStorage.getUser()?.id ?? null;

  const settingsQuery = usePowerSyncQuery<{
    id: string;
    push_notifications_enabled: number | null;
    notify_internal_messages: number | null;
    notify_patient_messages: number | null;
    notify_patient_actions: number | null;
    notify_calls: number | null;
    quiet_hours_enabled: number | null;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    quiet_hours_timezone: string | null;
  }>(
    `SELECT id, push_notifications_enabled, notify_internal_messages, notify_patient_messages,
            notify_patient_actions, notify_calls, quiet_hours_enabled, quiet_hours_start,
            quiet_hours_end, quiet_hours_timezone
     FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
    userId ? [userId] : [],
    { enabled: !!userId },
  );

  const row = settingsQuery.data?.[0];

  // Build preferences from DB row + local overrides
  const prefs: NotificationPreferences = {
    pushEnabled:
      localOverrides.pushEnabled ??
      (row?.push_notifications_enabled !== null
        ? row?.push_notifications_enabled === 1
        : DEFAULTS.pushEnabled),
    notifyInternalMessages:
      localOverrides.notifyInternalMessages ??
      (row?.notify_internal_messages !== null
        ? row?.notify_internal_messages === 1
        : DEFAULTS.notifyInternalMessages),
    notifyPatientMessages:
      localOverrides.notifyPatientMessages ??
      (row?.notify_patient_messages !== null
        ? row?.notify_patient_messages === 1
        : DEFAULTS.notifyPatientMessages),
    notifyPatientActions:
      localOverrides.notifyPatientActions ??
      (row?.notify_patient_actions !== null
        ? row?.notify_patient_actions === 1
        : DEFAULTS.notifyPatientActions),
    notifyCalls:
      localOverrides.notifyCalls ??
      (row?.notify_calls !== null
        ? row?.notify_calls === 1
        : DEFAULTS.notifyCalls),
    quietHoursEnabled:
      localOverrides.quietHoursEnabled ??
      (row?.quiet_hours_enabled !== null
        ? row?.quiet_hours_enabled === 1
        : DEFAULTS.quietHoursEnabled),
    quietHoursStart:
      localOverrides.quietHoursStart ??
      row?.quiet_hours_start ??
      DEFAULTS.quietHoursStart,
    quietHoursEnd:
      localOverrides.quietHoursEnd ??
      row?.quiet_hours_end ??
      DEFAULTS.quietHoursEnd,
    quietHoursTimezone:
      localOverrides.quietHoursTimezone ??
      row?.quiet_hours_timezone ??
      DEFAULTS.quietHoursTimezone,
  };

  // Timezone change detection
  useEffect(() => {
    if (!row || timezoneCheckedRef.current) return;
    if (!row.quiet_hours_enabled || !row.quiet_hours_timezone) return;

    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (currentTz === row.quiet_hours_timezone) {
      timezoneCheckedRef.current = true;
      return;
    }

    timezoneCheckedRef.current = true;
    const oldTz = row.quiet_hours_timezone;
    const start = row.quiet_hours_start || '22:00';
    const end = row.quiet_hours_end || '07:00';

    Alert.alert(
      'Timezone Changed',
      `Your timezone changed from ${oldTz} to ${currentTz}. Your quiet hours are set to ${start}–${end} (${oldTz}).`,
      [
        {
          text: 'Keep same local times',
          onPress: () => {
            void updatePrefs({ quietHoursTimezone: currentTz });
          },
        },
        {
          text: 'Keep absolute times',
          onPress: () => {
            // Convert times from old timezone to new timezone
            const convertTime = (timeStr: string) => {
              const refDate = new Date();
              const [h, m] = timeStr.split(':').map(Number);
              refDate.setHours(h, m, 0, 0);

              const newParts = new Intl.DateTimeFormat('en-US', {
                timeZone: currentTz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).formatToParts(refDate);

              const newH = newParts.find(p => p.type === 'hour')?.value || '00';
              const newM = newParts.find(p => p.type === 'minute')?.value || '00';
              return `${newH}:${newM}`;
            };

            void updatePrefs({
              quietHoursTimezone: currentTz,
              quietHoursStart: convertTime(start),
              quietHoursEnd: convertTime(end),
            });
          },
        },
        { text: 'Dismiss', style: 'cancel' },
      ],
    );
  }, [row]);

  const updatePrefs = useCallback(
    async (fields: Record<string, any>) => {
      // Optimistic local update
      setLocalOverrides(prev => ({ ...prev, ...fields }));

      try {
        const token = await getStoredToken();
        if (!token || !userId) return;

        await fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: fields }),
        });
      } catch (err) {
        console.warn('[NotificationPreferences] Failed to persist:', err);
      }
    },
    [userId],
  );

  const updatePref = useCallback(
    async (field: string, value: any) => {
      await updatePrefs({ [field]: value });
    },
    [updatePrefs],
  );

  return {
    prefs,
    isLoading: settingsQuery.isLoading,
    updatePref,
    updatePrefs,
  };
}
