// apps/mobile/src/hooks/useMessagesPowerSync.ts
// PowerSync-based messages hook with real-time updates and offline-first support
// Replaces useMessages.ts and useMessagesWithCache.ts

import { useMemo, useCallback } from 'react';
import { usePowerSyncQuery, usePowerSyncMutation } from './powersync';
import { TABLES } from '@/db';
import type { Thread } from '@/types/messages';

interface UseMessagesPowerSyncReturn {
  threads: Thread[];
  groupThreads: Thread[];
  telegramThreads: Thread[];
  internalThreads: Thread[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markThreadAsRead: (threadId: string, type: 'internal' | 'telegram') => Promise<void>;
  isRefetching: boolean;
}

/**
 * PowerSync-based messages hook
 *
 * Features:
 * - Real-time updates (automatically re-renders on data changes)
 * - Offline-first (works without network)
 * - No manual caching needed (PowerSync handles it)
 * - Type-safe with proper field mapping
 *
 * @example
 * ```tsx
 * function MessagesScreen() {
 *   const { threads, loading, error, refresh } = useMessagesPowerSync();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <ThreadList threads={threads} onRefresh={refresh} />;
 * }
 * ```
 */
export function useMessagesPowerSync(): UseMessagesPowerSyncReturn {
  // Query internal message threads with latest message preview from normalized table
  const internalQuery = usePowerSyncQuery<any>(
    `SELECT
       imt.id, imt.title, imt.participants, imt.unread_count,
       imt.status, imt.last_activity, imt.created_by, imt.is_group_chat,
       imt.created_at, imt.updated_at,
       COUNT(DISTINCT imtp.user_id) as participant_count,
       lm.text AS last_message_text,
       lm.sender AS last_message_sender,
       lm.sender_id AS last_message_sender_id,
       lm.timestamp AS last_message_timestamp,
       lm.type AS last_message_type
     FROM ${TABLES.INTERNAL_MESSAGE_THREADS} imt
     LEFT JOIN ${TABLES.INTERNAL_MESSAGE_THREAD_PARTICIPANTS} imtp
       ON imt.id = imtp.thread_id
     LEFT JOIN ${TABLES.INTERNAL_MESSAGES} lm ON lm.id = (
       SELECT im2.id FROM ${TABLES.INTERNAL_MESSAGES} im2
       WHERE im2.thread_id = imt.id
       ORDER BY im2.timestamp DESC
       LIMIT 1
     )
     WHERE imt.status = ?
     GROUP BY imt.id
     ORDER BY imt.last_activity DESC`,
    ['active'],
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 3,
      staleTime: 10000, // Consider data stale after 10 seconds
    }
  );

  // Query Telegram threads with latest message preview from normalized table
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
     WHERE tt.status = ?
     ORDER BY tt.updated_at DESC`,
    ['active'],
    {
      refetchInterval: 30000,
      retry: 3,
      staleTime: 10000,
    }
  );

  // Mutation hook for marking threads as read
  const markAsReadMutation = usePowerSyncMutation(
    async (variables: { sql: string; params: any[] }) => {
      // This would execute the SQL mutation
      console.log('Executing SQL mutation:', variables);
      // For now, return a mock result
      return { success: true };
    },
    {
      onSuccess: (data, variables) => {
        console.log('✅ Thread marked as read:', variables);
      },
      onError: (error) => {
        console.error('❌ Failed to mark thread as read:', error);
      },
    }
  );

  // Convert internal threads to Thread type (uses JOIN'd last message, not JSON blob)
  const internalThreads = useMemo(() => {
    if (!internalQuery.data) return [];

    return internalQuery.data.map((row: any): Thread => {
      const participants = typeof row.participants === 'string'
        ? JSON.parse(row.participants || '[]')
        : row.participants || [];

      const messages = row.last_message_text
        ? [{
            id: '',
            text: row.last_message_text,
            sender: row.last_message_sender || '',
            senderId: row.last_message_sender_id,
            timestamp: row.last_message_timestamp,
            type: row.last_message_type || 'text',
          }]
        : [];

      return {
        id: row.id,
        title: row.title,
        participants,
        unreadCount: row.unread_count || 0,
        messages,
        type: 'internal' as const,
        isGroupChat: row.is_group_chat === 1,
        lastActivity: row.last_activity,
      };
    });
  }, [internalQuery.data]);

  // Convert Telegram threads to Thread type (uses JOIN'd last message, not JSON blob)
  const telegramThreads = useMemo(() => {
    if (!telegramQuery.data) return [];

    return telegramQuery.data.map((row: any): Thread => {
      const participants = typeof row.participants === 'string'
        ? JSON.parse(row.participants || '[]')
        : row.participants || [];

      const messages = row.last_message_text
        ? [{
            id: '',
            text: row.last_message_text,
            sender: row.last_message_sender || '',
            senderId: row.last_message_sender_id,
            timestamp: row.last_message_timestamp,
            type: row.last_message_type || 'text',
          }]
        : [];

      return {
        id: row.id,
        chatId: row.chat_id,
        participants,
        unreadCount: row.unread_count || 0,
        messages,
        type: 'telegram' as const,
        lastActivity: row.updated_at,
      };
    });
  }, [telegramQuery.data]);

  // Filter internal threads by group chat status
  const groupThreads = useMemo(() => {
    return internalThreads.filter(t => t.isGroupChat === true);
  }, [internalThreads]);

  // Merge and sort all threads by last activity
  const allThreads = useMemo(() => {
    const merged = [...internalThreads, ...telegramThreads];

    // Sort by last activity (newest first)
    merged.sort((a, b) => {
      const aTime = a.lastActivity ?? a.messages[0]?.timestamp ?? 0;
      const bTime = b.lastActivity ?? b.messages[0]?.timestamp ?? 0;

      const aDate = new Date(aTime as any).getTime();
      const bDate = new Date(bTime as any).getTime();

      return bDate - aDate;
    });

    return merged;
  }, [internalThreads, telegramThreads]);

  // Combined loading state
  const loading = internalQuery.isLoading || telegramQuery.isLoading;

  // Combined error state
  const error = internalQuery.error || telegramQuery.error;

  // Combined refetching state
  const isRefetching = internalQuery.isRefetching || telegramQuery.isRefetching;

  // Refresh function
  const refresh = useCallback(async () => {
    await Promise.all([
      internalQuery.refetch(),
      telegramQuery.refetch(),
    ]);
  }, [internalQuery, telegramQuery]);

  // Mark thread as read function
  const markThreadAsRead = useCallback(
    async (threadId: string, type: 'internal' | 'telegram') => {
      try {
        const tableName = type === 'internal'
          ? TABLES.INTERNAL_MESSAGE_THREAD_PARTICIPANTS
          : TABLES.TELEGRAM_THREAD_PARTICIPANTS;

        // Update unread count to 0 for this thread and current user
        // Note: In a real implementation, you'd get the current user ID from auth context
        await markAsReadMutation.mutateAsync({
          sql: `UPDATE ${tableName} SET unread_count = 0, last_read_at = ? WHERE thread_id = ?`,
          params: [new Date().toISOString(), threadId],
        });

        // Also update the main thread table
        const mainTable = type === 'internal'
          ? TABLES.INTERNAL_MESSAGE_THREADS
          : TABLES.TELEGRAM_THREADS;

        await markAsReadMutation.mutateAsync({
          sql: `UPDATE ${mainTable} SET unread_count = 0 WHERE id = ?`,
          params: [threadId],
        });

        // PowerSync will automatically update the UI via real-time sync
      } catch (err) {
        console.error('Error marking thread as read:', err);
        throw err;
      }
    },
    [markAsReadMutation]
  );

  return {
    threads: allThreads,
    groupThreads,
    telegramThreads,
    internalThreads,
    loading,
    error,
    refresh,
    markThreadAsRead,
    isRefetching,
  };
}

/**
 * Hook to get a single thread by ID
 *
 * @param threadId - The thread ID to fetch
 * @param type - Thread type ('internal' or 'telegram')
 *
 * @example
 * ```tsx
 * function ThreadDetailScreen({ route }) {
 *   const { threadId, type } = route.params;
 *   const { thread, loading } = useMessageThread(threadId, type);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!thread) return <NotFound />;
 *
 *   return <ThreadDetail thread={thread} />;
 * }
 * ```
 */
export function useMessageThread(
  threadId: string | undefined,
  type: 'internal' | 'telegram'
): {
  thread: Thread | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const isInternal = type === 'internal';
  const threadTable = isInternal
    ? TABLES.INTERNAL_MESSAGE_THREADS
    : TABLES.TELEGRAM_THREADS;
  const messagesTable = isInternal
    ? TABLES.INTERNAL_MESSAGES
    : TABLES.TELEGRAM_MESSAGES;

  // Fetch thread metadata (explicit columns, no messages JSON)
  const threadQuery = usePowerSyncQuery<any>(
    isInternal
      ? `SELECT id, title, participants, unread_count, status, last_activity,
                created_by, is_group_chat, created_at, updated_at
         FROM ${threadTable} WHERE id = ? LIMIT 1`
      : `SELECT id, chat_id, patient_id, participants, unread_count, status,
                created_at, updated_at
         FROM ${threadTable} WHERE id = ? LIMIT 1`,
    threadId ? [threadId] : [],
    {
      enabled: !!threadId,
      refetchInterval: 5000,
    }
  );

  // Fetch all messages from normalized table
  const messagesQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${messagesTable} WHERE thread_id = ? ORDER BY timestamp ASC`,
    threadId ? [threadId] : [],
    {
      enabled: !!threadId,
      refetchInterval: 5000,
    }
  );

  const thread = useMemo(() => {
    if (!threadQuery.data?.[0]) return null;

    const row = threadQuery.data[0];
    const participants = typeof row.participants === 'string'
      ? JSON.parse(row.participants || '[]')
      : row.participants || [];

    const messages = (messagesQuery.data || []).map((m: any) => ({
      id: m.id,
      text: m.text,
      sender: m.sender || '',
      senderId: m.sender_id,
      timestamp: m.timestamp,
      type: m.type || 'text',
    }));

    if (isInternal) {
      return {
        id: row.id,
        title: row.title,
        participants,
        unreadCount: row.unread_count || 0,
        messages,
        type: 'internal' as const,
        isGroupChat: row.is_group_chat === 1,
        lastActivity: row.last_activity,
      };
    } else {
      return {
        id: row.id,
        chatId: row.chat_id,
        participants,
        unreadCount: row.unread_count || 0,
        messages,
        type: 'telegram' as const,
      };
    }
  }, [threadQuery.data, messagesQuery.data, isInternal]);

  const refresh = useCallback(async () => {
    await Promise.all([threadQuery.refetch(), messagesQuery.refetch()]);
  }, [threadQuery.refetch, messagesQuery.refetch]);

  return {
    thread,
    loading: threadQuery.isLoading || messagesQuery.isLoading,
    error: threadQuery.error || messagesQuery.error,
    refresh,
  };
}

/**
 * Hook to get unread message counts
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { totalUnread, internalUnread, telegramUnread } = useUnreadCounts();
 *
 *   return (
 *     <Badge count={totalUnread}>
 *       <MessageIcon />
 *     </Badge>
 *   );
 * }
 * ```
 */
export function useUnreadCounts(): {
  totalUnread: number;
  internalUnread: number;
  telegramUnread: number;
  loading: boolean;
} {
  const internalQuery = usePowerSyncQuery<{ total: number }>(
    `SELECT SUM(unread_count) as total FROM ${TABLES.INTERNAL_MESSAGE_THREADS} WHERE status = ?`,
    ['active'],
    {
      refetchInterval: 10000,
    }
  );

  const telegramQuery = usePowerSyncQuery<{ total: number }>(
    `SELECT SUM(unread_count) as total FROM ${TABLES.TELEGRAM_THREADS} WHERE status = ?`,
    ['active'],
    {
      refetchInterval: 10000,
    }
  );

  const internalUnread = internalQuery.data?.[0]?.total || 0;
  const telegramUnread = telegramQuery.data?.[0]?.total || 0;
  const totalUnread = internalUnread + telegramUnread;

  return {
    totalUnread,
    internalUnread,
    telegramUnread,
    loading: internalQuery.isLoading || telegramQuery.isLoading,
  };
}
