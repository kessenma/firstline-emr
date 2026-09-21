// TypeScript wrapper for the NativeCallTranscription native module.
//
// On-device recording and transcription of patient video calls. Audio never
// leaves the phone for transcription: SpeechAnalyzer (iOS 26+) has no server
// path, unlike the SFSpeechRecognizer used for note dictation, which silently
// falls back to Apple's servers when on-device recognition is unavailable.
//
// Recording and transcription are separate operations on purpose. Post-call
// mode hangs up first and transcribes after, and a failed transcription has to
// be retryable from the audio still sitting on disk.

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export type TranscriptSpeaker = 'doctor' | 'patient';

export interface TranscriptSegment {
  /** `${speaker}-${startMs}` — stable, so JS can de-duplicate on retry. */
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  /** Milliseconds from the start of the recording. Both streams share one
   *  timeline (the recorder pads silence to keep them aligned), so segments
   *  from the two speakers can be interleaved by comparing these directly. */
  startMs: number;
  endMs: number;
  isFinal: boolean;
}

export interface CallRecordingResult {
  doctorPath: string;
  patientPath: string;
  durationSeconds: number;
  doctorDroppedFrames: number;
  patientDroppedFrames: number;
}

export interface CallAudioStreamStats {
  /** Callbacks in the last second. WebRTC uses 10ms frames, so ~100 when
   *  audio is flowing. Zero for a sustained period means the tap is dead. */
  callbacks: number;
  frames: number;
  /** Ring-buffer overflow. Non-zero means the transcript has real gaps. */
  droppedFrames: number;
  rms: number;
  sampleRate: number;
  channels: number;
}

export interface CallTranscriptionEvents {
  onCallAudioStats: {
    doctor: CallAudioStreamStats;
    patient: CallAudioStreamStats;
  };
  onTranscriptionProgress: {
    jobId: string;
    speaker: TranscriptSpeaker;
    /** 0–1 across BOTH streams: doctor occupies 0–0.5, patient 0.5–1. */
    fraction: number;
  };
  /** Live captions. Volatile segments (isFinal false) are revised in place and
   *  must never be persisted — only finals belong in a note. */
  onLiveSegment: TranscriptSegment;
}

interface LiveTranscriptionOptions {
  doctorLocale?: string;
  patientLocale?: string;
  contextualStrings?: string[];
}

interface TranscribeOptions {
  jobId: string;
  doctorPath: string;
  patientPath: string;
  doctorLocale?: string;
  patientLocale?: string;
  contextualStrings?: string[];
}

const NativeBridge = NativeModules.NativeCallTranscription as
  | {
      isSupported(): Promise<{ supported: boolean; reason?: string }>;
      supportedLocales(): Promise<string[]>;
      installedLocales(): Promise<string[]>;
      isLocaleSupported(locale: string): Promise<boolean>;
      prepareLocale(locale: string): Promise<{ prepared: boolean }>;
      startRecording(
        sessionId: string,
      ): Promise<{ started: boolean; directory: string }>;
      stopRecording(): Promise<CallRecordingResult>;
      cancelRecording(): Promise<{ cancelled: boolean }>;
      discardRecording(sessionId: string): Promise<{ discarded: boolean }>;
      transcribe(
        options: TranscribeOptions,
      ): Promise<{ jobId: string; segments: TranscriptSegment[] }>;
      cancelTranscription(jobId: string): Promise<{ cancelled: boolean }>;
      startLiveTranscription(
        options: LiveTranscriptionOptions,
      ): Promise<{ started: boolean }>;
      stopLiveTranscription(): Promise<{ stopped: boolean }>;
    }
  | undefined;

class NativeCallTranscriptionService {
  private emitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(
        NativeModules.NativeCallTranscription,
      );
    }
    return this.emitter;
  }

  isModuleAvailable(): boolean {
    return Platform.OS === 'ios' && !!NativeBridge;
  }

  /** iOS 26+ check. Everything else here assumes this returned true. */
  async isSupported(): Promise<{ supported: boolean; reason?: string }> {
    if (!NativeBridge) {
      return { supported: false, reason: 'Not available on this platform' };
    }
    try {
      return await NativeBridge.isSupported();
    } catch {
      return { supported: false, reason: 'Speech framework unavailable' };
    }
  }

  async supportedLocales(): Promise<string[]> {
    if (!NativeBridge) return [];
    try {
      return await NativeBridge.supportedLocales();
    } catch {
      return [];
    }
  }

  async installedLocales(): Promise<string[]> {
    if (!NativeBridge) return [];
    try {
      return await NativeBridge.installedLocales();
    } catch {
      return [];
    }
  }

  /**
   * Whether a language can be transcribed at all.
   *
   * Callers MUST check this before recording. Transcribing an unsupported
   * language does not fail loudly — it produces fluent nonsense, which in a
   * patient record is considerably worse than having no transcript.
   */
  async isLocaleSupported(locale: string): Promise<boolean> {
    if (!NativeBridge) return false;
    try {
      return await NativeBridge.isLocaleSupported(locale);
    } catch {
      return false;
    }
  }

  /** Downloads speech assets for a locale. Worth doing on WiFi, ahead of time. */
  async prepareLocale(locale: string): Promise<void> {
    if (!NativeBridge) throw new Error('Call transcription not available');
    await NativeBridge.prepareLocale(locale);
  }

  async startRecording(sessionId: string): Promise<boolean> {
    if (!NativeBridge) return false;
    try {
      const result = await NativeBridge.startRecording(sessionId);
      return result.started;
    } catch (err) {
      console.warn('[CallTranscription] startRecording failed:', err);
      return false;
    }
  }

  async stopRecording(): Promise<CallRecordingResult | null> {
    if (!NativeBridge) return null;
    try {
      return await NativeBridge.stopRecording();
    } catch (err) {
      console.warn('[CallTranscription] stopRecording failed:', err);
      return null;
    }
  }

  /** Aborts and deletes in-flight audio — for consent withdrawn mid-call. */
  async cancelRecording(): Promise<void> {
    if (!NativeBridge) return;
    try {
      await NativeBridge.cancelRecording();
    } catch {
      // Nothing useful to do; the files are cache-scoped either way.
    }
  }

  /** Deletes a session's audio once its transcript is safely persisted. */
  async discardRecording(sessionId: string): Promise<void> {
    if (!NativeBridge) return;
    try {
      await NativeBridge.discardRecording(sessionId);
    } catch {
      // Best effort — see above.
    }
  }

  async transcribe(options: TranscribeOptions): Promise<TranscriptSegment[]> {
    if (!NativeBridge) throw new Error('Call transcription not available');
    const result = await NativeBridge.transcribe(options);
    return result.segments;
  }

  /**
   * Starts live captioning. Mutually exclusive with recording — both drain the
   * same native ring buffers, and the native side rejects the second caller.
   *
   * Live mode writes NO audio to disk: nothing to upload, nothing to purge, and
   * nothing to retry from if it fails. That is the trade for captions.
   */
  async startLiveTranscription(
    options: LiveTranscriptionOptions,
  ): Promise<boolean> {
    if (!NativeBridge) return false;
    try {
      const result = await NativeBridge.startLiveTranscription(options);
      return result.started;
    } catch (err) {
      console.warn('[CallTranscription] startLiveTranscription failed:', err);
      return false;
    }
  }

  async stopLiveTranscription(): Promise<void> {
    if (!NativeBridge) return;
    try {
      await NativeBridge.stopLiveTranscription();
    } catch (err) {
      console.warn('[CallTranscription] stopLiveTranscription failed:', err);
    }
  }

  async cancelTranscription(jobId: string): Promise<void> {
    if (!NativeBridge) return;
    try {
      await NativeBridge.cancelTranscription(jobId);
    } catch {
      // Job may already have finished.
    }
  }

  addListener<K extends keyof CallTranscriptionEvents>(
    event: K,
    callback: (data: CallTranscriptionEvents[K]) => void,
  ) {
    return this.getEmitter().addListener(event, callback);
  }
}

export const CallTranscription = new NativeCallTranscriptionService();
