// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramTranslation.ts
// Hook for message translation — uses on-device CTranslate2 when model is downloaded,
// falls back to web API otherwise. Persists translations via offline queue when offline.

import { useState, useCallback } from 'react';
import { storageHelpers } from '../../../../utils/mmkv';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { CTranslate2 } from '../../../../native/CTranslate2/NativeCTranslate2';
import { TranslationModelService } from '../../../../services/TranslationModelService';
import { TABLES } from '../../../../db';
import type { TelegramMessage } from '../utils/telegramTypes';

interface UseTelegramTranslationParams {
  telegramChatId: string;
  messages: TelegramMessage[];
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>;
  service: { execute: (sql: string, params?: any[]) => Promise<void> };
  isConnected: boolean;
}

interface UseTelegramTranslationReturn {
  translateMessages: () => Promise<{ translatedCount: number }>;
  isTranslating: boolean;
  toggleTranslation: (messageId: string) => void;
  translationError: string | null;
  isOfflineTranslation: boolean;
}

const TRANSLATION_CACHE_PREFIX = 'translation_';

// Detect Arabic text
const isArabic = (text: string): boolean => {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
};

// Simple hash function for cache keys (React Native compatible)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Get cache key for translation
const getCacheKey = (text: string): string => {
  return `${TRANSLATION_CACHE_PREFIX}${simpleHash(text)}`;
};

export function useTelegramTranslation({
  telegramChatId,
  messages,
  setMessages,
  service,
  isConnected,
}: UseTelegramTranslationParams): UseTelegramTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const modelService = TranslationModelService.getInstance();
  const isOfflineTranslation = modelService.isModelReady('ar-en');

  // Toggle translation display for a single message
  const toggleTranslation = useCallback(
    (messageId: string) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId
            ? { ...msg, showTranslated: !msg.showTranslated }
            : msg
        )
      );
    },
    [setMessages]
  );

  // Translate a single text — CTranslate2 on-device if model ready, API fallback otherwise
  const translateText = async (
    text: string,
    token: string
  ): Promise<string | null> => {
    try {
      // Check local cache first (MMKV is synchronous)
      const cacheKey = getCacheKey(text);
      const cached = storageHelpers.getString(cacheKey);
      if (cached) {
        console.log('[Translation] Cache hit');
        return cached;
      }

      let translatedText: string | null = null;

      if (modelService.isModelReady('ar-en')) {
        // On-device translation via CTranslate2
        console.log('[Translation] Using on-device CTranslate2');

        const alreadyLoaded = await CTranslate2.isModelLoaded('ar-en');
        if (!alreadyLoaded) {
          const modelPath = modelService.getModelPath('ar-en');
          await CTranslate2.loadModel(modelPath, 'ar-en');
        }

        translatedText = await CTranslate2.translate(text, 'ar-en');
      } else {
        // Fallback to web translation API
        console.log('[Translation] Using online API (model not downloaded)');

        const response = await fetch(getApiUrl('/translate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text,
            targetLang: 'English',
          }),
        });

        if (!response.ok) {
          console.error('[Translation] API error:', response.status);
          return null;
        }

        const data = await response.json();
        translatedText = data.translatedText || data.translation;
      }

      if (translatedText) {
        // Cache the translation (MMKV is synchronous)
        storageHelpers.set(cacheKey, translatedText);
      }

      return translatedText;
    } catch (err) {
      console.error('[Translation] Error:', err);
      return null;
    }
  };

  // Translate all Arabic messages
  const translateMessages = useCallback(async (): Promise<{
    translatedCount: number;
  }> => {
    if (messages.length === 0) {
      return { translatedCount: 0 };
    }

    setIsTranslating(true);
    setTranslationError(null);

    let translatedCount = 0;

    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log(`[Translation] Starting translation for ${messages.length} messages`);

      // Find messages that need translation
      const messagesToTranslate = messages.filter(
        (msg) =>
          msg.type === 'text' &&
          !msg.translatedText &&
          isArabic(msg.text)
      );

      console.log(`[Translation] Found ${messagesToTranslate.length} messages to translate`);

      if (messagesToTranslate.length === 0) {
        // Just enable showing translations for already translated messages
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isTranslated
              ? { ...msg, showTranslated: true }
              : msg
          )
        );
        return { translatedCount: 0 };
      }

      // Translate each message
      const translations = await Promise.all(
        messagesToTranslate.map(async (msg) => {
          const translated = await translateText(msg.text, token);
          return {
            messageId: msg._id,
            translatedText: translated,
          };
        })
      );

      // Update messages with translations
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          const translation = translations.find((t) => t.messageId === msg._id);
          if (translation && translation.translatedText) {
            translatedCount++;
            return {
              ...msg,
              translatedText: translation.translatedText,
              isTranslated: true,
              showTranslated: true,
            };
          }
          return msg;
        })
      );

      // Save translations to database
      const translationsToSave = translations.filter((t) => t.translatedText);
      if (translationsToSave.length > 0) {
        const encodedChatId = encodeURIComponent(telegramChatId);
        const payload = JSON.stringify({ translations: translationsToSave });

        if (isConnected) {
          // Online: save directly via API
          try {
            await fetch(
              getApiUrl(`/telegram-thread/${encodedChatId}/update-translations`),
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: payload,
              }
            );
            console.log('[Translation] Saved translations to database');
          } catch (err) {
            console.warn('[Translation] Failed to save to database:', err);
          }
        } else {
          // Offline: queue for later
          try {
            const queueId = `queue-translate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await service.execute(
              `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                queueId,
                'update_telegram_translations',
                'telegram_threads',
                telegramChatId,
                payload,
                0,
                new Date().toISOString(),
              ],
            );
            console.log('[Translation] Queued translations for offline sync');
          } catch (err) {
            console.warn('[Translation] Failed to queue translations:', err);
          }
        }
      }

      console.log(`[Translation] Completed: ${translatedCount} messages translated`);
      return { translatedCount };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Translation failed';
      console.error('[Translation] Error:', errorMessage);
      setTranslationError(errorMessage);
      return { translatedCount: 0 };
    } finally {
      setIsTranslating(false);
    }
  }, [messages, telegramChatId, setMessages, service, isConnected]);

  return {
    translateMessages,
    isTranslating,
    toggleTranslation,
    translationError,
    isOfflineTranslation,
  };
}

export default useTelegramTranslation;
