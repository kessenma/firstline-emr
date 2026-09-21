// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramMediaHandling.ts
// Hook for handling media uploads (images, audio) for Telegram messages
// Supports offline queuing: stores local file URI in offline_queue for later upload

import { useState, useCallback } from 'react';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { usePowerSync, useSyncConnection } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db';
import { getCachedMedia } from '../../../../services/TelegramMediaCacheService';
import type { TelegramMessage } from '../utils/telegramTypes';

interface UseTelegramMediaHandlingParams {
  telegramChatId: string;
  currentUserName: string;
  onMediaSent?: (message: TelegramMessage) => void;
  onMediaQueued?: (message: TelegramMessage) => void;
}

interface UseTelegramMediaHandlingReturn {
  sendImage: (uri: string, caption?: string) => Promise<void>;
  sendAudio: (uri: string, duration: number) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  getSignedUrl: (filePath: string) => Promise<string | null>;
  isOffline: boolean;
}

export function useTelegramMediaHandling({
  telegramChatId,
  currentUserName,
  onMediaSent,
  onMediaQueued,
}: UseTelegramMediaHandlingParams): UseTelegramMediaHandlingReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();
  const isOffline = !isConnected;

  // ── Queue media upload for when back online ──
  const queueMediaOffline = useCallback(
    async (
      localUri: string,
      mediaType: 'image' | 'audio',
      caption?: string,
      duration?: number,
    ) => {
      const queueId = `queue-tg-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await service.execute(
        `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          queueId,
          `send_telegram_${mediaType}`,
          'telegram_threads',
          telegramChatId,
          JSON.stringify({ localUri, mediaType, caption, duration }),
          0,
          new Date().toISOString(),
        ],
      );

      return queueId;
    },
    [service, telegramChatId],
  );

  // Get cached media URI (memory → SQLite → null)
  const getSignedUrl = useCallback(
    async (filePath: string): Promise<string | null> => {
      if (!filePath) return null;
      return getCachedMedia(filePath, service);
    },
    [service],
  );

  // ── Send image ──
  const sendImage = useCallback(
    async (uri: string, caption?: string) => {
      if (!uri || !telegramChatId) return;

      // ── Offline path: queue for later upload ──
      if (isOffline) {
        try {
          await queueMediaOffline(uri, 'image', caption);

          const queuedMessage: TelegramMessage = {
            _id: `queued-img-${Date.now()}`,
            telegramChatId,
            text: caption || 'Image (queued for upload)',
            sender: currentUserName,
            timestamp: new Date(),
            isSelf: true,
            type: 'image',
            signedUrl: uri, // Use local URI as preview
          };

          onMediaQueued?.(queuedMessage);
        } catch {
          setUploadError('Failed to queue image for offline upload.');
        }
        return;
      }

      // ── Online path: upload and send ──
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      try {
        const token = await getStoredToken();
        if (!token) throw new Error('No authentication token found');

        // Step 1: Upload image to storage
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        } as any);
        formData.append('telegramChatId', telegramChatId);

        setUploadProgress(25);

        const encodedChatId = encodeURIComponent(telegramChatId);
        const uploadResponse = await fetch(
          getApiUrl(`/telegram-thread/${encodedChatId}/upload-photo`),
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        if (!uploadResponse.ok) throw new Error('Failed to upload image');

        const uploadData = await uploadResponse.json();
        setUploadProgress(50);

        // Step 2: Send image to Telegram
        const sendResponse = await fetch(
          getApiUrl(`/telegram-thread/${encodedChatId}/send-photo`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mediaUrl: uploadData.signedUrl,
              caption: caption || '',
            }),
          },
        );

        if (!sendResponse.ok) throw new Error('Failed to send image to Telegram');

        const sendData = await sendResponse.json();
        setUploadProgress(100);

        const imageMessage: TelegramMessage = {
          _id: sendData.message?._id || `img-${Date.now()}`,
          telegramChatId,
          text: caption || 'Image',
          sender: currentUserName,
          timestamp: new Date(),
          isSelf: true,
          type: 'image',
          mediaUrl: uploadData.filePath,
          signedUrl: uploadData.signedUrl,
        };

        onMediaSent?.(imageMessage);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send image';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [telegramChatId, currentUserName, isOffline, queueMediaOffline, onMediaSent, onMediaQueued],
  );

  // ── Send audio ──
  const sendAudio = useCallback(
    async (uri: string, duration: number) => {
      if (!uri || !telegramChatId) return;

      // ── Offline path: queue for later upload ──
      if (isOffline) {
        try {
          await queueMediaOffline(uri, 'audio', undefined, duration);

          const queuedMessage: TelegramMessage = {
            _id: `queued-audio-${Date.now()}`,
            telegramChatId,
            text: `Audio message (queued for upload)`,
            sender: currentUserName,
            timestamp: new Date(),
            isSelf: true,
            type: 'audio',
          };

          onMediaQueued?.(queuedMessage);
        } catch {
          setUploadError('Failed to queue audio for offline upload.');
        }
        return;
      }

      // ── Online path: upload and send ──
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      try {
        const token = await getStoredToken();
        if (!token) throw new Error('No authentication token found');

        // Step 1: Upload audio to storage
        const extension = uri.split('.').pop()?.toLowerCase() || 'wav';
        const mimeMap: Record<string, string> = {
          wav: 'audio/wav',
          m4a: 'audio/mp4',
          mp4: 'audio/mp4',
          ogg: 'audio/ogg',
        };

        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeMap[extension] || 'audio/wav',
          name: `audio_${Date.now()}.${extension}`,
        } as any);
        formData.append('telegramChatId', telegramChatId);
        formData.append('duration', String(duration));

        setUploadProgress(25);

        const encodedChatId = encodeURIComponent(telegramChatId);
        const uploadResponse = await fetch(
          getApiUrl(`/telegram-thread/${encodedChatId}/upload-audio`),
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        if (!uploadResponse.ok) throw new Error('Failed to upload audio');

        const uploadData = await uploadResponse.json();
        setUploadProgress(50);

        // Step 2: Send audio to Telegram
        const sendResponse = await fetch(
          getApiUrl(`/telegram-thread/${encodedChatId}/send-audio`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mediaUrl: uploadData.signedUrl,
              caption: `Audio message (${Math.round(duration)} seconds)`,
            }),
          },
        );

        if (!sendResponse.ok) throw new Error('Failed to send audio to Telegram');

        const sendData = await sendResponse.json();
        setUploadProgress(100);

        const audioMessage: TelegramMessage = {
          _id: sendData.message?._id || `audio-${Date.now()}`,
          telegramChatId,
          text: `Audio message (${Math.round(duration)} seconds)`,
          sender: currentUserName,
          timestamp: new Date(),
          isSelf: true,
          type: 'audio',
          mediaUrl: uploadData.filePath,
          signedUrl: uploadData.signedUrl,
          format: extension,
        };

        onMediaSent?.(audioMessage);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send audio';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [telegramChatId, currentUserName, isOffline, queueMediaOffline, onMediaSent, onMediaQueued],
  );

  return {
    sendImage,
    sendAudio,
    isUploading,
    uploadProgress,
    uploadError,
    getSignedUrl,
    isOffline,
  };
}

export default useTelegramMediaHandling;
