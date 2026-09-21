// Wraps ExecuTorch's useLLM for structured procedure note extraction (Mode B).
// Takes a transcript and extracts procedureName, diagnosis, notes, plan fields.

import { useCallback } from 'react';
import {
  useLLM,
  getStructuredOutputPrompt,
  fixAndValidateStructuredOutput,
} from 'react-native-executorch';
import { LLM_MODEL, PROCEDURE_NOTE_SCHEMA, EXTRACTION_SYSTEM_PROMPT } from './constants';
import type { DictationResult } from './useVoiceDictation';

export interface UseProcedureExtractionReturn {
  /** Whether the LLM model is loaded and ready */
  isReady: boolean;
  /** Whether extraction is currently in progress */
  isExtracting: boolean;
  /** Model download progress (0-1) */
  downloadProgress: number;
  /** Current partial response text (streams as LLM generates) */
  response: string;
  /** Error from model loading */
  error: string | null;
  /** Extract structured fields from a transcript */
  extractFields: (transcript: string) => Promise<DictationResult>;
}

export function useProcedureExtraction(): UseProcedureExtractionReturn {
  const llm = useLLM({
    model: LLM_MODEL,
    // Only load when Smart mode is used — caller gates this
    preventLoad: false,
  });

  const extractFields = useCallback(
    async (transcript: string): Promise<DictationResult> => {
      const structuredPrompt = getStructuredOutputPrompt(PROCEDURE_NOTE_SCHEMA);
      const fullPrompt = [
        EXTRACTION_SYSTEM_PROMPT,
        '',
        'Transcript:',
        transcript,
        '',
        structuredPrompt,
      ].join('\n');

      const rawOutput = await llm.generate([
        { role: 'user', content: fullPrompt },
      ]);

      try {
        const parsed = fixAndValidateStructuredOutput(
          rawOutput,
          PROCEDURE_NOTE_SCHEMA,
        ) as Record<string, string>;
        return {
          procedureName: parsed.procedureName ?? undefined,
          diagnosis: parsed.diagnosis ?? undefined,
          notes: parsed.notes ?? undefined,
          plan: parsed.plan ?? undefined,
        };
      } catch {
        // Extraction failed — return raw transcript as notes fallback
        return { notes: transcript };
      }
    },
    [llm],
  );

  return {
    isReady: llm.isReady,
    isExtracting: llm.isGenerating,
    downloadProgress: llm.downloadProgress,
    response: llm.response,
    error: llm.error?.message ?? null,
    extractFields,
  };
}
