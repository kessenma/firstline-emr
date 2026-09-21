// apps/mobile/src/screens/messages/threads/useThreadDetailViewModel.ts
// PowerSync-based thread detail view model — offline-first
// Reads messages from local SQLite, sends via API (syncs back via PowerSync)
// When offline, queues messages locally and sends when back online

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePowerSyncQuery, useSyncConnection } from '../../../hooks/powersync';
import { usePowerSync } from '../../../hooks/powersync';
import { TABLES } from '../../../db';
import { getApiUrl } from '../../../config';
import { Message, ThreadInfo, Thread, Participant } from '../../../types/messages';
import { useMediaManager } from '../../../hooks/useMediaManager';
import { TokenStorage } from '../../../services/TokenStorage';
import { buildPatientCardPayload, serializePatientCard } from '@fajr/shared/patient-share';

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

export interface ThreadDetailViewModel {
  // Data
  messages: Message[];
  threadInfo: ThreadInfo | undefined;
  newMessage: string;

  // State
  loading: boolean;
  error: string | null;
  sending: boolean;
  isOffline: boolean;
  queuedCount: number;

  // Actions
  loadMessages: () => Promise<void>;
  retry: () => void;
  setNewMessage: (text: string) => void;
  sendMessage: () => Promise<void>;
  sendPatientCard: (patient: any) => Promise<void>;
  sendAudio: (uri: string, duration: number) => Promise<void>;
  addParticipants: (userIds: string[]) => Promise<void>;
  leaveThread: () => Promise<void>;

  // Helpers
  getParticipant: (message: Message) => Participant | undefined;
  getDisplayName: (message: Message) => string;
  getInitials: (name: string) => string;
  formatTime: (timestamp: Date) => string;
  getThreadTitle: () => string;
  canSendMessage: boolean;
  isSystemGroup: boolean;
}

interface UseThreadDetailViewModelProps {
  thread: Thread;
  currentUserId: string;
}

export function useThreadDetailViewModel({
  thread,
  currentUserId,
}: UseThreadDetailViewModelProps): ThreadDetailViewModel {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const isSendingRef = useRef(false);
  const isDrainingRef = useRef(false);

  // ── Offline detection ──
  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();
  const isOffline = !isConnected;

  // ── Determine table names based on thread type ──
  const isInternal = thread.type === 'internal';
  const threadTable = isInternal
    ? TABLES.INTERNAL_MESSAGE_THREADS
    : TABLES.TELEGRAM_THREADS;

  // ── PowerSync query: thread metadata (explicit columns, no messages JSON) ──
  const threadQuery = usePowerSyncQuery<any>(
    isInternal
      ? `SELECT id, title, participants, unread_count, status, last_activity,
                created_by, is_group_chat, created_at, updated_at
         FROM ${threadTable} WHERE id = ? LIMIT 1`
      : `SELECT id, chat_id, patient_id, participants, unread_count, status,
                created_at, updated_at
         FROM ${threadTable} WHERE id = ? LIMIT 1`,
    [thread.id || ''],
    { enabled: !!thread.id, refetchInterval: 5000 },
  );

  // ── Parse participant IDs from the thread's participants column ──
  // (Avoids INNER JOIN with junction table which may not be synced)
  const participantIds = useMemo(() => {
    const row = threadQuery.data?.[0];
    if (!row?.participants) return [];
    return parseJson<string[]>(row.participants, []);
  }, [threadQuery.data]);

  // ── Fetch participant details from users table using parsed IDs ──
  const [participantsData, setParticipantsData] = useState<any[]>([]);
  useEffect(() => {
    if (participantIds.length === 0 || !service) return;
    const placeholders = participantIds.map(() => '?').join(',');
    service.query<any>(
      `SELECT id, first_name, last_name, email, account_type, image, google_image
       FROM ${TABLES.USERS}
       WHERE id IN (${placeholders})`,
      participantIds,
    ).then(setParticipantsData).catch(() => {});
  }, [participantIds, service]);

  // ── PowerSync query: normalized messages for internal threads ──
  const messagesQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.INTERNAL_MESSAGES}
     WHERE thread_id = ?
     ORDER BY timestamp ASC`,
    [thread.id || ''],
    { enabled: !!thread.id && isInternal, refetchInterval: 5000 },
  );

  // ── PowerSync query: normalized messages for telegram threads ──
  const telegramMessagesQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.TELEGRAM_MESSAGES}
     WHERE thread_id = ?
     ORDER BY timestamp ASC`,
    [thread.id || ''],
    { enabled: !!thread.id && !isInternal, refetchInterval: 5000 },
  );

  // ── PowerSync query: queued messages for this thread ──
  const queueQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.OFFLINE_QUEUE}
     WHERE table_name = 'internal_message_threads'
       AND record_id = ?
       AND operation = 'send_message'
     ORDER BY created_at ASC`,
    [thread.id || ''],
    { enabled: !!thread.id, refetchInterval: 3000 },
  );

  const queuedCount = queueQuery.data?.length || 0;

  // ── Parse messages: normalized table for internal, JSON for telegram ──
  useEffect(() => {
    // For internal threads, read from the normalized internal_messages table
    if (isInternal) {
      const rows = messagesQuery.data;
      if (!rows || rows.length === 0) {
        // Fall back to cached messages from the thread object (passed by parent)
        if (thread.messages?.length > 0 && messages.length === 0) {
          setMessages(
            thread.messages.map((m: Message) => ({
              ...m,
              isSelf: String(m.senderId) === String(currentUserId),
              timestamp:
                typeof m.timestamp === 'string'
                  ? new Date(m.timestamp)
                  : m.timestamp,
            })),
          );
        }
        return;
      }

      setMessages(prev => {
        const signedUrlMap = new Map(
          prev.filter(m => m.signedUrl).map(m => [m.id, m.signedUrl]),
        );
        const queuedMessages = prev.filter(m => m.queued);

        const syncedMessages = rows.map(
          (m: any): Message => ({
            id: m.id || '',
            text: m.text || '',
            sender: m.sender || '',
            senderId: m.sender_id || '',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            type: m.type || 'text',
            mediaUrl: m.media_url,
            signedUrl: signedUrlMap.get(m.id) || undefined,
            isSelf: String(m.sender_id) === String(currentUserId),
            fileName: m.file_name,
          }),
        );

        const syncedIds = new Set(syncedMessages.map(m => m.id));
        const stillQueued = queuedMessages.filter(m => !syncedIds.has(m.id));

        return [...syncedMessages, ...stillQueued];
      });
      return;
    }

    // For telegram threads, read from normalized telegram_messages table
    const rows = telegramMessagesQuery.data;
    if (!rows || rows.length === 0) {
      if (thread.messages?.length > 0 && messages.length === 0) {
        setMessages(
          thread.messages.map((m: Message) => ({
            ...m,
            isSelf: String(m.senderId) === String(currentUserId),
            timestamp:
              typeof m.timestamp === 'string'
                ? new Date(m.timestamp)
                : m.timestamp,
          })),
        );
      }
      return;
    }

    setMessages(prev => {
      const signedUrlMap = new Map(
        prev.filter(m => m.signedUrl).map(m => [m.id, m.signedUrl]),
      );
      const queuedMessages = prev.filter(m => m.queued);

      const syncedMessages = rows.map(
        (m: any): Message => ({
          id: m.id || '',
          text: m.text || '',
          sender: m.sender || '',
          senderId: m.sender_id || '',
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          type: m.type || 'text',
          mediaUrl: m.media_url,
          signedUrl: signedUrlMap.get(m.id) || undefined,
          isSelf: String(m.sender_id) === String(currentUserId),
          fileName: m.file_name,
        }),
      );

      const syncedIds = new Set(syncedMessages.map(m => m.id));
      const stillQueued = queuedMessages.filter(m => !syncedIds.has(m.id));

      return [...syncedMessages, ...stillQueued];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternal, messagesQuery.data, telegramMessagesQuery.data, currentUserId]);

  // ── Fetch signed URLs for media messages ──
  useMediaManager(messages, setMessages);

  // ── Build thread info from participants data ──
  const threadInfo = useMemo((): ThreadInfo | undefined => {
    const row = threadQuery.data?.[0];
    const participants: Participant[] = (participantsData || []).map(
      (p: any): Participant => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        accountType: p.account_type,
        image: p.image || p.google_image,
      }),
    );

    if (isInternal) {
      return {
        title: row?.title || thread.title || 'Group Messages',
        participants,
        id: row?.id || thread.id,
      };
    }

    return {
      title: thread.participants?.join(', ') || 'Patient Messages',
      participants,
    };
  }, [
    threadQuery.data,
    participantsData,
    thread.title,
    thread.id,
    thread.participants,
    isInternal,
  ]);

  // ── Loading & error state ──
  const msgLoading = isInternal ? messagesQuery.isLoading : telegramMessagesQuery.isLoading;
  const loading =
    (threadQuery.isLoading || msgLoading) &&
    messages.length === 0;
  const error =
    sendError ||
    (threadQuery.error && messages.length === 0
      ? threadQuery.error.message
      : null);

  // ── loadMessages / retry (triggers PowerSync refetch) ──
  const loadMessages = useCallback(async () => {
    await threadQuery.refetch();
    if (isInternal) await messagesQuery.refetch();
    else await telegramMessagesQuery.refetch();
  }, [threadQuery.refetch, isInternal, messagesQuery.refetch, telegramMessagesQuery.refetch]);

  const retry = useCallback(() => {
    setSendError(null);
    threadQuery.refetch();
    if (isInternal) messagesQuery.refetch();
    else telegramMessagesQuery.refetch();
  }, [threadQuery.refetch, isInternal, messagesQuery.refetch, telegramMessagesQuery.refetch]);

  // ── Queue a message locally when offline ──
  const queueMessageOffline = useCallback(
    async (messageText: string, threadId: string) => {
      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await service.execute(
        `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          queueId,
          'send_message',
          'internal_message_threads',
          threadId,
          JSON.stringify({ text: messageText, type: 'text' }),
          0,
          new Date().toISOString(),
        ],
      );

      return queueId;
    },
    [service],
  );

  // ── Send a single queued item via API ──
  const sendQueuedItem = useCallback(
    async (item: any): Promise<boolean> => {
      const token = TokenStorage.getAuthToken();
      if (!token) return false;

      try {
        const data = parseJson(item.data, { text: '', type: 'text' });
        const url = getApiUrl(
          `/internal-messages/${encodeURIComponent(item.record_id)}`,
        );
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!res.ok) return false;

        // Remove from queue on success
        await service.execute(
          `DELETE FROM ${TABLES.OFFLINE_QUEUE} WHERE id = ?`,
          [item.id],
        );
        return true;
      } catch {
        // Update retry count
        await service.execute(
          `UPDATE ${TABLES.OFFLINE_QUEUE} SET retry_count = retry_count + 1, attempted_at = ? WHERE id = ?`,
          [new Date().toISOString(), item.id],
        ).catch(() => {});
        return false;
      }
    },
    [service],
  );

  // ── Drain the queue when coming back online ──
  useEffect(() => {
    if (!isConnected || isDrainingRef.current) return;
    if (!queueQuery.data || queueQuery.data.length === 0) return;

    const drainQueue = async () => {
      isDrainingRef.current = true;
      try {
        for (const item of queueQuery.data!) {
          const success = await sendQueuedItem(item);
          if (!success) break; // Stop on first failure
        }
        // Refresh the queue query and thread data
        await queueQuery.refetch();
        await threadQuery.refetch();
      } finally {
        isDrainingRef.current = false;
      }
    };

    drainQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, queueQuery.data?.length]);

  // ── Remove optimistic queued messages once they appear in synced data ──
  useEffect(() => {
    if (queuedCount === 0 && messages.some(m => m.queued)) {
      setMessages(prev => prev.filter(m => !m.queued));
    }
  }, [queuedCount, messages]);

  // ── Send a new message (API if online, queue if offline) ──
  const sendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!messageText) return;
    if (isSendingRef.current) return;

    // Only internal messages can be sent from mobile
    if (thread.type !== 'internal') {
      setSendError('Sending messages to patients is not supported yet');
      return;
    }

    const threadId = thread.id || thread.slug || '';
    if (!threadId) {
      setSendError('Cannot send message: Thread ID is missing');
      return;
    }

    // Build optimistic message
    const userData = TokenStorage.getUser();
    const senderName = userData?.firstName
      ? `${userData.firstName} ${userData.lastName || ''}`.trim()
      : userData?.email || 'You';

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender: senderName,
      senderId: currentUserId,
      timestamp: new Date(),
      type: 'text',
      isSelf: true,
      queued: isOffline, // Mark as queued only when offline
    };

    // Optimistically add to UI
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    // ── Offline path: queue locally ──
    if (isOffline) {
      try {
        await queueMessageOffline(messageText, threadId);
        await queueQuery.refetch();
      } catch {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageText);
        setSendError('Failed to queue message for offline sending.');
      }
      return;
    }

    // ── Online path: send via API ──
    const token = TokenStorage.getAuthToken();
    if (!token) {
      setSendError('No authentication token found. Please login again.');
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText);
      return;
    }

    isSendingRef.current = true;
    setSending(true);
    setSendError(null);

    try {
      const url = getApiUrl(
        `/internal-messages/${encodeURIComponent(threadId)}`,
      );
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: messageText, type: 'text' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await res.json();

      // Replace optimistic message with server response
      if (data.message) {
        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticMessage.id
              ? {
                  ...data.message,
                  isSelf: true,
                  timestamp: new Date(data.message.timestamp),
                }
              : m,
          ),
        );
      }

      // PowerSync will sync the updated thread (with the new message in JSON)
      // The refetchInterval will pick it up automatically
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message text

      setSendError(
        err instanceof Error
          ? err.message
          : 'Failed to send message. Please try again.',
      );
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  }, [newMessage, thread, currentUserId, isOffline, queueMessageOffline, queueQuery.refetch]);

  // ── Send a patient card message ──
  const sendPatientCard = useCallback(async (patient: any) => {
    if (isSendingRef.current) return;
    if (thread.type !== 'internal') return;

    const threadId = thread.id || thread.slug || '';
    if (!threadId) return;

    const payload = buildPatientCardPayload(patient);
    if (!payload) return;

    const cardPayload = serializePatientCard(payload);

    const userData = TokenStorage.getUser();
    const senderName = userData?.firstName
      ? `${userData.firstName} ${userData.lastName || ''}`.trim()
      : userData?.email || 'You';

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: cardPayload,
      sender: senderName,
      senderId: currentUserId,
      timestamp: new Date(),
      type: 'patient-card',
      isSelf: true,
      queued: isOffline,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    if (isOffline) {
      try {
        const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await service.execute(
          `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            queueId,
            'send_message',
            'internal_message_threads',
            threadId,
            JSON.stringify({ text: cardPayload, type: 'patient-card' }),
            0,
            new Date().toISOString(),
          ],
        );
        await queueQuery.refetch();
      } catch {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
      return;
    }

    const token = TokenStorage.getAuthToken();
    if (!token) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      return;
    }

    isSendingRef.current = true;
    setSending(true);

    try {
      const url = getApiUrl(
        `/internal-messages/${encodeURIComponent(threadId)}`,
      );
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: cardPayload, type: 'patient-card' }),
      });

      if (!res.ok) {
        throw new Error('Failed to send patient card');
      }

      const data = await res.json();
      if (data.message) {
        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticMessage.id
              ? {
                  ...data.message,
                  isSelf: true,
                  timestamp: new Date(data.message.timestamp),
                }
              : m,
          ),
        );
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  }, [thread, currentUserId, isOffline, service, queueQuery.refetch]);

  // ── Send an audio message (upload WAV, then send as audio type) ──
  const sendAudio = useCallback(async (uri: string, duration: number) => {
    if (isSendingRef.current) return;
    if (thread.type !== 'internal') return;

    const threadId = thread.id || thread.slug || '';
    if (!threadId) return;

    const token = TokenStorage.getAuthToken();
    if (!token) {
      setSendError('No authentication token found. Please login again.');
      return;
    }

    const userData = TokenStorage.getUser();
    const senderName = userData?.firstName
      ? `${userData.firstName} ${userData.lastName || ''}`.trim()
      : userData?.email || 'You';

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: '',
      sender: senderName,
      senderId: currentUserId,
      timestamp: new Date(),
      type: 'audio',
      isSelf: true,
      // Use the local file URI for immediate playback while uploading
      signedUrl: uri,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    isSendingRef.current = true;
    setSending(true);

    try {
      // 1. Upload the WAV file
      const uploadUrl = getApiUrl(
        `/internal-messages/${encodeURIComponent(threadId)}/upload-audio`,
      );

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/wav',
        name: 'audio.wav',
      } as any);
      formData.append('duration', String(duration));

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload audio');
      }

      const uploadData = await uploadRes.json();
      const filePath = uploadData.filePath;

      // 2. Send the message with the uploaded file path
      const sendUrl = getApiUrl(
        `/internal-messages/${encodeURIComponent(threadId)}`,
      );
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: '',
          type: 'audio',
          mediaUrl: filePath,
          duration,
        }),
      });

      if (!sendRes.ok) {
        throw new Error('Failed to send audio message');
      }

      const sendData = await sendRes.json();

      // Replace optimistic message with server response, keeping the
      // signedUrl from the upload so the player doesn't go blank.
      if (sendData.message) {
        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticMessage.id
              ? {
                  ...sendData.message,
                  isSelf: true,
                  timestamp: new Date(sendData.message.timestamp),
                  signedUrl: uploadData.signedUrl || uri,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setSendError(
        err instanceof Error
          ? err.message
          : 'Failed to send audio message. Please try again.',
      );
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  }, [thread, currentUserId]);

  // ── Add participants to the thread ──
  const addParticipants = useCallback(async (userIds: string[]) => {
    if (!thread.id || userIds.length === 0) return;

    const token = TokenStorage.getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const url = getApiUrl(
      `/internal-messages/${encodeURIComponent(thread.id)}/participants`,
    );
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        participantIds: userIds,
        historyOption: 'none',
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add participants');
    }

    // Refresh thread data to get updated participants
    await threadQuery.refetch();
  }, [thread.id, threadQuery.refetch]);

  // ── Leave thread ──
  const leaveThread = useCallback(async () => {
    if (!thread.id) return;

    const token = TokenStorage.getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const url = getApiUrl(
      `/internal-messages/${encodeURIComponent(thread.id)}/leave`,
    );
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to leave thread');
    }
  }, [thread.id]);

  // ── System group detection (can't leave these) ──
  const isSystemGroup = useMemo(() => {
    const title = threadInfo?.title || '';
    return (
      ['All Doctors', 'All Triage', 'All Triage and Doctors'].includes(title) ||
      title.startsWith('Specialty: ')
    );
  }, [threadInfo?.title]);

  // ── Can send check (allow sending when offline too — messages get queued) ──
  const canSendMessage =
    thread.type === 'internal' && newMessage.trim().length > 0 && !sending;

  // ── Helper: get participant info for a message sender ──
  const getParticipant = useCallback(
    (message: Message): Participant | undefined => {
      if (threadInfo?.participants) {
        return threadInfo.participants.find(
          p => String(p.id) === String(message.senderId),
        );
      }
      return undefined;
    },
    [threadInfo?.participants],
  );

  // ── Helper: display name from participant info ──
  const getDisplayName = useCallback(
    (message: Message): string => {
      const participant = getParticipant(message);
      if (participant) {
        return (
          `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
          participant.email ||
          'Unknown'
        );
      }
      return message.sender || 'Unknown';
    },
    [getParticipant],
  );

  // ── Helper: initials from name ──
  const getInitials = useCallback((name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  // ── Helper: format timestamp ──
  const formatTime = useCallback((timestamp: Date): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours =
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 7 * 24) {
      return messageDate.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }, []);

  // ── Helper: thread title ──
  const getThreadTitle = useCallback((): string => {
    if (isInternal) {
      return threadInfo?.title || thread.title || 'Group Messages';
    }
    return thread.participants?.join(', ') || 'Patient Messages';
  }, [isInternal, thread.title, thread.participants, threadInfo?.title]);

  return {
    messages,
    threadInfo,
    newMessage,
    loading,
    error,
    sending,
    isOffline,
    queuedCount,
    loadMessages,
    retry,
    setNewMessage,
    sendMessage,
    sendPatientCard,
    sendAudio,
    addParticipants,
    leaveThread,
    getParticipant,
    getDisplayName,
    getInitials,
    formatTime,
    getThreadTitle,
    canSendMessage,
    isSystemGroup,
  };
}
