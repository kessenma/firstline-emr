// Hook for reading/writing the voice sensitivity setting (MMKV-based, device-local).

import { useState, useCallback } from 'react';
import { storage } from '../utils/mmkv';
import {
  MMKV_KEYS,
  SENSITIVITY_MULTIPLIERS,
  type VoiceSensitivity,
} from '../components/patient-chart/notes/voice-dictation/constants';

const DEFAULT_SENSITIVITY: VoiceSensitivity = 'adaptive';

export interface VoiceRecorderTuning {
  calibrationMultiplier: number;
  silenceTimeoutMs: number;
  noSpeechTimeoutMs: number;
  maxRecordingMs: number;
  levelBoost: number;
}

const RECORDER_TUNING: Record<VoiceSensitivity, VoiceRecorderTuning> = {
  adaptive: {
    calibrationMultiplier: 1.8,
    silenceTimeoutMs: 2500,
    noSpeechTimeoutMs: 7000,
    maxRecordingMs: 18000,
    levelBoost: 1.45,
  },
  high: {
    calibrationMultiplier: 1.5,
    silenceTimeoutMs: 3000,
    noSpeechTimeoutMs: 8000,
    maxRecordingMs: 20000,
    levelBoost: 1.8,
  },
  normal: {
    calibrationMultiplier: 2.0,
    silenceTimeoutMs: 2800,
    noSpeechTimeoutMs: 7000,
    maxRecordingMs: 18000,
    levelBoost: 1.35,
  },
  low: {
    calibrationMultiplier: 3.0,
    silenceTimeoutMs: 2200,
    noSpeechTimeoutMs: 6000,
    maxRecordingMs: 15000,
    levelBoost: 1.1,
  },
};

export function getVoiceSensitivity(): VoiceSensitivity {
  const raw = storage.getString(MMKV_KEYS.VOICE_SENSITIVITY);
  if (raw === 'adaptive' || raw === 'high' || raw === 'normal' || raw === 'low') return raw;
  return DEFAULT_SENSITIVITY;
}

export function getCalibrationMultiplier(): number {
  return SENSITIVITY_MULTIPLIERS[getVoiceSensitivity()];
}

export function getVoiceRecorderTuning(): VoiceRecorderTuning {
  return RECORDER_TUNING[getVoiceSensitivity()];
}

export function useVoiceSensitivity() {
  const [sensitivity, setSensitivityState] = useState<VoiceSensitivity>(
    () => getVoiceSensitivity(),
  );

  const setSensitivity = useCallback((value: VoiceSensitivity) => {
    storage.set(MMKV_KEYS.VOICE_SENSITIVITY, value);
    setSensitivityState(value);
  }, []);

  return {
    sensitivity,
    setSensitivity,
    multiplier: SENSITIVITY_MULTIPLIERS[sensitivity],
    recorderTuning: RECORDER_TUNING[sensitivity],
  };
}
