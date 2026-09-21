// Per-field dictation hook for the Guided tab.
// Uses native streaming STT with continuous recording across field transitions.
// Supports navigation (next/prev field) while recording continues.
// Supports trigger-word auto-advance and silence-based auto-stop.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechToTextEngine, type SessionEndReason } from './useSpeechToTextEngine';
import { TRIGGER_WORDS, STOP_TRIGGERS, REDO_TRIGGERS, SAVE_DRAFT_TRIGGERS } from './useHandsFreeDictation';
import type { DictationResult } from './useVoiceDictation';

export type DictationField = 'procedureName' | 'diagnosis' | 'notes' | 'plan';

export const DICTATION_FIELDS: { key: DictationField; label: string }[] = [
  { key: 'procedureName', label: 'Procedure Name' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'notes', label: 'Notes' },
  { key: 'plan', label: 'Plan' },
];

// Advance to next field triggers
const TRIGGER_REGEX = new RegExp(
  `\\b(?:${TRIGGER_WORDS.join('|')})[.,!?]*\\s*$`,
  'i',
);

// Stop recording on current field (no text saved from trigger phrase)
const STOP_REGEX = new RegExp(
  `\\b(?:${STOP_TRIGGERS.join('|')})[.,!?]*\\s*$`,
  'i',
);

// Redo current field — clear text and restart recording
const REDO_REGEX = new RegExp(
  `\\b(?:${REDO_TRIGGERS.join('|')})[.,!?]*\\s*$`,
  'i',
);

// Save draft — save all fields and signal to parent
const SAVE_DRAFT_REGEX = new RegExp(
  `\\b(?:${SAVE_DRAFT_TRIGGERS.join('|')})[.,!?]*\\s*$`,
  'i',
);

export type CommandTrigger = 'advance' | 'stop' | 'redo' | 'save_draft';

/** Check partial text for any command trigger and return the match info */
function detectCommand(text: string): { command: CommandTrigger; match: RegExpMatchArray } | null {
  // Check in priority order: save_draft first (multi-word), then others
  const saveDraftMatch = text.match(SAVE_DRAFT_REGEX);
  if (saveDraftMatch) return { command: 'save_draft', match: saveDraftMatch };
  const redoMatch = text.match(REDO_REGEX);
  if (redoMatch) return { command: 'redo', match: redoMatch };
  const stopMatch = text.match(STOP_REGEX);
  if (stopMatch) return { command: 'stop', match: stopMatch };
  const advanceMatch = text.match(TRIGGER_REGEX);
  if (advanceMatch) return { command: 'advance', match: advanceMatch };
  return null;
}

export type DictationMode = 'clear' | 'append' | 'prepend';

export interface UseFieldDictationOptions {
  /** Pre-fill fields with existing content (e.g. from a draft note) */
  initialValues?: DictationResult;
}

export interface UseFieldDictationReturn {
  fieldValues: Record<DictationField, string>;
  setFieldValue: (field: DictationField, value: string) => void;
  /** Index of the currently active/focused field */
  currentFieldIndex: number;
  /** Whether the STT engine is currently listening */
  isListening: boolean;
  /** Live partial transcript for the active field */
  liveTranscript: string;
  /** Detected trigger words per field (for visual indicator). Null if none detected. */
  detectedTriggerWords: Record<DictationField, string | null>;
  /** Dismiss a trigger word indicator for a field. */
  dismissTriggerWord: (field: DictationField) => void;
  /** True when user said "save draft" — consume and reset via `clearSaveDraftRequested` */
  saveDraftRequested: boolean;
  clearSaveDraftRequested: () => void;
  /** How new dictation merges with existing content */
  dictationMode: DictationMode;
  setDictationMode: (mode: DictationMode) => void;
  /** Whether initial content was provided (shows mode selector) */
  hasInitialContent: boolean;
  duration: number;
  /** Current mic audio level (0-1) from native STT. */
  audioLevel: number;
  isSTTReady: boolean;
  error: string | null;
  /** Start/stop global recording toggle */
  toggleRecording: () => void;
  /** Navigate to next field (saves current partial result) */
  nextField: () => void;
  /** Navigate to previous field (saves current partial result) */
  prevField: () => void;
  /** Navigate to specific field index */
  goToField: (index: number) => void;
  getResult: () => DictationResult;
  reset: () => void;
}

const emptyFields = (): Record<DictationField, string> => ({
  procedureName: '',
  diagnosis: '',
  notes: '',
  plan: '',
});

const fieldsFromInitial = (initial?: DictationResult): Record<DictationField, string> => ({
  procedureName: initial?.procedureName ?? '',
  diagnosis: initial?.diagnosis ?? '',
  notes: initial?.notes ?? '',
  plan: initial?.plan ?? '',
});

export function useFieldDictation(options?: UseFieldDictationOptions): UseFieldDictationReturn {
  const hasInitialContent = !!(
    options?.initialValues &&
    Object.values(options.initialValues).some(v => v && v.trim().length > 0)
  );
  const initialFields = hasInitialContent ? fieldsFromInitial(options?.initialValues) : emptyFields();

  const [fieldValues, setFieldValues] = useState<Record<DictationField, string>>(initialFields);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [detectedTriggerWords, setDetectedTriggerWords] = useState<Record<DictationField, string | null>>({
    procedureName: null, diagnosis: null, notes: null, plan: null,
  });
  const [saveDraftRequested, setSaveDraftRequested] = useState(false);
  const [dictationMode, setDictationMode] = useState<DictationMode>(hasInitialContent ? 'append' : 'clear');

  const currentFieldIndexRef = useRef(currentFieldIndex);
  currentFieldIndexRef.current = currentFieldIndex;
  const dictationModeRef = useRef(dictationMode);
  dictationModeRef.current = dictationMode;
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggerDetectedRef = useRef(false);

  // Track the last partial result so we can commit it when listening stops
  const lastPartialRef = useRef('');
  // Track the longest/best partial result seen — iOS SFSpeechRecognizer can revise
  // partials (e.g. "Testing procedure" → "Next"), so we keep the longest one
  const bestPartialRef = useRef('');
  // Track whether we already committed text for the current session (prevent doubles)
  const committedRef = useRef(false);

  // ── Helpers (no deps on stt) ──────────────────────────────────────────

  /** Save clean text to a specific field. Respects dictationMode. */
  const saveTextToField = useCallback((field: DictationField, text: string) => {
    if (!text) {
      console.log(`[FieldDictation] saveTextToField SKIP empty text for ${field}`);
      return;
    }
    console.log(`[FieldDictation] saveTextToField: field=${field}, text="${text}", mode=${dictationModeRef.current}`);
    committedRef.current = true;
    setFieldValues(prev => {
      const existing = prev[field];
      const result = !existing
        ? text
        : dictationModeRef.current === 'prepend'
          ? `${text} ${existing}`
          : `${existing} ${text}`;
      console.log(`[FieldDictation] setFieldValues updater: existing="${existing}", result="${result}"`);
      return { ...prev, [field]: result };
    });
  }, []);

  /** Commit text to the current field, stripping any trigger words.
   *  Used by handleSessionEnded (silence) and toggleRecording (manual stop). */
  const commitTextToField = useCallback((text: string) => {
    console.log(`[FieldDictation] commitTextToField: committed=${committedRef.current}, text="${text}"`);
    if (committedRef.current) {
      console.log(`[FieldDictation] commitTextToField SKIP (already committed)`);
      return;
    }

    const field = DICTATION_FIELDS[currentFieldIndexRef.current]?.key;
    if (!field) return;

    let cleanText = text.trim();
    const cmd = detectCommand(cleanText);
    if (cmd && cmd.match.index != null) {
      const triggerWord = cmd.match[0].replace(/[.,!?\s]+$/, '');
      cleanText = cleanText.slice(0, cmd.match.index).trim();
      setDetectedTriggerWords(prev => ({ ...prev, [field]: triggerWord }));
    }

    if (cleanText.length > 0) {
      saveTextToField(field, cleanText);
    } else {
      console.log(`[FieldDictation] commitTextToField: empty cleanText, marking committed`);
      committedRef.current = true;
    }
  }, [saveTextToField]);

  // ── STT engine ────────────────────────────────────────────────────────

  const handleSessionEnded = useCallback((reason: SessionEndReason, finalText: string) => {
    console.log(`[FieldDictation] handleSessionEnded: reason=${reason}, triggerDetected=${triggerDetectedRef.current}, fieldIdx=${currentFieldIndexRef.current}, finalText="${finalText}", lastPartial="${lastPartialRef.current}"`);
    if (triggerDetectedRef.current) {
      console.log(`[FieldDictation] handleSessionEnded SKIP (trigger detected)`);
      return;
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // Use the longest text available — native final, last partial, or best partial
    const candidates = [finalText.trim(), lastPartialRef.current.trim(), bestPartialRef.current.trim()];
    const textToSave = candidates.reduce((a, b) => b.length > a.length ? b : a, '');
    commitTextToField(textToSave);
    setDuration(0);
  }, [commitTextToField]);

  const stt = useSpeechToTextEngine({ onSessionEnded: handleSessionEnded });

  // Keep lastPartialRef and bestPartialRef in sync.
  // iOS SFSpeechRecognizer can revise partials (e.g. "Testing procedure" → "Next"),
  // so bestPartialRef tracks the longest non-trigger partial we've seen.
  useEffect(() => {
    if (stt.partialResult) {
      lastPartialRef.current = stt.partialResult;
      // Track the longest partial that isn't just a trigger word
      if (stt.partialResult.length > bestPartialRef.current.length) {
        bestPartialRef.current = stt.partialResult;
      }
    }
  }, [stt.partialResult]);

  // ── Timer helpers (depend on stt) ─────────────────────────────────────

  const stopAndClearTimer = useCallback(async () => {
    await stt.stopListening();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setDuration(0);
  }, [stt]);

  const startAndTimer = useCallback(async () => {
    await stt.startListening();
    setDuration(0);
    const startTime = Date.now();
    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, [stt]);

  // ── Trigger word detection ────────────────────────────────────────────

  useEffect(() => {
    if (!stt.isListening || !stt.partialResult) return;
    if (triggerDetectedRef.current) return;

    const detected = detectCommand(stt.partialResult);
    if (!detected) return;

    triggerDetectedRef.current = true;
    const field = DICTATION_FIELDS[currentFieldIndexRef.current]?.key;
    if (!field) return;

    const { command, match } = detected;
    const triggerWord = match[0].replace(/[.,!?\s]+$/, '');

    // iOS SFSpeechRecognizer can revise partials — e.g. "Testing procedure note"
    // gets replaced with just "Next". The bestPartialRef captured the longer text
    // BEFORE the revision. Use it as the clean text if it's longer and doesn't
    // itself end with a trigger word (meaning the recognizer replaced, not appended).
    let cleanText: string;
    if (bestPartialRef.current.length > stt.partialResult.length) {
      const bestCmd = detectCommand(bestPartialRef.current);
      cleanText = bestCmd
        ? bestPartialRef.current.slice(0, bestCmd.match.index).trim()
        : bestPartialRef.current.trim(); // no trigger in best → use it as-is
    } else {
      cleanText = stt.partialResult.slice(0, match.index).trim();
    }

    console.log(`[FieldDictation] TRIGGER: command=${command}, field=${field}, triggerWord="${triggerWord}", cleanText="${cleanText}", matchIndex=${match.index}, partialResult="${stt.partialResult}", bestPartial="${bestPartialRef.current}"`);

    setDetectedTriggerWords(prev => ({ ...prev, [field]: triggerWord }));

    if (command === 'advance') {
      // Save text SYNCHRONOUSLY before any async operations
      console.log(`[FieldDictation] advance: saving "${cleanText}" to ${field}`);
      saveTextToField(field, cleanText);

      void stopAndClearTimer().then(async () => {
        console.log(`[FieldDictation] advance: stopAndClearTimer resolved, advancing from field ${currentFieldIndexRef.current}`);
        const nextIdx = currentFieldIndexRef.current + 1;
        if (nextIdx < DICTATION_FIELDS.length) {
          setCurrentFieldIndex(nextIdx);
          currentFieldIndexRef.current = nextIdx;
          // Keep triggerDetectedRef=true until new session starts to block stale onSessionEnded
          committedRef.current = false;
          lastPartialRef.current = '';
          bestPartialRef.current = '';
          try {
            await startAndTimer();
            console.log(`[FieldDictation] advance: new session started for field ${nextIdx}`);
          } catch { /* user can manually toggle */ }
          // Only NOW reset trigger flag — after new session is active
          triggerDetectedRef.current = false;
        }
      });
    } else if (command === 'stop') {
      saveTextToField(field, cleanText);
      void stopAndClearTimer().then(() => {
        triggerDetectedRef.current = false;
        committedRef.current = false;
        lastPartialRef.current = '';
        bestPartialRef.current = '';
      });
    } else if (command === 'redo') {
      setFieldValues(prev => ({ ...prev, [field]: '' }));
      committedRef.current = true;
      void stopAndClearTimer().then(async () => {
        committedRef.current = false;
        lastPartialRef.current = '';
        bestPartialRef.current = '';
        try { await startAndTimer(); } catch { /* user can manually toggle */ }
        triggerDetectedRef.current = false;
      });
    } else if (command === 'save_draft') {
      saveTextToField(field, cleanText);
      void stopAndClearTimer().then(() => {
        triggerDetectedRef.current = false;
        committedRef.current = false;
        lastPartialRef.current = '';
        bestPartialRef.current = '';
        setSaveDraftRequested(true);
      });
    }
  }, [stt.partialResult, stt.isListening, saveTextToField, stopAndClearTimer, startAndTimer]);

  // ── Public API ────────────────────────────────────────────────────────

  const setFieldValue = useCallback((field: DictationField, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleRecording = useCallback(async () => {
    if (stt.isListening) {
      const finalText = await stt.stopListening();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      const candidates = [finalText.trim(), lastPartialRef.current.trim(), bestPartialRef.current.trim()];
      const textToSave = candidates.reduce((a, b) => b.length > a.length ? b : a, '');
      commitTextToField(textToSave);
      setDuration(0);
    } else {
      setError(null);
      triggerDetectedRef.current = false;
      committedRef.current = false;
      lastPartialRef.current = '';
      bestPartialRef.current = '';
      try {
        await startAndTimer();
      } catch (err: any) {
        setError(err?.message ?? 'Failed to start speech recognition');
      }
    }
  }, [stt, commitTextToField, startAndTimer]);

  const navigateToField = useCallback(async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= DICTATION_FIELDS.length) return;
    if (targetIndex === currentFieldIndexRef.current) return;

    const wasListening = stt.isListening;

    if (wasListening) {
      const finalText = await stt.stopListening();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      const candidates = [finalText.trim(), lastPartialRef.current.trim(), bestPartialRef.current.trim()];
      const textToSave = candidates.reduce((a, b) => b.length > a.length ? b : a, '');
      commitTextToField(textToSave);
    }

    setCurrentFieldIndex(targetIndex);
    currentFieldIndexRef.current = targetIndex;
    triggerDetectedRef.current = false;
    committedRef.current = false;
    lastPartialRef.current = '';
    bestPartialRef.current = '';

    if (wasListening) {
      try {
        await stt.startListening();
        setDuration(0);
        const startTime = Date.now();
        durationTimerRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
      } catch {
        // Failed to restart — recording stops
      }
    }
  }, [stt, commitTextToField]);

  const nextField = useCallback(() => {
    navigateToField(currentFieldIndexRef.current + 1);
  }, [navigateToField]);

  const prevField = useCallback(() => {
    navigateToField(currentFieldIndexRef.current - 1);
  }, [navigateToField]);

  const goToField = useCallback((index: number) => {
    navigateToField(index);
  }, [navigateToField]);

  const getResult = useCallback((): DictationResult => {
    const result: DictationResult = {};
    if (fieldValues.procedureName.trim()) result.procedureName = fieldValues.procedureName.trim();
    if (fieldValues.diagnosis.trim()) result.diagnosis = fieldValues.diagnosis.trim();
    if (fieldValues.notes.trim()) result.notes = fieldValues.notes.trim();
    if (fieldValues.plan.trim()) result.plan = fieldValues.plan.trim();
    return result;
  }, [fieldValues]);

  const dismissTriggerWord = useCallback((field: DictationField) => {
    setDetectedTriggerWords(prev => ({ ...prev, [field]: null }));
  }, []);

  const clearSaveDraftRequested = useCallback(() => {
    setSaveDraftRequested(false);
  }, []);

  const handleSetDictationMode = useCallback((mode: DictationMode) => {
    setDictationMode(mode);
    if (mode === 'clear') {
      setFieldValues(emptyFields());
    } else {
      setFieldValues(fieldsFromInitial(options?.initialValues));
    }
  }, [options?.initialValues]);

  const reset = useCallback(() => {
    stt.cancelListening();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setFieldValues(emptyFields());
    setCurrentFieldIndex(0);
    currentFieldIndexRef.current = 0;
    setError(null);
    setDuration(0);
    setDetectedTriggerWords({ procedureName: null, diagnosis: null, notes: null, plan: null });
    triggerDetectedRef.current = false;
  }, [stt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  return {
    fieldValues,
    setFieldValue,
    currentFieldIndex,
    isListening: stt.isListening,
    liveTranscript: stt.partialResult,
    detectedTriggerWords,
    dismissTriggerWord,
    saveDraftRequested,
    clearSaveDraftRequested,
    dictationMode,
    setDictationMode: handleSetDictationMode,
    hasInitialContent,
    duration,
    audioLevel: stt.audioLevel,
    isSTTReady: stt.isReady,
    error: error ?? stt.error,
    toggleRecording,
    nextField,
    prevField,
    goToField,
    getResult,
    reset,
  };
}
