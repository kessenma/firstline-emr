// apps/mobile/src/hooks/useCallTranscriptionMode.ts
// Reads/writes the clinician's opt-in for on-device transcription of patient
// video calls. Same three-layer pattern as the other user_settings hooks:
// PowerSync as the cross-device source of truth, MMKV for an immediate local
// write, and a PATCH to persist.
//
// Defaults to 'off' and stays off unless the clinician chooses otherwise —
// recording a patient consultation is not something to opt people into.

import { useState, useCallback } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import { TokenStorage } from '../services/TokenStorage';
import { storage } from '../utils/mmkv';
import {
  isCallTranscriptionMode,
  type CallTranscriptionMode,
} from '@fajr/shared/user';

export const CALL_TRANSCRIPTION_MODE_KEY = 'call_transcription_mode';

interface UseCallTranscriptionModeReturn {
  mode: CallTranscriptionMode;
  isLoading: boolean;
  setMode: (mode: CallTranscriptionMode) => Promise<void>;
}

export function useCallTranscriptionMode(): UseCallTranscriptionModeReturn {
  const [localOverride, setLocalOverride] =
    useState<CallTranscriptionMode | null>(null);

  const userId = TokenStorage.getUser()?.id ?? null;

  const settingsQuery = usePowerSyncQuery<{
    id: string;
    call_transcription_mode: string | null;
  }>(
    `SELECT id, call_transcription_mode FROM ${TABLES.USER_SETTINGS} WHERE user_id = ? LIMIT 1`,
    userId ? [userId] : [],
    { enabled: !!userId },
  );

  const settingsRow = settingsQuery.data?.[0];
  const localStoredValue = storage.getString(CALL_TRANSCRIPTION_MODE_KEY);

  let mode: CallTranscriptionMode = 'off';
  if (localOverride !== null) {
    mode = localOverride;
  } else if (isCallTranscriptionMode(localStoredValue)) {
    mode = localStoredValue;
  } else if (isCallTranscriptionMode(settingsRow?.call_transcription_mode)) {
    mode = settingsRow!.call_transcription_mode as CallTranscriptionMode;
  }

  const setMode = useCallback(
    async (value: CallTranscriptionMode) => {
      setLocalOverride(value);
      storage.set(CALL_TRANSCRIPTION_MODE_KEY, value);

      try {
        const token = await getStoredToken();
        if (!token || !userId) return;

        await fetch(getApiUrl(`/user-settings/${userId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: { callTranscriptionMode: value } }),
        });
      } catch (err) {
        console.warn(
          '[CallTranscriptionMode] Failed to persist preference:',
          err,
        );
      }
    },
    [userId],
  );

  return { mode, isLoading: settingsQuery.isLoading, setMode };
}
