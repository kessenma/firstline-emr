// apps/mobile/src/components/patient-chart/messaging/hooks/useTelegramMessageLoading.ts
// PowerSync-based hook for loading telegram messages — offline-first
// Media files are downloaded via proxy API, converted to base64, and cached in SQLite

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePowerSync, usePowerSyncQuery, useSyncConnection } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db';
import {
  getCachedMedia,
  downloadAndCacheMedia,
  preloadMediaCache,
} from '../../../../services/TelegramMediaCacheService';
import type {
  TelegramMessage,
  TelegramThreadInfo,
} from '../utils/telegramTypes';

interface UseTelegramMessageLoadingParams {
  telegramChatId: string;
  enabled?: boolean;
  currentUserName?: string;
}

interface UseTelegramMessageLoadingReturn {
  messages: TelegramMessage[];
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  loadMessages: (forceRefresh?: boolean) => Promise<TelegramMessage[]>;
  threadInfo: TelegramThreadInfo | null;
  getSignedUrl: (filePath: string) => Promise<string | null>;
  isOffline: boolean;
}

export function useTelegramMessageLoading({
  telegramChatId,
  enabled = true,
  currentUserName = '',
}: UseTelegramMessageLoadingParams): UseTelegramMessageLoadingReturn {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const messagesRef = useRef<TelegramMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [threadInfo, setThreadInfo] = useState<TelegramThreadInfo | null>(null);
  const isDownloadingMedia = useRef(false);

  // Keep ref in sync so PowerSync refresh can read current translation state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── PowerSync service + offline detection ──
  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();
  const isOffline = !isConnected;

  // ── PowerSync query: telegram thread metadata (explicit columns, no messages JSON) ──
  const threadQuery = usePowerSyncQuery<any>(
    `SELECT id, chat_id, patient_id, participants, unread_count, status,
            created_at, updated_at
     FROM ${TABLES.TELEGRAM_THREADS}
     WHERE chat_id = ? AND status = 'active'
     LIMIT 1`,
    [telegramChatId || ''],
    {
      enabled: enabled && !!telegramChatId,
      refetchInterval: 5000,
    },
  );

  // ── PowerSync query: normalized telegram messages for this thread ──
  const threadId = threadQuery.data?.[0]?.id || '';
  const telegramMsgQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.TELEGRAM_MESSAGES}
     WHERE thread_id = ?
     ORDER BY timestamp ASC`,
    [threadId],
    {
      enabled: enabled && !!threadId,
      refetchInterval: 5000,
    },
  );

  // ── PowerSync query: thread participants (users) ──
  const participantsQuery = usePowerSyncQuery<any>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.image
     FROM ${TABLES.USERS} u
     INNER JOIN ${TABLES.TELEGRAM_THREAD_PARTICIPANTS} ttp ON u.id = ttp.user_id
     INNER JOIN ${TABLES.TELEGRAM_THREADS} tt ON ttp.thread_id = tt.id
     WHERE tt.chat_id = ?`,
    [telegramChatId || ''],
    { enabled: enabled && !!telegramChatId },
  );

  // ── Get cached media URI (memory → SQLite → null) ──
  const getSignedUrl = useCallback(
    async (filePath: string): Promise<string | null> => {
      if (!filePath) return null;
      return getCachedMedia(filePath, service);
    },
    [service],
  );

  // ── Download media for messages that don't have cached URIs ──
  const downloadMediaForMessages = useCallback(
    async (msgs: TelegramMessage[]) => {
      if (isOffline || isDownloadingMedia.current) return;

      const mediaMsgs = msgs.filter(
        m =>
          (m.type === 'image' || m.type === 'audio') &&
          m.mediaUrl &&
          !m.signedUrl,
      );

      if (mediaMsgs.length === 0) return;

      isDownloadingMedia.current = true;
      try {
        const updates: { id: string; dataUri: string }[] = [];

        // Download each media file (de-duplication is handled by the service)
        for (const msg of mediaMsgs) {
          const dataUri = await downloadAndCacheMedia(msg.mediaUrl!, service);
          if (dataUri) {
            updates.push({ id: msg._id, dataUri });
          }
        }

        if (updates.length > 0) {
          setMessages(prev =>
            prev.map(m => {
              const update = updates.find(u => u.id === m._id);
              return update ? { ...m, signedUrl: update.dataUri } : m;
            }),
          );
        }
      } finally {
        isDownloadingMedia.current = false;
      }
    },
    [isOffline, service],
  );

  // ── Parse messages from normalized telegram_messages table when data updates ──
  useEffect(() => {
    const rows = telegramMsgQuery.data;
    if (!rows || rows.length === 0) return;

    // Collect media URLs for batch preload from SQLite
    const mediaUrls = rows
      .filter((m: any) => (m.type === 'image' || m.type === 'audio') && m.media_url)
      .map((m: any) => m.media_url as string);

    // Pre-warm memory cache from SQLite (async, but fast)
    preloadMediaCache(mediaUrls, service).then(() => {
      // Build a lookup of existing translation/media state so PowerSync refreshes
      // don't wipe out translations that were set in React state
      const existingById = new Map<string, TelegramMessage>();
      messagesRef.current.forEach(m => existingById.set(m._id, m));

      const formatted: TelegramMessage[] = rows.map((m: any) => {
        const id = m.id || '';
        const existing = existingById.get(id);

        return {
          _id: id,
          telegramChatId: m.telegram_chat_id || telegramChatId,
          text: m.text || '',
          originalMessage: m.original_message,
          sender: m.sender || 'Unknown',
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          isSelf:
            (!!currentUserName && m.sender === currentUserName) ||
            /\n-- .+$/.test(m.text || ''),
          type: m.type || 'text',
          mediaUrl: m.media_url,
          encryptedMedia: m.encrypted_media,
          encryptionKey: m.encryption_key,
          signedUrl: existing?.signedUrl ?? undefined,
          format: m.format,
          // Preserve translation state: prefer existing React state, then PowerSync data
          translatedText: existing?.translatedText || m.translated_text,
          isTranslated: existing?.isTranslated || !!m.translated_text,
          showTranslated: existing?.showTranslated || false,
        };
      });

      setMessages(formatted);

      // Resolve cached URIs async and update state
      Promise.all(
        formatted
          .filter(m => (m.type === 'image' || m.type === 'audio') && m.mediaUrl)
          .map(async m => {
            const cached = await getCachedMedia(m.mediaUrl!, service);
            return cached ? { id: m._id, dataUri: cached } : null;
          }),
      ).then(results => {
        const cachedUpdates = results.filter(Boolean) as { id: string; dataUri: string }[];
        if (cachedUpdates.length > 0) {
          setMessages(prev =>
            prev.map(msg => {
              const update = cachedUpdates.find(u => u.id === msg._id);
              return update ? { ...msg, signedUrl: update.dataUri } : msg;
            }),
          );
        }

        // Download any media that wasn't in the cache (when online)
        const uncachedMsgs = formatted.filter(
          m =>
            (m.type === 'image' || m.type === 'audio') &&
            m.mediaUrl &&
            !cachedUpdates.find(u => u.id === m._id),
        );
        if (uncachedMsgs.length > 0) {
          downloadMediaForMessages(uncachedMsgs);
        }
      });
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramMsgQuery.data, currentUserName, telegramChatId]);

  // ── Build thread info from participants query ──
  useEffect(() => {
    const row = threadQuery.data?.[0];
    if (!row) return;

    const participants = (participantsQuery.data || []).map((p: any) => ({
      _id: p.id,
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      email: p.email || '',
      image: p.image,
    }));

    setThreadInfo({
      patientId: row.patient_id,
      participants,
      unreadCount: row.unread_count || 0,
      status: row.status,
    });
  }, [threadQuery.data, participantsQuery.data]);

  // ── Loading / error state ──
  const isLoading = (threadQuery.isLoading || telegramMsgQuery.isLoading) && messages.length === 0;

  useEffect(() => {
    if (threadQuery.error && messages.length === 0) {
      setError(threadQuery.error.message);
    }
  }, [threadQuery.error, messages.length]);

  // ── loadMessages (triggers PowerSync refetch) ──
  const loadMessages = useCallback(
    async (_forceRefresh?: boolean): Promise<TelegramMessage[]> => {
      await threadQuery.refetch();
      await telegramMsgQuery.refetch();
      return messages;
    },
    [threadQuery.refetch, telegramMsgQuery.refetch, messages],
  );

  return {
    messages,
    setMessages,
    isLoading,
    error,
    setError,
    loadMessages,
    threadInfo,
    getSignedUrl,
    isOffline,
  };
}

export default useTelegramMessageLoading;
