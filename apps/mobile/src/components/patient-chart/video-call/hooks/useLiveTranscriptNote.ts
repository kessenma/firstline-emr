// apps/mobile/src/components/patient-chart/video-call/hooks/useLiveTranscriptNote.ts
//
// Writes the Patient Call note at hang-up when the clinician is in live mode.
//
// Live mode has no audio file and therefore no transcription job — the captions
// ARE the transcript, already finalized by the time the call ends. So this path
// skips TranscriptionJobsContext entirely and writes the note directly, which
// also means there is nothing to retry: if this fails, the words are gone.
// That is the documented cost of live mode versus post-call.

import { useEffect, useRef } from 'react';
import { useNoteMutations } from '../../../../hooks/useNotes';
import type { PatientCallNoteContent } from '../../../../types/notes';
import type { TranscriptSegment } from '../../../../native/NativeCallTranscription';

const ENGINE = 'apple-speechanalyzer';

interface UseLiveTranscriptNoteOptions {
  active: boolean;
  isConnected: boolean;
  sessionId: string | null;
  patientId: string;
  patientEmail: string;
  doctorLocale: string;
  patientLocale: string;
  authorId?: string;
  authorName?: string;
  takeSegments: () => TranscriptSegment[];
}

export function useLiveTranscriptNote(
  options: UseLiveTranscriptNoteOptions,
): void {
  const { createNote } = useNoteMutations();

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Tracks the call this hook is currently "armed" for, so the note is written
  // exactly once per call rather than on every disconnect render.
  const armedSessionRef = useRef<string | null>(null);
  const callStartedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!options.active || !options.isConnected || !options.sessionId) return;
    armedSessionRef.current = options.sessionId;
    callStartedAtRef.current = new Date().toISOString();
  }, [options.active, options.isConnected, options.sessionId]);

  useEffect(() => {
    if (options.isConnected) return;

    const sessionId = armedSessionRef.current;
    if (!sessionId) return;
    armedSessionRef.current = null;

    const opts = optionsRef.current;
    const segments = opts.takeSegments();
    if (segments.length === 0) return;

    const startedAt = callStartedAtRef.current ?? new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
    );

    const content: PatientCallNoteContent = {
      videoCallSessionId: sessionId,
      callStartedAt: startedAt,
      durationSeconds,
      mode: 'live',
      doctorLocale: opts.doctorLocale,
      patientLocale: opts.patientLocale,
      // Live mode only runs when the language gate passed — an unsupported
      // language is never captioned.
      languageSupported: true,
      engine: ENGINE,
      // No ring-overflow accounting in live mode: dropped audio simply never
      // becomes a caption, and there is no file to compare against.
      droppedFrames: 0,
      segments: segments.map(s => ({
        speaker: s.speaker,
        text: s.text,
        startMs: s.startMs,
        endMs: s.endMs,
      })),
    };

    void createNote({
      patientId: opts.patientId,
      noteType: 'patient_call',
      content,
      email: opts.patientEmail,
      authorId: opts.authorId,
      authorName: opts.authorName,
      // Draft, exactly as in post-call mode. A machine transcript reaching the
      // published record unread is the failure this feature must not have.
      draft: true,
    }).catch(err => {
      // Nothing to retry from — live mode kept no audio. Surfacing the loss is
      // the only honest response.
      console.warn('[LiveTranscriptNote] failed to write note:', err);
    });
    // Keyed on connection only; everything else is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.isConnected]);
}
