// apps/mobile/src/utils/dataOnboarding.ts
// Shared helpers for data onboarding completion and deferred model downloads.

import { storage } from './mmkv';

export type QueuedTranslationDirection = 'ar-en' | 'en-ar';
export type QueuedVoiceModel = 'stt' | 'llm' | 'tts';

const ONBOARDING_COMPLETE_KEY = 'data_settings_onboarded';
const PENDING_MODEL_DOWNLOADS_KEY = 'pending_translation_model_downloads';
const PENDING_VOICE_MODEL_DOWNLOADS_KEY = 'pending_voice_model_downloads';

export function hasCompletedDataOnboarding(): boolean {
  return storage.getString(ONBOARDING_COMPLETE_KEY) === 'true';
}

export function markDataOnboardingComplete(): void {
  storage.set(ONBOARDING_COMPLETE_KEY, 'true');
}

export function getPendingTranslationModelDownloads(): QueuedTranslationDirection[] {
  const raw = storage.getString(PENDING_MODEL_DOWNLOADS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is QueuedTranslationDirection => v === 'ar-en' || v === 'en-ar',
    );
  } catch {
    return [];
  }
}

export function setPendingTranslationModelDownloads(
  directions: QueuedTranslationDirection[],
): void {
  const unique = Array.from(new Set(directions)).filter(
    (v): v is QueuedTranslationDirection => v === 'ar-en' || v === 'en-ar',
  );
  if (unique.length === 0) {
    storage.remove(PENDING_MODEL_DOWNLOADS_KEY);
    return;
  }
  storage.set(PENDING_MODEL_DOWNLOADS_KEY, JSON.stringify(unique));
}

export function getPendingVoiceModelDownloads(): QueuedVoiceModel[] {
  const raw = storage.getString(PENDING_VOICE_MODEL_DOWNLOADS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is QueuedVoiceModel => v === 'stt' || v === 'llm' || v === 'tts',
    );
  } catch {
    return [];
  }
}

export function setPendingVoiceModelDownloads(
  models: QueuedVoiceModel[],
): void {
  const unique = Array.from(new Set(models)).filter(
    (v): v is QueuedVoiceModel => v === 'stt' || v === 'llm' || v === 'tts',
  );
  if (unique.length === 0) {
    storage.remove(PENDING_VOICE_MODEL_DOWNLOADS_KEY);
    return;
  }
  storage.set(PENDING_VOICE_MODEL_DOWNLOADS_KEY, JSON.stringify(unique));
}
