// Voice dictation model configuration and prompts.

import {
  LLAMA3_2_1B_SPINQUANT,
  KOKORO_SMALL,
  KOKORO_VOICE_AF_HEART,
} from 'react-native-executorch';

// STT: Now uses native platform APIs (SFSpeechRecognizer on iOS).
// No ExecuTorch model needed — zero download, always available.

// LLM model: Llama 3.2 1B SpinQuant (~500MB-1GB)
export const LLM_MODEL = LLAMA3_2_1B_SPINQUANT;

// TTS model: Kokoro Small (~50MB duration predictor + synthesizer + voice + phonemizer)
export const TTS_MODEL = KOKORO_SMALL;
export const TTS_VOICE = KOKORO_VOICE_AF_HEART;

// JSON schema for structured extraction of procedure note fields
export const PROCEDURE_NOTE_SCHEMA = {
  type: 'object',
  properties: {
    procedureName: { type: 'string', description: 'Name of the surgical procedure performed' },
    diagnosis: { type: 'string', description: 'Primary diagnosis or indication for the procedure' },
    notes: { type: 'string', description: 'Detailed procedure notes including technique, findings, and complications' },
    plan: { type: 'string', description: 'Post-operative plan including follow-up, medications, and activity restrictions' },
  },
  required: ['procedureName', 'diagnosis', 'notes', 'plan'],
};

// System prompt for LLM extraction
export const EXTRACTION_SYSTEM_PROMPT =
  'You are a medical scribe assistant. Extract structured information from a surgeon\'s dictated procedure notes. Be concise and use medical terminology appropriately. Only include information explicitly stated in the transcript.';

// Guided dictation phase prompts
export const GUIDED_PHASES = {
  phase1: {
    label: 'Describe the procedure',
    instruction: 'Describe the procedure, diagnosis, and any notes about the surgery.',
  },
  phase2: {
    label: 'Describe the plan',
    instruction: 'Now describe the post-operative plan, follow-up, and any orders.',
  },
} as const;

// MMKV storage keys for voice dictation model state
export const MMKV_KEYS = {
  LLM_STATUS: 'voice_dictation_llm_status',
  TTS_STATUS: 'voice_dictation_tts_status',
  VOICE_SENSITIVITY: 'voice_dictation_sensitivity',
} as const;

// Voice sensitivity types and constants — centralized in @fajr/shared/media
export {
  type VoiceSensitivity,
  SENSITIVITY_LABELS,
  SENSITIVITY_DESCRIPTIONS,
  SENSITIVITY_MULTIPLIERS,
} from '@fajr/shared/media';

// JSON schema for LLM proofreading of dictated text
export const PROOFREADING_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string', description: 'Exact text span that needs correction' },
          corrected: { type: 'string', description: 'Corrected version of the text' },
          reason: { type: 'string', description: 'Brief reason for the correction (1 sentence)' },
        },
        required: ['original', 'corrected', 'reason'],
      },
    },
  },
  required: ['suggestions'],
};

// System prompt for LLM proofreading
export const PROOFREADING_SYSTEM_PROMPT =
  'You are a helpful assistant for orthopedic surgeons on medical trips dictating procedure notes. ' +
  'Look for transcription errors, typos, and suggest edits for quality medical scribing. ' +
  'Only suggest changes for clear errors. If text looks clean, return empty suggestions array. ' +
  'Do not change medical terminology unless clearly wrong. Do not rewrite -- only fix errors.';
