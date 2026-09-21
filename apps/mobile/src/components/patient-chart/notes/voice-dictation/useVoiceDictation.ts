// Orchestrator hook for voice dictation flow (Smart mode only).
// Manages state machine: idle → recording → reviewing → extracting → done
//
// Smart mode: Single recording via native STT → review transcript → LLM extraction → structured fields
// Guided and Hands-Free modes use their own dedicated hooks.

import { useState, useCallback, useRef } from 'react';
import { useSpeechToTextEngine } from './useSpeechToTextEngine';
import { GUIDED_PHASES } from './constants';

export type DictationMode = 'guided' | 'smart';
export type DictationState =
  | 'idle'
  | 'recording'
  | 'reviewing'
  | 'extracting'
  | 'done';

export interface DictationResult {
  procedureName?: string;
  diagnosis?: string;
  notes?: string;
  plan?: string;
}

export interface UseVoiceDictationReturn {
  state: DictationState;
  mode: DictationMode;
  setMode: (mode: DictationMode) => void;
  /** Current guided phase (1 or 2) — only relevant in guided mode */
  currentPhase: 1 | 2;
  /** Phase label for UI display */
  phaseLabel: string;
  /** Transcript from the current or last recording */
  transcript: string;
  /** Editable transcript (user can modify before accepting) */
  editableTranscript: string;
  setEditableTranscript: (text: string) => void;
  /** Phase 1 transcript stored for guided mode */
  phase1Transcript: string;
  /** Recording duration in seconds */
  duration: number;
  /** Whether native STT is available */
  isSTTReady: boolean;
  /** Error message */
  error: string | null;
  /** Result fields after dictation is complete */
  result: DictationResult;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and begin transcription */
  stopRecording: () => void;
  /** Accept transcript and advance (guided: go to phase 2 or done; smart: go to extracting/done) */
  acceptTranscript: () => void;
  /** Fill the result with raw transcript (skip LLM extraction in smart mode) */
  useAsNotes: () => void;
  /** Set result from external LLM extraction */
  setExtractionResult: (fields: DictationResult) => void;
  /** Mark extraction as failed, fall back to raw transcript in notes */
  extractionFailed: () => void;
  /** Reset everything to idle */
  reset: () => void;
}

export function useVoiceDictation(): UseVoiceDictationReturn {
  const [state, setState] = useState<DictationState>('idle');
  const [mode, setMode] = useState<DictationMode>('guided');
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [phase1Transcript, setPhase1Transcript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DictationResult>({});
  const [duration, setDuration] = useState(0);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stt = useSpeechToTextEngine();

  const phaseLabel =
    state === 'recording' || state === 'idle'
      ? mode === 'guided'
        ? currentPhase === 1
          ? GUIDED_PHASES.phase1.label
          : GUIDED_PHASES.phase2.label
        : 'Describe the procedure'
      : '';

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    try {
      await stt.startListening();
      setState('recording');
      durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start recording');
      setState('idle');
    }
  }, [stt]);

  const stopRecording = useCallback(async () => {
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
    try {
      const text = await stt.stopListening();
      if (!text || text.trim().length === 0) {
        setError('No speech detected. Try again.');
        setState('idle');
        return;
      }
      setTranscript(text);
      setEditableTranscript(text);
      setState('reviewing');
    } catch (err: any) {
      setError(err?.message ?? 'Transcription failed');
      setState('idle');
    }
  }, [stt]);

  const acceptTranscript = useCallback(() => {
    const text = editableTranscript.trim();

    if (mode === 'guided') {
      if (currentPhase === 1) {
        // Store phase 1 transcript, advance to phase 2
        setPhase1Transcript(text);
        setCurrentPhase(2);
        setTranscript('');
        setEditableTranscript('');
        setState('idle');
      } else {
        // Phase 2 done — build result
        setResult({
          notes: phase1Transcript,
          plan: text,
        });
        setState('done');
      }
    } else {
      // Smart mode — go to extracting state (caller triggers LLM)
      setState('extracting');
    }
  }, [mode, currentPhase, editableTranscript, phase1Transcript]);

  const useAsNotes = useCallback(() => {
    // Put the full transcript into the notes field (skip LLM extraction)
    setResult({ notes: editableTranscript.trim() });
    setState('done');
  }, [editableTranscript]);

  const setExtractionResult = useCallback((fields: DictationResult) => {
    setResult(fields);
    setState('done');
  }, []);

  const extractionFailed = useCallback(() => {
    // Fall back to raw transcript in notes field
    setResult({ notes: editableTranscript.trim() });
    setState('done');
  }, [editableTranscript]);

  const reset = useCallback(() => {
    setState('idle');
    setCurrentPhase(1);
    setTranscript('');
    setEditableTranscript('');
    setPhase1Transcript('');
    setError(null);
    setResult({});
  }, []);

  return {
    state,
    mode,
    setMode,
    currentPhase,
    phaseLabel,
    transcript,
    editableTranscript,
    setEditableTranscript,
    phase1Transcript,
    duration,
    isSTTReady: stt.isReady,
    error: error ?? stt.error,
    result,
    startRecording,
    stopRecording,
    acceptTranscript,
    useAsNotes,
    setExtractionResult,
    extractionFailed,
    reset,
  };
}
