// LLM-based proofreading hook for dictated text.
// Takes the LLM generate function + readiness as parameters to avoid
// instantiating a second LLM model. Only runs when LLM is available.

import { useState, useCallback, useRef } from 'react';
import {
  getStructuredOutputPrompt,
  fixAndValidateStructuredOutput,
} from 'react-native-executorch';
import type { Message } from 'react-native-executorch';
import { isVoiceLLMModelDownloaded } from '../../../../hooks/useVoiceDictationModels';
import { PROOFREADING_SCHEMA, PROOFREADING_SYSTEM_PROMPT } from './constants';
import type { DictationField } from './useFieldDictation';

export interface ProofreadingSuggestion {
  id: string;
  field: DictationField;
  original: string;
  corrected: string;
  reason: string;
}

export type ProofreadingStatus = 'idle' | 'checking' | 'done' | 'error';

export interface UseProofreadingSuggestionsReturn {
  suggestions: Record<DictationField, ProofreadingSuggestion[]>;
  statusByField: Record<DictationField, ProofreadingStatus>;
  proofreadField: (field: DictationField, text: string) => void;
  /** Accept a single suggestion. Returns the new text with the replacement applied. */
  acceptSuggestion: (id: string, currentText: string) => string;
  dismissSuggestion: (id: string) => void;
  /** Accept all suggestions for a field. Returns the new text. */
  acceptAllForField: (field: DictationField, currentText: string) => string;
  dismissAllForField: (field: DictationField) => void;
  /** Invalidate suggestions for a field (e.g., user edited text manually). */
  invalidateField: (field: DictationField) => void;
  /** Whether LLM proofreading is available. */
  isAvailable: boolean;
}

const FIELD_KEYS: DictationField[] = ['procedureName', 'diagnosis', 'notes', 'plan'];

const emptyRecord = <T,>(val: T): Record<DictationField, T> => ({
  procedureName: val,
  diagnosis: val,
  notes: val,
  plan: val,
});

export function useProofreadingSuggestions(
  llmGenerate: ((messages: Message[]) => Promise<string>) | undefined,
  llmIsReady: boolean,
): UseProofreadingSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Record<DictationField, ProofreadingSuggestion[]>>(
    () => emptyRecord<ProofreadingSuggestion[]>([]),
  );
  const [statusByField, setStatusByField] = useState<Record<DictationField, ProofreadingStatus>>(
    () => emptyRecord<ProofreadingStatus>('idle'),
  );

  // Track text sent per field to detect stale results
  const sentTextRef = useRef<Record<DictationField, string>>(emptyRecord(''));

  const isAvailable = llmIsReady && isVoiceLLMModelDownloaded();

  const proofreadField = useCallback(
    (field: DictationField, text: string) => {
      if (!isAvailable || !llmGenerate || !text.trim()) return;

      sentTextRef.current = { ...sentTextRef.current, [field]: text };
      setStatusByField(prev => ({ ...prev, [field]: 'checking' }));

      const structuredPrompt = getStructuredOutputPrompt(PROOFREADING_SCHEMA);
      const fullPrompt = [
        PROOFREADING_SYSTEM_PROMPT,
        '',
        `Field: ${field}`,
        'Text to proofread:',
        text,
        '',
        structuredPrompt,
      ].join('\n');

      llmGenerate([{ role: 'user', content: fullPrompt }])
        .then((rawOutput) => {
          // Discard if text changed during inference
          if (sentTextRef.current[field] !== text) return;

          const parsed = fixAndValidateStructuredOutput(
            rawOutput,
            PROOFREADING_SCHEMA,
          ) as { suggestions?: Array<{ original: string; corrected: string; reason: string }> };

          const fieldSuggestions: ProofreadingSuggestion[] = (parsed.suggestions ?? [])
            .filter(s => s.original && s.corrected && s.original !== s.corrected)
            .map((s, i) => ({
              id: `${field}-${Date.now()}-${i}`,
              field,
              original: s.original,
              corrected: s.corrected,
              reason: s.reason ?? '',
            }));

          setSuggestions(prev => ({ ...prev, [field]: fieldSuggestions }));
          setStatusByField(prev => ({ ...prev, [field]: 'done' }));
        })
        .catch(() => {
          if (sentTextRef.current[field] === text) {
            setStatusByField(prev => ({ ...prev, [field]: 'error' }));
          }
        });
    },
    [isAvailable, llmGenerate],
  );

  const acceptSuggestion = useCallback(
    (id: string, currentText: string): string => {
      let newText = currentText;
      setSuggestions(prev => {
        const next = { ...prev };
        for (const field of FIELD_KEYS) {
          const idx = next[field].findIndex(s => s.id === id);
          if (idx !== -1) {
            const suggestion = next[field][idx];
            newText = currentText.replace(suggestion.original, suggestion.corrected);
            next[field] = next[field].filter(s => s.id !== id);
            break;
          }
        }
        return next;
      });
      return newText;
    },
    [],
  );

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => {
      const next = { ...prev };
      for (const field of FIELD_KEYS) {
        const idx = next[field].findIndex(s => s.id === id);
        if (idx !== -1) {
          next[field] = next[field].filter(s => s.id !== id);
          break;
        }
      }
      return next;
    });
  }, []);

  const acceptAllForField = useCallback(
    (field: DictationField, currentText: string): string => {
      let text = currentText;
      const fieldSuggestions = suggestions[field];
      for (const s of fieldSuggestions) {
        text = text.replace(s.original, s.corrected);
      }
      setSuggestions(prev => ({ ...prev, [field]: [] }));
      return text;
    },
    [suggestions],
  );

  const dismissAllForField = useCallback((field: DictationField) => {
    setSuggestions(prev => ({ ...prev, [field]: [] }));
  }, []);

  const invalidateField = useCallback((field: DictationField) => {
    sentTextRef.current = { ...sentTextRef.current, [field]: '' };
    setSuggestions(prev => ({ ...prev, [field]: [] }));
    setStatusByField(prev => ({ ...prev, [field]: 'idle' }));
  }, []);

  return {
    suggestions,
    statusByField,
    proofreadField,
    acceptSuggestion,
    dismissSuggestion,
    acceptAllForField,
    dismissAllForField,
    invalidateField,
    isAvailable,
  };
}
