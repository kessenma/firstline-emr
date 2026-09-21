// apps/mobile/src/hooks/useMessages.ts
// PowerSync-based messages hook — offline-first with real-time sync
// Reads from local SQLite (PowerSync), writes go through API then sync back

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db';
import { Thread, Message } from '../types/messages';
import { TokenStorage } from '../services/TokenStorage';
import { getApiUrl } from '../config';

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

interface UseMessagesReturn {
  threads: Thread[];
  groupThreads: Thread[];
  telegramThreads: Thread[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markThreadAsRead: (
    threadId: string,
    type: 'internal' | 'telegram',
  ) => Promise<void>;
}

export function useMessages(): UseMessagesReturn {
  const userId = TokenStorage.getUser()?.id || '';
  const seededRef = useRef(false);

  // ── Seed: call API once to ensure default groups + junction table are populated ──
  // This is needed because PowerSync sync rules depend on the junction table.
  // Once seeded, data flows through PowerSync for offline access.
  useEffect(() => {
    if (!userId || seededRef.current) return;
    seededRef.current = true;

    const token = TokenStorage.getAuthToken();
    if (!token) return;

    fetch(getApiUrl('/internal-messages'), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {
      // Non-critical — if offline, PowerSync will serve cached data
      seededRef.current = false;
    });
  }, [userId]);

  // ── PowerSync query: internal threads with latest message preview ──
  // JOINs junction table for per-user unread count and leftAt filtering.
  // LEFT JOINs normalized internal_messages to get last message for preview/sorting.
  const internalQuery = usePowerSyncQuery<any>(
    `SELECT
       imt.id, imt.title, imt.participants,
       COALESCE(imtp.unread_count, 0) AS unread_count,
       imt.status, imt.last_activity, imt.created_by, imt.is_group_chat,
       imt.created_at, imt.updated_at,
       lm.text AS last_message_text,
       lm.sender AS last_message_sender,
       lm.sender_id AS last_message_sender_id,
       lm.timestamp AS last_message_timestamp,
       lm.type AS last_message_type
     FROM ${TABLES.INTERNAL_MESSAGE_THREADS} imt
     INNER JOIN ${TABLES.INTERNAL_MESSAGE_THREAD_PARTICIPANTS} imtp
       ON imtp.thread_id = imt.id
       AND imtp.user_id = ?
       AND imtp.left_at IS NULL
     LEFT JOIN ${TABLES.INTERNAL_MESSAGES} lm ON lm.id = (
       SELECT im2.id FROM ${TABLES.INTERNAL_MESSAGES} im2
       WHERE im2.thread_id = imt.id
       ORDER BY im2.timestamp DESC
       LIMIT 1
     )
     WHERE imt.status = 'active'
     ORDER BY imt.last_activity DESC`,
    [userId],
    { enabled: !!userId, refetchInterval: 10000 },
  );

  // ── PowerSync query: telegram threads with latest message preview ──
  // LEFT JOINs normalized telegram_messages to get last message for preview/sorting.
  const telegramQuery = usePowerSyncQuery<any>(
    `SELECT
       tt.id, tt.chat_id, tt.patient_id, tt.participants,
       tt.unread_count, tt.status, tt.created_at, tt.updated_at,
       lm.text AS last_message_text,
       lm.sender AS last_message_sender,
       lm.sender_id AS last_message_sender_id,
       lm.timestamp AS last_message_timestamp,
       lm.type AS last_message_type
     FROM ${TABLES.TELEGRAM_THREADS} tt
     LEFT JOIN ${TABLES.TELEGRAM_MESSAGES} lm ON lm.id = (
       SELECT tm2.id FROM ${TABLES.TELEGRAM_MESSAGES} tm2
       WHERE tm2.thread_id = tt.id
       ORDER BY tm2.timestamp DESC
       LIMIT 1
     )
     WHERE tt.status = 'active'
       AND tt.participants LIKE '%' || ? || '%'
     ORDER BY tt.updated_at DESC`,
    [userId],
    { enabled: !!userId, refetchInterval: 10000 },
  );

  // ── Map PowerSync rows → Thread objects ──
  // Uses last message from LEFT JOIN (normalized tables), not the legacy JSON blob
  const threads = useMemo(() => {
    const internalThreads: Thread[] = (internalQuery.data || []).map(
      (row: any): Thread => {
        const participants: string[] = parseJson(row.participants, []);
        // Build a single-element preview from the JOIN'd last message
        const messages: Message[] = row.last_message_text
          ? [{
              id: '',
              text: row.last_message_text,
              sender: row.last_message_sender || '',
              senderId: row.last_message_sender_id,
              timestamp: row.last_message_timestamp,
              type: row.last_message_type || 'text',
              isSelf: String(row.last_message_sender_id) === String(userId),
            }]
          : [];

        return {
          id: row.id,
          participants,
          unreadCount: row.unread_count || 0,
          messages,
          title: row.title || '',
          type: 'internal',
          isGroupChat: row.is_group_chat === 1 || row.is_group_chat === true,
          lastActivity: row.last_activity,
        };
      },
    );

    const tgThreads: Thread[] = (telegramQuery.data || []).map(
      (row: any): Thread => {
        const participants: string[] = parseJson(row.participants, []);
        const messages: Message[] = row.last_message_text
          ? [{
              id: '',
              text: row.last_message_text,
              sender: row.last_message_sender || '',
              senderId: row.last_message_sender_id,
              timestamp: row.last_message_timestamp,
              type: row.last_message_type || 'text',
              isSelf: false,
            }]
          : [];

        return {
          id: row.id,
          chatId: row.chat_id,
          participants,
          unreadCount: row.unread_count || 0,
          messages,
          type: 'telegram',
          lastActivity: row.updated_at,
        };
      },
    );

    const merged = [...internalThreads, ...tgThreads];

    // Sort by most recent activity
    merged.sort((a, b) => {
      const aTime =
        a.lastActivity ?? a.messages[0]?.timestamp ?? 0;
      const bTime =
        b.lastActivity ?? b.messages[0]?.timestamp ?? 0;
      return (
        new Date(bTime as any).getTime() - new Date(aTime as any).getTime()
      );
    });

    return merged;
  }, [internalQuery.data, telegramQuery.data, userId]);

  // ── Mark thread as read (write → API, syncs back via PowerSync) ──
  const markThreadAsRead = useCallback(
    async (threadId: string, type: 'internal' | 'telegram') => {
      try {
        const token = TokenStorage.getAuthToken();
        if (!token) return;

        const url =
          type === 'internal'
            ? getApiUrl(`/internal-messages/mark-read/${threadId}`)
            : getApiUrl(`/messages/mark-read/${threadId}`);

        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Error marking thread as read:', err);
      }
    },
    [],
  );

  // Filter threads by type — show all internal threads (groups + DMs) in Staff tab
  const groupThreads = threads.filter(t => t.type === 'internal');
  const telegramThreads = threads.filter(t => t.type === 'telegram');

  const loading = internalQuery.isLoading || telegramQuery.isLoading;
  const error =
    internalQuery.error?.message || telegramQuery.error?.message || null;

  const refresh = useCallback(async () => {
    await Promise.all([internalQuery.refetch(), telegramQuery.refetch()]);
  }, [internalQuery.refetch, telegramQuery.refetch]);

  return {
    threads,
    groupThreads,
    telegramThreads,
    loading,
    error,
    refresh,
    markThreadAsRead,
  };
}
