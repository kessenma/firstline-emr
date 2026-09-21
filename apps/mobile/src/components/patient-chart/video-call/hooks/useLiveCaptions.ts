// apps/mobile/src/components/patient-chart/video-call/hooks/useLiveCaptions.ts
//
// Live captioning during a call, for clinicians who chose the 'live' mode.
//
// Two things this does NOT do, both deliberate:
//
//  - It never writes audio to disk. Live mode's whole trade is captions in
//    exchange for no recording, which also means no retry if it fails.
//  - It never puts a volatile segment in a note. The engine revises those in
//    place as someone keeps talking; only finals are real.
//
// Segments are accumulated here and written as one Patient Call note at
// hang-up, so a live call still leaves the same artifact in the chart as a
// post-call one.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CallTranscription,
  type TranscriptSegment,
} from '../../../../native/NativeCallTranscription';
import { ORTHOPEDIC_VOCABULARY } from '../../notes/voice-dictation/medicalVocabulary';

export interface LiveCaptionsController {
  active: boolean;
  /** Finalized segments, oldest first. */
  segments: TranscriptSegment[];
  /** In-flight text per speaker, revised as they talk. Never persisted. */
  volatile: Partial<Record<'doctor' | 'patient', TranscriptSegment>>;
  /** Drains and clears the accumulated finals — called once at hang-up. */
  takeSegments: () => TranscriptSegment[];
}

interface UseLiveCaptionsOptions {
  enabled: boolean;
  isConnected: boolean;
  doctorLocale: string;
  patientLocale: string;
}

/**
 * Captions arrive at speech cadence — several per second per speaker. Setting
 * state on every one drops video frames, so they are buffered in a ref and
 * flushed on a fixed interval instead.
 */
const FLUSH_INTERVAL_MS = 250;

export function useLiveCaptions(
  options: UseLiveCaptionsOptions,
): LiveCaptionsController {
  const { enabled, isConnected, doctorLocale, patientLocale } = options;

  const [active, setActive] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [volatile, setVolatile] = useState<
    Partial<Record<'doctor' | 'patient', TranscriptSegment>>
  >({});

  // Authoritative buffers. State is a throttled view of these.
  const finalsRef = useRef<TranscriptSegment[]>([]);
  const volatileRef = useRef<
    Partial<Record<'doctor' | 'patient', TranscriptSegment>>
  >({});
  const dirtyRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isConnected) return;
    if (!CallTranscription.isModuleAvailable()) return;
    if (runningRef.current) return;

    let cancelled = false;
    runningRef.current = true;

    const subscription = CallTranscription.addListener(
      'onLiveSegment',
      segment => {
        if (segment.isFinal) {
          // Replace any volatile text for this speaker — the final supersedes
          // whatever was being revised.
          delete volatileRef.current[segment.speaker];
          finalsRef.current = [...finalsRef.current, segment].sort(
            (a, b) => a.startMs - b.startMs,
          );
        } else {
          volatileRef.current[segment.speaker] = segment;
        }
        dirtyRef.current = true;
      },
    );

    const flush = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSegments([...finalsRef.current]);
      setVolatile({ ...volatileRef.current });
    }, FLUSH_INTERVAL_MS);

    void CallTranscription.startLiveTranscription({
      doctorLocale,
      patientLocale,
      contextualStrings: ORTHOPEDIC_VOCABULARY,
    }).then(started => {
      if (cancelled || !started) {
        if (started) void CallTranscription.stopLiveTranscription();
        return;
      }
      setActive(true);
    });

    return () => {
      cancelled = true;
      runningRef.current = false;
      subscription.remove();
      clearInterval(flush);
      void CallTranscription.stopLiveTranscription();
      setActive(false);
      setVolatile({});
      volatileRef.current = {};
    };
  }, [enabled, isConnected, doctorLocale, patientLocale]);

  const takeSegments = useCallback((): TranscriptSegment[] => {
    const out = [...finalsRef.current];
    finalsRef.current = [];
    setSegments([]);
    return out;
  }, []);

  return { active, segments, volatile, takeSegments };
}
