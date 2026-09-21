// packages/shared/src/media/audio-constants.ts
// Shared audio constants used across web and mobile apps

import type { VoiceSensitivity } from './audio-types';

/** Default sample rate for voice recordings (16kHz mono) */
export const AUDIO_SAMPLE_RATE = 16_000;

/** Maximum recording duration in seconds */
export const MAX_RECORDING_DURATION_S = 60;

/** Default number of waveform bars for visualization */
export const DEFAULT_WAVEFORM_BARS = 40;

/** WAV file header size in bytes */
export const WAV_HEADER_SIZE = 44;

/** Audio MIME types used across the platform */
export const AUDIO_MIME_TYPES = {
  MP4: 'audio/mp4',
  WEBM: 'audio/webm',
  WEBM_OPUS: 'audio/webm;codecs=opus',
  OGG: 'audio/ogg',
  WAV: 'audio/wav',
  MPEG: 'audio/mpeg',
  AAC: 'audio/aac',
} as const;

/** Human-readable labels for voice sensitivity presets */
export const SENSITIVITY_LABELS: Record<VoiceSensitivity, string> = {
  adaptive: 'Adaptive',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

/** Descriptions for voice sensitivity presets */
export const SENSITIVITY_DESCRIPTIONS: Record<VoiceSensitivity, string> = {
  adaptive: 'Automatically adjusts to room noise and speaking volume',
  high: 'Best for quiet speakers or quiet rooms',
  normal: 'Works well in most environments',
  low: 'Best for noisy environments',
};

/** Calibration multipliers for voice sensitivity presets.
 *  Multiplier × ambient noise RMS = silence detection threshold. */
export const SENSITIVITY_MULTIPLIERS: Record<VoiceSensitivity, number> = {
  adaptive: 1.8,
  high: 1.5,
  normal: 2.0,
  low: 3.0,
};
