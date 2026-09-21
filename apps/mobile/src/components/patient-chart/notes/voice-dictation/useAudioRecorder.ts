// Wraps react-native-audio-api for microphone capture.
// Captures audio at 16kHz mono, accumulates Float32Array chunks,
// and returns the full buffer on stop for batch transcription.
// Supports optional silence detection for hands-free mode.

import { useState, useCallback, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { AUDIO_SAMPLE_RATE } from '@fajr/shared/media';
import type { AudioRecorderConfig } from '@fajr/shared/media';

const SAMPLE_RATE = AUDIO_SAMPLE_RATE;
const BUFFER_LENGTH = 1600; // matches react-native-audio-api examples

// Default silence detection settings
const DEFAULT_SILENCE_TIMEOUT_MS = 3000; // 3 seconds of silence triggers callback
// Adaptive calibration: collect ambient RMS for CALIBRATION_CHUNKS chunks,
// then set silence threshold to CALIBRATION_MULTIPLIER × ambient average.
const CALIBRATION_CHUNKS = 4; // ~1 second at 256ms per chunk
const CALIBRATION_MULTIPLIER = 2.0; // threshold = 2× ambient noise floor
const MIN_SILENCE_THRESHOLD = 0.015; // floor — never go below this
const DEBUG_PREFIX = '[VoiceDictation:Recorder]';
const STOP_FLUSH_DELAY_MS = 200;
const LEVEL_EMA_ALPHA = 0.35;

// AudioRecorderConfig is imported from @fajr/shared/media
export type { AudioRecorderConfig } from '@fajr/shared/media';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  /** Duration of current recording in seconds */
  duration: number;
  /** Current audio input level (smoothed RMS, 0-1 range). Updated every ~256ms chunk. */
  audioLevel: number;
  /** Start recording. Requests mic permission if needed. */
  startRecording: () => Promise<boolean>;
  /** Stop recording. Returns the accumulated Float32Array waveform at 16kHz. */
  stopRecording: () => Promise<Float32Array>;
  /** Error message if recording failed */
  error: string | null;
}

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  // iOS: request via native AudioManager API.
  try {
    const status = await AudioManager.checkRecordingPermissions();
    if (status === 'Granted') {
      return true;
    }
    const requested = await AudioManager.requestRecordingPermissions();
    return requested === 'Granted';
  } catch {
    return false;
  }
}

/** Compute RMS (root mean square) amplitude of an audio buffer */
function computeRMS(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

function pickChannelData(buffer: any): {
  samples: Float32Array | null;
  channelIndex: number;
  channelCount: number;
  channelLengths: number[];
} {
  const rawCount = Number(buffer?.numberOfChannels ?? 1);
  const channelCount = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 1;
  const maxChannels = Math.min(channelCount, 8);

  let best: Float32Array | null = null;
  let bestIdx = 0;
  const channelLengths: number[] = [];

  for (let i = 0; i < maxChannels; i++) {
    try {
      const ch = buffer.getChannelData(i) as Float32Array;
      const len = ch?.length ?? 0;
      channelLengths.push(len);
      if (len > (best?.length ?? 0)) {
        best = ch;
        bestIdx = i;
      }
    } catch {
      channelLengths.push(0);
    }
  }

  return {
    samples: best && best.length > 0 ? best : null,
    channelIndex: bestIdx,
    channelCount,
    channelLengths,
  };
}

export function useAudioRecorder(config?: AudioRecorderConfig): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio objects (survive re-renders, no state churn).
  // Mirror private-mind pattern: keep one recorder instance for the hook lifecycle.
  const recorderRef = useRef<AudioRecorder | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = new AudioRecorder({
      sampleRate: SAMPLE_RATE,
      bufferLengthInSamples: BUFFER_LENGTH,
    });
  }
  const chunksRef = useRef<Float32Array[]>([]);
  const totalSamplesRef = useRef(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emptyChunkCountRef = useRef(0);
  const recordingStartRef = useRef<number | null>(null);
  const audioLevelSmoothedRef = useRef(0);
  const peakRmsRef = useRef(0.06);

  // Silence detection refs
  const silenceStartRef = useRef<number | null>(null);
  const silenceFiredRef = useRef(false);
  // Adaptive calibration: collect ambient RMS values, then compute threshold
  const calibrationSamplesRef = useRef<number[]>([]);
  const adaptiveThresholdRef = useRef<number | null>(null);
  // Require at least one "loud" chunk before monitoring silence (prevents
  // auto-stop before the user has started speaking)
  const speechDetectedRef = useRef(false);

  // Store config in ref so callbacks see latest values without re-creating
  const configRef = useRef(config);
  configRef.current = config;

  const startRecording = useCallback(async () => {
    setError(null);

    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      setError('Microphone permission denied');
      console.warn(`${DEBUG_PREFIX} microphone permission denied`);
      return false;
    }

    try {
      // Defensive: avoid duplicate timers if start is called twice
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      // Reset accumulation buffers
      chunksRef.current = [];
      totalSamplesRef.current = 0;
      emptyChunkCountRef.current = 0;
      silenceStartRef.current = null;
      silenceFiredRef.current = false;
      calibrationSamplesRef.current = [];
      adaptiveThresholdRef.current = null;
      speechDetectedRef.current = false;
      recordingStartRef.current = Date.now();
      audioLevelSmoothedRef.current = 0;
      peakRmsRef.current = 0.06;
      setDuration(0);
      setAudioLevel(0);

      // Match private-mind session setup.
      try {
        AudioManager.setAudioSessionOptions({
          iosCategory: 'playAndRecord',
          iosMode: 'spokenAudio',
        });
      } catch {
        // Best effort only.
      }
      try {
        const devices = await AudioManager.getDevicesInfo();
        console.log(`${DEBUG_PREFIX} route diagnostics`, {
          currentInputs: devices.currentInputs?.map((d) => `${d.category}:${d.name}`) ?? [],
          currentOutputs: devices.currentOutputs?.map((d) => `${d.category}:${d.name}`) ?? [],
        });
      } catch {
        // Best effort only.
      }

      console.log(`${DEBUG_PREFIX} starting recorder`, {
        sampleRate: SAMPLE_RATE,
        bufferLength: BUFFER_LENGTH,
      });

      let chunkCount = 0;
      let callbackCount = 0;
      const handleAudioReady = (event: any) => {
        try {
          callbackCount += 1;
          const buffer = event?.buffer;
          if (!buffer || typeof buffer.getChannelData !== 'function') {
            return;
          }
          const picked = pickChannelData(buffer);
          const channelData = picked.samples;
          if (!channelData || channelData.length === 0) {
            emptyChunkCountRef.current += 1;
            if (emptyChunkCountRef.current <= 3) {
              console.warn(
                `${DEBUG_PREFIX} empty audio chunk received (cb=${callbackCount}, channels=${picked.channelCount}, lens=${picked.channelLengths.join('/')})`,
              );
            }
            return;
          }
          if (callbackCount <= 3) {
            console.log(
              `${DEBUG_PREFIX} callback meta cb=${callbackCount} channels=${picked.channelCount} chosen=${picked.channelIndex} lens=${picked.channelLengths.join('/')} sampleRate=${buffer.sampleRate ?? 'n/a'}`,
            );
          }
          // Copy the chunk (the underlying buffer may be reused)
          const copy = new Float32Array(channelData.length);
          copy.set(channelData);
          chunksRef.current.push(copy);
          totalSamplesRef.current += copy.length;

          // Compute RMS for audio level + silence detection
          const rms = computeRMS(copy);
          // UI level: adaptive normalization so normal speech isn't stuck at one bar.
          const ambient =
            calibrationSamplesRef.current.length > 0
              ? calibrationSamplesRef.current.reduce((a, b) => a + b, 0) /
                calibrationSamplesRef.current.length
              : MIN_SILENCE_THRESHOLD * 0.8;
          const floor = Math.max(MIN_SILENCE_THRESHOLD * 0.6, ambient * 1.15);
          peakRmsRef.current = Math.max(rms, peakRmsRef.current * 0.97, floor * 4);
          const range = Math.max(peakRmsRef.current - floor, 0.01);
          const levelBoost = configRef.current?.levelBoost ?? 1.35;
          const normalized = Math.max(0, Math.min(1, ((rms - floor) / range) * levelBoost));
          const smoothed =
            audioLevelSmoothedRef.current * (1 - LEVEL_EMA_ALPHA) +
            normalized * LEVEL_EMA_ALPHA;
          audioLevelSmoothedRef.current = smoothed;
          setAudioLevel(smoothed);
          chunkCount += 1;
          if (chunkCount <= 3 || chunkCount % 20 === 0) {
            console.log(
              `${DEBUG_PREFIX} audio chunk count=${chunkCount} samples=${copy.length} rms=${Number(rms.toFixed(5))}`,
            );
          }

          // Silence detection with adaptive calibration
          const cfg = configRef.current;
          if (cfg?.onSilenceDetected && !silenceFiredRef.current) {
            const timeoutMs = cfg.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
            const noSpeechTimeoutMs = cfg.noSpeechTimeoutMs ?? 7000;
            const maxRecordingMs = cfg.maxRecordingMs ?? 20000;
            const elapsed = recordingStartRef.current
              ? Date.now() - recordingStartRef.current
              : 0;

            // Hard safety caps so a field never records forever.
            if (elapsed >= maxRecordingMs) {
              silenceFiredRef.current = true;
              console.log(`${DEBUG_PREFIX} auto-stop: max recording reached`, {
                elapsedMs: elapsed,
              });
              cfg.onSilenceDetected();
              return;
            }

            // Phase 1: Calibration — collect ambient noise RMS for ~1 second
            if (calibrationSamplesRef.current.length < CALIBRATION_CHUNKS) {
              calibrationSamplesRef.current.push(rms);
              if (calibrationSamplesRef.current.length === CALIBRATION_CHUNKS) {
                const avgAmbient =
                  calibrationSamplesRef.current.reduce((a, b) => a + b, 0) /
                  CALIBRATION_CHUNKS;
                const multiplier = cfg.calibrationMultiplier ?? CALIBRATION_MULTIPLIER;
                adaptiveThresholdRef.current = Math.max(
                  MIN_SILENCE_THRESHOLD,
                  avgAmbient * multiplier,
                );
              }
              return; // don't monitor silence during calibration
            }

            const threshold =
              cfg.silenceThreshold ??
              adaptiveThresholdRef.current ??
              MIN_SILENCE_THRESHOLD;

            if (rms >= threshold) {
              // Loud chunk — user is speaking
              speechDetectedRef.current = true;
              silenceStartRef.current = null;
            } else {
              // If user never crosses threshold, still stop after no-speech timeout.
              if (!speechDetectedRef.current && elapsed >= noSpeechTimeoutMs) {
                silenceFiredRef.current = true;
                console.log(`${DEBUG_PREFIX} auto-stop: no speech detected`, {
                  elapsedMs: elapsed,
                  threshold,
                  rms: Number(rms.toFixed(5)),
                });
                cfg.onSilenceDetected();
                return;
              }

              // Silent chunk, but only monitor after speech was detected
              if (speechDetectedRef.current) {
                if (silenceStartRef.current === null) {
                  silenceStartRef.current = Date.now();
                } else if (Date.now() - silenceStartRef.current >= timeoutMs) {
                  // Sustained silence after speech — auto-stop
                  silenceFiredRef.current = true;
                  cfg.onSilenceDetected();
                }
              }
            }
          }
        } catch (callbackErr) {
          console.error(`${DEBUG_PREFIX} onAudioReady handler failed`, callbackErr);
        }
      };

      const recorder = recorderRef.current;
      if (!recorder) {
        throw new Error('Audio recorder unavailable');
      }
      recorder.onAudioReady(handleAudioReady);
      recorder.start();
      setIsRecording(true);
      console.log(`${DEBUG_PREFIX} recorder started`);

      // Update duration every 250ms
      const startTime = Date.now();
      durationTimerRef.current = setInterval(() => {
        setDuration((Date.now() - startTime) / 1000);
      }, 250);
      return true;
    } catch (err: any) {
      const message = err?.message ?? 'Failed to start recording';
      setError(message);
      console.error(`${DEBUG_PREFIX} failed to start`, err);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Float32Array> => {
    console.log(`${DEBUG_PREFIX} stopRecording invoked`, {
      isRecording,
      stack:
        new Error()
          .stack
          ?.split('\n')
          .slice(0, 4)
          .join(' | ') ?? 'n/a',
    });
    // Stop duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // Stop the recorder
    if (recorderRef.current) {
      try {
        const maybePromise = (recorderRef.current as any).stop();
        if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
          await maybePromise;
        }
        console.log(`${DEBUG_PREFIX} recorder stopped`);
      } catch {
        // ignore — recorder may already be stopped
      }
    }

    // Let any trailing onAudioReady callbacks flush into chunksRef.
    // On iOS, we can receive a final chunk very near/after stop.
    await new Promise((resolve) => setTimeout(resolve, STOP_FLUSH_DELAY_MS));

    setIsRecording(false);

    // Concatenate all chunks into a single Float32Array
    const totalLength = totalSamplesRef.current;
    console.log(
      `${DEBUG_PREFIX} finalizing waveform totalSamples=${totalLength} chunkCount=${chunksRef.current.length}`,
    );
    if (totalLength === 0) {
      return new Float32Array(0);
    }

    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Clear refs
    chunksRef.current = [];
    totalSamplesRef.current = 0;
    emptyChunkCountRef.current = 0;
    recordingStartRef.current = null;
    silenceStartRef.current = null;
    silenceFiredRef.current = false;
    calibrationSamplesRef.current = [];
    adaptiveThresholdRef.current = null;
    speechDetectedRef.current = false;
    setAudioLevel(0);

    return result;
  }, [isRecording]);

  return {
    isRecording,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  };
}
