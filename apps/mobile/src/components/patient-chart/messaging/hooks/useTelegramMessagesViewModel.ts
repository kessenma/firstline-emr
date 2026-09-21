// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramMessagesViewModel.ts
// Main composed ViewModel for Telegram messaging — PowerSync offline-first
// Reads from local SQLite, sends via API (or queues when offline)

import { useEffect, useCallback, useState, useRef } from 'react';
import { usePowerSync, usePowerSyncQuery, useSyncConnection } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTelegramMessageLoading } from './useTelegramMessageLoading';
import { useTelegramMessageSending } from './useTelegramMessageSending';
import { useTelegramMediaHandling } from './useTelegramMediaHandling';
import { useTelegramRealtime } from './useTelegramRealtime';
import { useTelegramTranslation } from './useTelegramTranslation';
import { telegramMessageCache } from '../utils/telegramMessageCache';
import type {
  TelegramMessagesViewModel,
  UseTelegramMessagesViewModelParams,
} from '../utils/telegramTypes';

/** Safely parse a JSON text column from SQLite */
function parseJson<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Extended interface with offline state
export interface TelegramMessagesViewModelOffline extends TelegramMessagesViewModel {
  isOffline: boolean;
  queuedCount: number;
  isOfflineTranslation: boolean;
  sendTranslatedMessage: (translatedText: string, originalText: string) => Promise<void>;
  translateForSend: (text: string) => Promise<string>;
  isLanguageMismatch: boolean;
}

export function useTelegramMessagesViewModel({
  telegramChatId,
  patientId: _patientId,
  enabled = true,
  languageUsed,
}: UseTelegramMessagesViewModelParams): TelegramMessagesViewModelOffline {
  const [refreshing, setRefreshing] = useState(false);
  const isDrainingRef = useRef(false);
  const { user } = useAuth();
  const currentUserName = user
    ? `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim()
    : '';

  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();
  const isOffline = !isConnected;

  // ── Message loading (PowerSync-based) ──
  const {
    messages,
    setMessages,
    isLoading: isLoadingMessages,
    error: loadError,
    setError,
    loadMessages: loadMessagesInternal,
    threadInfo,
  } = useTelegramMessageLoading({
    telegramChatId,
    enabled,
    currentUserName,
  });

  // Wrapper to match the TelegramMessagesViewModel interface (returns void)
  const loadMessages = useCallback(
    async (forceRefresh?: boolean): Promise<void> => {
      await loadMessagesInternal(forceRefresh);
    },
    [loadMessagesInternal],
  );

  // ── Message sending (with offline queue) ──
  const {
    newMessage,
    setNewMessage,
    sendMessage: sendTextMessage,
    sendTranslatedMessage,
    translateForSend,
    isSending: isSendingText,
    sendError,
    isLanguageMismatch,
  } = useTelegramMessageSending({
    telegramChatId,
    currentUserName,
    languageUsed,
    onMessageSent: (message) => {
      // Add sent message to local state immediately
      setMessages(prev => [...prev, message]);
      // PowerSync will sync the updated thread data automatically
    },
    onMessageQueued: (message) => {
      // Add queued message to local state with visual indicator
      setMessages(prev => [...prev, { ...message, _id: `queued-${Date.now()}` }]);
    },
  });

  // ── Media handling (with offline queue) ──
  const {
    sendImage: sendImageMedia,
    sendAudio: sendAudioMedia,
    isUploading,
    uploadError,
  } = useTelegramMediaHandling({
    telegramChatId,
    currentUserName,
    onMediaSent: (message) => {
      setMessages(prev => [...prev, message]);
    },
    onMediaQueued: (message) => {
      setMessages(prev => [...prev, message]);
    },
  });

  // ── Translation ──
  const {
    translateMessages,
    isTranslating,
    toggleTranslation,
    translationError,
    isOfflineTranslation,
  } = useTelegramTranslation({
    telegramChatId,
    messages,
    setMessages,
    service,
    isConnected,
  });

  // ── Real-time (simplified — PowerSync handles sync) ──
  const { isConnected: realtimeConnected } = useTelegramRealtime({
    chatId: telegramChatId,
    enabled: enabled && !!telegramChatId,
    onUpdate: useCallback(() => {
      loadMessages(true);
    }, [loadMessages]),
  });

  // ── Queued messages count ──
  const queueQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.OFFLINE_QUEUE}
     WHERE table_name = 'telegram_threads'
       AND record_id = ?
       AND operation IN ('send_telegram_message', 'send_telegram_image', 'send_telegram_audio', 'update_telegram_translations')
     ORDER BY created_at ASC`,
    [telegramChatId || ''],
    { enabled: !!telegramChatId, refetchInterval: 3000 },
  );

  const queuedCount = queueQuery.data?.length || 0;

  // ── Drain queue when coming back online ──
  useEffect(() => {
    if (!isConnected || isDrainingRef.current) return;
    if (!queueQuery.data || queueQuery.data.length === 0) return;

    const drainQueue = async () => {
      isDrainingRef.current = true;
      try {
        const token = await getStoredToken();
        if (!token) return;

        for (const item of queueQuery.data!) {
          try {
            const data = parseJson<Record<string, any>>(item.data, {});

            if (item.operation === 'send_telegram_message') {
              const encodedChatId = encodeURIComponent(item.record_id);
              const res = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/send-text`),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    text: data.text || data.message,
                    ...(data.originalMessage && { originalMessage: data.originalMessage }),
                  }),
                },
              );

              if (!res.ok) break; // Stop on failure
            } else if (item.operation === 'send_telegram_image') {
              // For queued images, re-upload from local URI
              const formData = new FormData();
              formData.append('file', {
                uri: data.localUri,
                type: 'image/jpeg',
                name: `photo_${Date.now()}.jpg`,
              } as any);
              formData.append('telegramChatId', item.record_id);

              const encodedChatId = encodeURIComponent(item.record_id);
              const uploadRes = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/upload-photo`),
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                },
              );

              if (!uploadRes.ok) break;

              const uploadData = await uploadRes.json();

              const sendRes = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/send-photo`),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    mediaUrl: uploadData.signedUrl,
                    caption: data.caption || '',
                  }),
                },
              );

              if (!sendRes.ok) break;
            } else if (item.operation === 'send_telegram_audio') {
              const formData = new FormData();
              formData.append('file', {
                uri: data.localUri,
                type: 'audio/mp4',
                name: `audio_${Date.now()}.m4a`,
              } as any);
              formData.append('telegramChatId', item.record_id);
              formData.append('duration', String(data.duration || 0));

              const encodedChatId = encodeURIComponent(item.record_id);
              const uploadRes = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/upload-audio`),
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                },
              );

              if (!uploadRes.ok) break;

              const uploadData = await uploadRes.json();

              const sendRes = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/send-audio`),
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    mediaUrl: uploadData.signedUrl,
                    caption: data.caption || `Audio message`,
                  }),
                },
              );

              if (!sendRes.ok) break;
            } else if (item.operation === 'update_telegram_translations') {
              const encodedChatId = encodeURIComponent(item.record_id);
              const res = await fetch(
                getApiUrl(`/telegram-thread/${encodedChatId}/update-translations`),
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(data),
                },
              );

              if (!res.ok) break;
            }

            // Remove from queue on success
            await service.execute(
              `DELETE FROM ${TABLES.OFFLINE_QUEUE} WHERE id = ?`,
              [item.id],
            );
          } catch {
            // Update retry count and stop
            await service.execute(
              `UPDATE ${TABLES.OFFLINE_QUEUE} SET retry_count = retry_count + 1, attempted_at = ? WHERE id = ?`,
              [new Date().toISOString(), item.id],
            ).catch(() => {});
            break;
          }
        }

        // Refresh queries
        await queueQuery.refetch();
      } finally {
        isDrainingRef.current = false;
      }
    };

    drainQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, queueQuery.data?.length]);

  // Combined states
  const isSending = isSendingText || isUploading;
  const error = loadError || sendError || uploadError || translationError;

  // Wrappers
  const sendMessage = useCallback(async () => {
    await sendTextMessage();
  }, [sendTextMessage]);

  const sendImage = useCallback(
    async (uri: string) => {
      await sendImageMedia(uri);
    },
    [sendImageMedia],
  );

  const sendAudio = useCallback(
    async (uri: string, duration: number) => {
      await sendAudioMedia(uri, duration);
    },
    [sendAudioMedia],
  );

  const retry = useCallback(() => {
    setError(null);
    loadMessages(true);
  }, [loadMessages, setError]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    telegramMessageCache.invalidateMessages(telegramChatId);
    await loadMessages(true);
    setRefreshing(false);
  }, [telegramChatId, loadMessages]);

  return {
    // Messages
    messages,
    isLoadingMessages: isLoadingMessages || refreshing,
    loadMessages,

    // Sending
    newMessage,
    setNewMessage,
    sendMessage,
    sendTranslatedMessage,
    translateForSend,
    isLanguageMismatch,
    sendImage,
    sendAudio,
    isSending,

    // Error Handling
    error,
    retry,

    // Translation
    translateMessages,
    isTranslating,
    toggleTranslation,
    isOfflineTranslation,

    // Real-time
    isConnected: realtimeConnected,

    // Thread Info
    threadInfo,

    // Refresh
    refresh,

    // Offline state
    isOffline,
    queuedCount,
  };
}

export default useTelegramMessagesViewModel;
