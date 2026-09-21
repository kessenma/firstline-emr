// Hands-free dictation state machine for the Hands-Free tab.
// Voice-guided flow: IDLE → PROMPTING → LISTENING → [next field | REVIEW]
// Uses TTS prompts + native streaming STT for fully hands-free operation.
// Real-time partial results — no separate "transcribing" phase.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechToTextEngine, type SessionEndReason } from './useSpeechToTextEngine';
import { useDictationTTS } from '../../../../hooks/useDictationTTS';
import type { DictationResult } from './useVoiceDictation';
import type { DictationField } from './useFieldDictation';

export type HandsFreeState =
  | 'idle'
  | 'prompting'
  | 'listening'
  | 'review';

const FIELD_ORDER: DictationField[] = ['procedureName', 'diagnosis', 'notes', 'plan'];

const FIELD_PROMPTS: Record<DictationField, string> = {
  procedureName: 'Describe the procedure name.',
  diagnosis: 'Now describe the diagnosis.',
  notes: 'Describe the procedure details and any findings.',
  plan: 'Finally, describe the post-operative plan.',
};

const FIELD_LABELS: Record<DictationField, string> = {
  procedureName: 'Procedure Name',
  diagnosis: 'Diagnosis',
  notes: 'Notes',
  plan: 'Plan',
};

const TRANSITION_PROMPT = 'Got it. Moving on.';
const COMPLETION_PROMPT = 'All done. Your note is saved as a draft.';
const TTS_TO_STT_DELAY_MS = 250;
const DEBUG_PREFIX = '[VoiceDictation:HandsFree]';

// Trigger words the user can say to advance to the next field.
export const TRIGGER_WORDS = ['next', 'done', 'finished', 'continue', 'move on'] as const;

// Command trigger words for recording control (used by Guided mode).
export const STOP_TRIGGERS = ['cancel', 'stop'] as const;
export const REDO_TRIGGERS = ['redo', 'start over', 'restart'] as const;
export const SAVE_DRAFT_TRIGGERS = ['save draft', 'save note'] as const;
const TRIGGER_REGEX = new RegExp(
  `\\b(?:${TRIGGER_WORDS.join('|')})[.,!?]*\\s*$`,
  'i',
);

export interface UseHandsFreeDictationReturn {
  state: HandsFreeState;
  currentFieldIndex: number;
  currentField: DictationField;
  fieldValues: Record<DictationField, string>;
  setFieldValue: (field: DictationField, value: string) => void;
  completedFields: Set<DictationField>;
  /** Live partial transcript for the current field */
  liveTranscript: string;
  /** Detected trigger words per field (for visual indicator). Null if none detected. */
  detectedTriggerWords: Record<DictationField, string | null>;
  /** Dismiss a trigger word indicator for a field. */
  dismissTriggerWord: (field: DictationField) => void;
  duration: number;
  /** Current mic audio level (0-1) from native STT. For UI visualization. */
  audioLevel: number;
  isSTTReady: boolean;
  isTTSSpeaking: boolean;
  error: string | null;
  start: () => void;
  cancel: () => void;
  getResult: () => DictationResult;
  reset: () => void;
}

export function useHandsFreeDictation(): UseHandsFreeDictationReturn {
  const [state, setState] = useState<HandsFreeState>('idle');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<DictationField, string>>({
    procedureName: '',
    diagnosis: '',
    notes: '',
    plan: '',
  });
  const [completedFields, setCompletedFields] = useState<Set<DictationField>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [detectedTriggerWords, setDetectedTriggerWords] = useState<Record<DictationField, string | null>>({
    procedureName: null, diagnosis: null, notes: null, plan: null,
  });
  const [duration, setDuration] = useState(0);

  const tts = useDictationTTS();

  // Refs for async coordination
  const cancelledRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const currentFieldIndexRef = useRef(currentFieldIndex);
  currentFieldIndexRef.current = currentFieldIndex;
  const flowTokenRef = useRef(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggerDetectedRef = useRef(false);

  // Handle silence / session end from native STT
  const handleSessionEnded = useCallback(async (reason: SessionEndReason, finalText: string) => {
    console.log(`${DEBUG_PREFIX} session ended`, { reason, state: stateRef.current });
    if (stateRef.current !== 'listening' || cancelledRef.current) return;
    if (triggerDetectedRef.current) return; // Already advancing via trigger word

    // Stop duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    const token = flowTokenRef.current;
    const fieldIndex = currentFieldIndexRef.current;
    const field = FIELD_ORDER[fieldIndex];
    if (!field) return;

    // Clean text and check for trigger words
    let cleanText = finalText.trim();
    const triggerMatch = cleanText.match(TRIGGER_REGEX);
    if (triggerMatch && triggerMatch.index != null) {
      const triggerWord = triggerMatch[0].replace(/[.,!?\s]+$/, '');
      cleanText = cleanText.slice(0, triggerMatch.index).trim();
      setDetectedTriggerWords(prev => ({ ...prev, [field]: triggerWord }));
    }

    // Save field text
    if (cleanText.length > 0) {
      setFieldValues(prev => ({
        ...prev,
        [field]: prev[field] ? `${prev[field]} ${cleanText}` : cleanText,
      }));
    }
    setCompletedFields(prev => new Set(prev).add(field));

    // Advance to next field or review
    await advanceToNextField(fieldIndex, token);
  }, []);

  const stt = useSpeechToTextEngine({ onSessionEnded: handleSessionEnded });

  // Watch partial results for trigger words in real-time
  useEffect(() => {
    if (stateRef.current !== 'listening' || !stt.partialResult) return;

    const match = stt.partialResult.match(TRIGGER_REGEX);
    if (!match || triggerDetectedRef.current) return;

    // Trigger word detected in real-time! Advance immediately.
    triggerDetectedRef.current = true;
    console.log(`${DEBUG_PREFIX} trigger word detected in partial result`);

    const field = FIELD_ORDER[currentFieldIndexRef.current];
    if (!field) return;

    const triggerWord = match[0].replace(/[.,!?\s]+$/, '');
    const cleanText = stt.partialResult.slice(0, match.index).trim();

    setDetectedTriggerWords(prev => ({ ...prev, [field]: triggerWord }));

    // Stop listening and save
    void stt.stopListening().then(async () => {
      if (cancelledRef.current) return;

      // Stop duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      if (cleanText.length > 0) {
        setFieldValues(prev => ({
          ...prev,
          [field]: prev[field] ? `${prev[field]} ${cleanText}` : cleanText,
        }));
      }
      setCompletedFields(prev => new Set(prev).add(field));

      await advanceToNextField(currentFieldIndexRef.current, flowTokenRef.current);
    });
  }, [stt.partialResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToNextField = useCallback(async (fieldIndex: number, token: number) => {
    const nextIndex = fieldIndex + 1;
    if (nextIndex < FIELD_ORDER.length) {
      setCurrentFieldIndex(nextIndex);
      currentFieldIndexRef.current = nextIndex;
      setState('prompting');

      // Speak transition + next prompt
      try {
        await tts.speak(TRANSITION_PROMPT);
        if (cancelledRef.current || token !== flowTokenRef.current) return;
        await tts.speak(FIELD_PROMPTS[FIELD_ORDER[nextIndex]]);
        if (cancelledRef.current || token !== flowTokenRef.current) return;
        tts.stop();
        await new Promise(r => setTimeout(r, TTS_TO_STT_DELAY_MS));
      } catch {
        // TTS failed — continue silently
      }

      // Auto-start listening for next field
      if (cancelledRef.current || token !== flowTokenRef.current) return;
      await startListeningForField();
    } else {
      // All fields done → review
      setState('review');
      try {
        await tts.speak(COMPLETION_PROMPT);
      } catch {
        // ignore
      }
    }
  }, [tts]); // eslint-disable-line react-hooks/exhaustive-deps

  const startListeningForField = useCallback(async () => {
    triggerDetectedRef.current = false;
    setDuration(0);

    try {
      await stt.startListening();
      setState('listening');

      // Start duration counter
      const startTime = Date.now();
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start speech recognition');
      setState('idle');
    }
  }, [stt]);

  const currentField = FIELD_ORDER[currentFieldIndex] ?? 'procedureName';

  const setFieldValue = useCallback((field: DictationField, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') {
      console.warn(`${DEBUG_PREFIX} start ignored, state:`, stateRef.current);
      return;
    }

    flowTokenRef.current += 1;
    const token = flowTokenRef.current;
    setError(null);
    cancelledRef.current = false;
    setCurrentFieldIndex(0);
    currentFieldIndexRef.current = 0;
    setFieldValues({ procedureName: '', diagnosis: '', notes: '', plan: '' });
    setCompletedFields(new Set());
    setDetectedTriggerWords({ procedureName: null, diagnosis: null, notes: null, plan: null });
    triggerDetectedRef.current = false;

    setState('prompting');

    // Speak first prompt
    try {
      await tts.speak(FIELD_PROMPTS[FIELD_ORDER[0]]);
      if (cancelledRef.current || token !== flowTokenRef.current) return;
      tts.stop();
      await new Promise(r => setTimeout(r, TTS_TO_STT_DELAY_MS));
    } catch {
      // TTS failed — continue silently
    }

    // Start listening
    if (cancelledRef.current || token !== flowTokenRef.current) return;
    await startListeningForField();
    console.log(`${DEBUG_PREFIX} initial listening started`);
  }, [tts, startListeningForField]);

  const dismissTriggerWord = useCallback((field: DictationField) => {
    setDetectedTriggerWords(prev => ({ ...prev, [field]: null }));
  }, []);

  const cancel = useCallback(() => {
    console.log(`${DEBUG_PREFIX} cancel called`);
    flowTokenRef.current += 1;
    cancelledRef.current = true;
    tts.stop();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    stt.cancelListening();

    setState('idle');
    setCurrentFieldIndex(0);
    setFieldValues({ procedureName: '', diagnosis: '', notes: '', plan: '' });
    setCompletedFields(new Set());
    setDetectedTriggerWords({ procedureName: null, diagnosis: null, notes: null, plan: null });
    setError(null);
    setDuration(0);
  }, [tts, stt]);

  const getResult = useCallback((): DictationResult => {
    const result: DictationResult = {};
    if (fieldValues.procedureName.trim()) result.procedureName = fieldValues.procedureName.trim();
    if (fieldValues.diagnosis.trim()) result.diagnosis = fieldValues.diagnosis.trim();
    if (fieldValues.notes.trim()) result.notes = fieldValues.notes.trim();
    if (fieldValues.plan.trim()) result.plan = fieldValues.plan.trim();
    return result;
  }, [fieldValues]);

  const reset = useCallback(() => {
    console.log(`${DEBUG_PREFIX} reset called`);
    flowTokenRef.current += 1;
    cancelledRef.current = true;
    tts.stop();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    stt.cancelListening();

    setState('idle');
    setCurrentFieldIndex(0);
    setFieldValues({ procedureName: '', diagnosis: '', notes: '', plan: '' });
    setCompletedFields(new Set());
    setDetectedTriggerWords({ procedureName: null, diagnosis: null, notes: null, plan: null });
    setError(null);
    setDuration(0);
  }, [tts, stt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    currentFieldIndex,
    currentField,
    fieldValues,
    setFieldValue,
    completedFields,
    liveTranscript: stt.partialResult,
    detectedTriggerWords,
    dismissTriggerWord,
    duration,
    audioLevel: stt.audioLevel,
    isSTTReady: stt.isReady,
    isTTSSpeaking: tts.isSpeaking,
    error: error ?? stt.error,
    start,
    cancel,
    getResult,
    reset,
  };
}

export { FIELD_ORDER, FIELD_LABELS };
