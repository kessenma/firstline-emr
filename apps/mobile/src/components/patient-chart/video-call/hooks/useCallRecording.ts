// apps/mobile/src/components/patient-chart/video-call/hooks/useCallRecording.ts
//
// Owns RECORDING only — the part that must share the call's lifetime.
//
//   call connects → language gate → start recording both streams
//   call ends     → stop, hand a job to TranscriptionJobsContext
//
// Transcription deliberately lives app-level (TranscriptionJobsContext), not
// here. This hook is inside VideoCallSessionProvider, which unmounts the moment
// the clinician leaves the patient chart — which is exactly what people do
// after hanging up. A chart-scoped transcription runner would orphan almost
// every job it started.
//
// Recording still belongs here: the call sheet unmounts whenever the call is
// minimized to browse the chart, which is precisely when recording must NOT
// stop, and only the provider outlives that.

import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { CallTranscription } from '../../../../native/NativeCallTranscription';
import { useTranscriptionJobs } from '../../../../contexts/TranscriptionJobsContext';
import { uploadCallAudio } from './uploadCallAudio';
import type { TranscriptionJob } from './useCallTranscriptionJobs';

export type CallRecordingState =
  | 'idle'
  /** Clinician declined to transcribe an unsupported language. */
  | 'skipped'
  | 'recording'
  | 'finishing';

export interface CallRecordingController {
  state: CallRecordingState;
}

interface UseCallRecordingOptions {
  enabled: boolean;
  isConnected: boolean;
  sessionId: string | null;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorLocale: string;
  patientLocale: string;
  /** Display name, e.g. "Pashto" — the unsupported-language prompt has to name
   *  the language to mean anything. */
  patientLanguageName?: string | null;
  authorId?: string;
  authorName?: string;
}

/**
 * Asks whether to transcribe a language the speech engine does not support.
 *
 * This prompt is the whole safeguard. An unsupported language does not fail
 * loudly — the engine happily produces fluent, wrong English from Pashto audio,
 * and a plausible-looking wrong transcript in a medical record is considerably
 * worse than no transcript.
 */
function askProceedWithUnsupportedLanguage(
  languageName: string,
): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Transcription not available',
      `The speech engine on this device cannot transcribe ${languageName}. ` +
        'Transcribing anyway will produce unreliable results that may look correct but are not.',
      [
        {
          text: 'Skip transcription',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Transcribe anyway',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

export function useCallRecording(
  options: UseCallRecordingOptions,
): CallRecordingController {
  const { enabled, isConnected, sessionId } = options;

  const [state, setState] = useState<CallRecordingState>('idle');
  const { enqueue } = useTranscriptionJobs();

  const recordingSessionRef = useRef<string | null>(null);
  /** null = not yet asked. 'override' = clinician chose to transcribe a
   *  language the engine cannot handle, which the note records forever. */
  const languageDecisionRef = useRef<
    'supported' | 'override' | 'skip' | null
  >(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Each call is asked on its own terms rather than inheriting the last answer.
  useEffect(() => {
    languageDecisionRef.current = null;
  }, [sessionId]);

  // ---- Start on connect ----
  useEffect(() => {
    if (!enabled || !isConnected || !sessionId) return;
    if (!CallTranscription.isModuleAvailable()) return;
    if (recordingSessionRef.current) return;
    if (languageDecisionRef.current === 'skip') return;

    let cancelled = false;

    void (async () => {
      const opts = optionsRef.current;

      // Language gate, before a single byte is recorded.
      if (languageDecisionRef.current === null) {
        const supported = await CallTranscription.isLocaleSupported(
          opts.patientLocale,
        );
        if (cancelled) return;

        if (supported) {
          languageDecisionRef.current = 'supported';
        } else {
          const proceed = await askProceedWithUnsupportedLanguage(
            opts.patientLanguageName || 'this language',
          );
          if (cancelled) return;
          if (!proceed) {
            languageDecisionRef.current = 'skip';
            setState('skipped');
            return;
          }
          languageDecisionRef.current = 'override';
        }
      }

      const started = await CallTranscription.startRecording(sessionId);
      if (!started) return;
      if (cancelled) {
        void CallTranscription.cancelRecording();
        return;
      }
      recordingSessionRef.current = sessionId;
      setState('recording');
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isConnected, sessionId]);

  // ---- Consent withdrawn mid-call ----
  //
  // Discard rather than keep. The patient has just refused the thing this audio
  // exists for, so retaining it would be exactly wrong.
  useEffect(() => {
    if (enabled) return;
    if (!recordingSessionRef.current) return;
    recordingSessionRef.current = null;
    void CallTranscription.cancelRecording();
    setState('idle');
  }, [enabled]);

  // ---- Stop on disconnect, hand the job over ----
  useEffect(() => {
    if (isConnected) return;
    const recordingSession = recordingSessionRef.current;
    if (!recordingSession) return;
    recordingSessionRef.current = null;

    const opts = optionsRef.current;
    setState('finishing');

    void (async () => {
      const result = await CallTranscription.stopRecording();
      if (!result) {
        setState('idle');
        return;
      }

      const job: TranscriptionJob = {
        jobId: `${recordingSession}-${Date.now()}`,
        sessionId: recordingSession,
        patientId: opts.patientId,
        patientEmail: opts.patientEmail,
        patientName: opts.patientName,
        doctorPath: result.doctorPath,
        patientPath: result.patientPath,
        doctorLocale: opts.doctorLocale,
        // An override means the engine cannot use the patient's real locale,
        // so fall back to the clinician's.
        patientLocale:
          languageDecisionRef.current === 'override'
            ? opts.doctorLocale
            : opts.patientLocale,
        languageSupported: languageDecisionRef.current !== 'override',
        callStartedAt: new Date(
          Date.now() - result.durationSeconds * 1000,
        ).toISOString(),
        durationSeconds: Math.round(result.durationSeconds),
        droppedFrames:
          result.doctorDroppedFrames + result.patientDroppedFrames,
        status: 'pending',
        attempts: 0,
        authorId: opts.authorId,
        authorName: opts.authorName,
        uploaded: false,
      };

      // Hand off before uploading — transcription reads the LOCAL file and must
      // never wait on the network. The upload is a durability backup for the
      // case where this phone is lost before the transcript is written.
      enqueue(job);
      void uploadCallAudio(job);

      setState('idle');
    })();
    // Keyed on connection only; the body reads current values through a ref so
    // a re-render cannot restart a finished call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  return { state };
}
