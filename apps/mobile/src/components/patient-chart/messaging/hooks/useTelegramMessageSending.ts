// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramMessageSending.ts
// Hook for sending text messages via Telegram API — with offline queue support
// and send-time translation (CTranslate2 en-ar on-device + API fallback)

import { useState, useCallback } from 'react';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { usePowerSync, useSyncConnection } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db';
import { CTranslate2 } from '../../../../native/CTranslate2/NativeCTranslate2';
import { TranslationModelService } from '../../../../services/TranslationModelService';
import type { TelegramMessage } from '../utils/telegramTypes';

// Detect if text contains Arabic characters
const isArabic = (text: string): boolean =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

interface UseTelegramMessageSendingParams {
  telegramChatId: string;
  currentUserName: string;
  languageUsed?: string;
  onMessageSent?: (message: TelegramMessage) => void;
  onMessageQueued?: (message: TelegramMessage) => void;
}

interface UseTelegramMessageSendingReturn {
  newMessage: string;
  setNewMessage: (text: string) => void;
  sendMessage: () => Promise<void>;
  sendTranslatedMessage: (translatedText: string, originalText: string) => Promise<void>;
  translateForSend: (text: string) => Promise<string>;
  isSending: boolean;
  sendError: string | null;
  isOffline: boolean;
  isLanguageMismatch: boolean;
}

export function useTelegramMessageSending({
  telegramChatId,
  currentUserName,
  languageUsed,
  onMessageSent,
  onMessageQueued,
}: UseTelegramMessageSendingParams): UseTelegramMessageSendingReturn {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();
  const isOffline = !isConnected;

  const modelService = TranslationModelService.getInstance();

  // Check if current message is English going to Arabic-speaking patient
  const isLanguageMismatch =
    languageUsed === 'Arabic' &&
    newMessage.trim().length > 0 &&
    !isArabic(newMessage);

  // ── Translate text for sending (en→ar) ──
  const translateForSend = useCallback(
    async (text: string): Promise<string> => {
      try {
        if (modelService.isModelReady('en-ar')) {
          // On-device translation via CTranslate2
          console.log('[SendTranslation] Using on-device CTranslate2 en-ar');
          const alreadyLoaded = await CTranslate2.isModelLoaded('en-ar');
          if (!alreadyLoaded) {
            const modelPath = modelService.getModelPath('en-ar');
            await CTranslate2.loadModel(modelPath, 'en-ar');
          }
          return await CTranslate2.translate(text, 'en-ar');
        }

        // Fallback to web translation API
        console.log('[SendTranslation] Using online API (en-ar model not downloaded)');
        const token = await getStoredToken();
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(getApiUrl('/translate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, targetLanguage: 'Arabic' }),
        });

        if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

        const data = await response.json();
        return data.translatedText || data.translation || text;
      } catch (err) {
        console.error('[SendTranslation] Error:', err);
        throw err;
      }
    },
    [modelService],
  );

  // ── Queue a message locally when offline ──
  const queueMessageOffline = useCallback(
    async (messageText: string, originalMessage?: string) => {
      const queueId = `queue-tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await service.execute(
        `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          queueId,
          'send_telegram_message',
          'telegram_threads',
          telegramChatId,
          JSON.stringify({
            text: messageText,
            ...(originalMessage ? { originalMessage } : {}),
          }),
          0,
          new Date().toISOString(),
        ],
      );

      return queueId;
    },
    [service, telegramChatId],
  );

  // ── Send a pre-translated message (text = Arabic, originalMessage = English) ──
  const sendTranslatedMessage = useCallback(
    async (translatedText: string, originalText: string) => {
      if (!translatedText.trim() || !telegramChatId) return;

      const optimisticMessage: TelegramMessage = {
        _id: `temp-${Date.now()}`,
        telegramChatId,
        text: translatedText,
        originalMessage: originalText,
        sender: currentUserName,
        timestamp: new Date(),
        isSelf: true,
        type: 'text',
      };

      setNewMessage('');
      setSendError(null);

      // Offline path
      if (isOffline) {
        try {
          await queueMessageOffline(translatedText, originalText);
          onMessageQueued?.(optimisticMessage);
        } catch {
          setNewMessage(originalText);
          setSendError('Failed to queue translated message.');
        }
        return;
      }

      // Online path
      setIsSending(true);
      try {
        const token = await getStoredToken();
        if (!token) throw new Error('No authentication token found');

        const encodedChatId = encodeURIComponent(telegramChatId);
        const response = await fetch(
          getApiUrl(`/telegram-thread/${encodedChatId}/send-text`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: translatedText,
              originalMessage: originalText,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Send failed: ${response.status}`);
        }

        const data = await response.json();

        const confirmedMessage: TelegramMessage = {
          _id: data.savedMessage?.id || optimisticMessage._id,
          telegramChatId,
          text: translatedText,
          originalMessage: originalText,
          sender: currentUserName,
          timestamp: data.savedMessage?.timestamp
            ? new Date(data.savedMessage.timestamp)
            : new Date(),
          isSelf: true,
          type: 'text',
        };

        onMessageSent?.(confirmedMessage);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send translated message';
        setSendError(errorMessage);
        setNewMessage(originalText);
      } finally {
        setIsSending(false);
      }
    },
    [telegramChatId, currentUserName, isOffline, queueMessageOffline, onMessageSent, onMessageQueued],
  );

  // ── Regular send (no translation) ──
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !telegramChatId) return;

    const messageToSend = newMessage.trim();

    const optimisticMessage: TelegramMessage = {
      _id: `temp-${Date.now()}`,
      telegramChatId,
      text: messageToSend,
      sender: currentUserName,
      timestamp: new Date(),
      isSelf: true,
      type: 'text',
    };

    setNewMessage('');
    setSendError(null);

    // Offline path
    if (isOffline) {
      try {
        await queueMessageOffline(messageToSend);
        onMessageQueued?.(optimisticMessage);
      } catch {
        setNewMessage(messageToSend);
        setSendError('Failed to queue message for offline sending.');
      }
      return;
    }

    // Online path
    setIsSending(true);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('No authentication token found');

      const encodedChatId = encodeURIComponent(telegramChatId);
      const response = await fetch(
        getApiUrl(`/telegram-thread/${encodedChatId}/send-text`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: messageToSend }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Send failed: ${response.status}`);
      }

      const data = await response.json();

      const confirmedMessage: TelegramMessage = {
        _id: data.savedMessage?.id || optimisticMessage._id,
        telegramChatId,
        text: messageToSend,
        sender: currentUserName,
        timestamp: data.savedMessage?.timestamp
          ? new Date(data.savedMessage.timestamp)
          : new Date(),
        isSelf: true,
        type: 'text',
      };

      onMessageSent?.(confirmedMessage);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      setSendError(errorMessage);
      setNewMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  }, [telegramChatId, newMessage, currentUserName, isOffline, queueMessageOffline, onMessageSent, onMessageQueued]);

  return {
    newMessage,
    setNewMessage,
    sendMessage,
    sendTranslatedMessage,
    translateForSend,
    isSending,
    sendError,
    isOffline,
    isLanguageMismatch,
  };
}

export default useTelegramMessageSending;
