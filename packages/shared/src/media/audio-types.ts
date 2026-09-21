// packages/shared/src/media/audio-types.ts
// Shared audio types used across web and mobile apps

/** State for any audio player UI (web or mobile) */
export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  /** Playback progress as 0-1 ratio */
  progress: number;
  /** Total duration in seconds */
  duration: number;
  /** Current playback position in seconds */
  currentTime: number;
  error: string | null;
}

/** State for any audio recorder UI (web or mobile) */
export interface AudioRecorderState {
  isRecording: boolean;
  /** Duration of current recording in seconds */
  duration: number;
  /** Current audio input level (smoothed RMS, 0-1 range) */
  audioLevel: number;
  error: string | null;
}

/** Configuration for audio recorder silence detection */
export interface AudioRecorderConfig {
  /** Called when sustained silence is detected. Used by hands-free mode to auto-stop. */
  onSilenceDetected?: () => void;
  /** RMS amplitude below this threshold counts as silence. Default: adaptive (2× ambient). */
  silenceThreshold?: number;
  /** Milliseconds of continuous silence before firing onSilenceDetected. Default: 3000 */
  silenceTimeoutMs?: number;
  /** Override the adaptive calibration multiplier. Default: 2.0. Lower = more sensitive. */
  calibrationMultiplier?: number;
  /** If no speech is detected by this time, auto-stop (ms). Default: 7000 */
  noSpeechTimeoutMs?: number;
  /** Hard cap for a single recording segment (ms). Default: 20000 */
  maxRecordingMs?: number;
  /** Meter gain for UI bars (higher = more responsive bars). Default: 1.35 */
  levelBoost?: number;
}

/** Voice sensitivity presets for adaptive silence detection */
export type VoiceSensitivity = 'adaptive' | 'high' | 'normal' | 'low';
