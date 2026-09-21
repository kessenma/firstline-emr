// apps/mobile/src/screens/messages/useMessagesViewModel.ts
// View model for messages screen - handles business logic and state management

import { useState, useCallback } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { Thread } from '../../types/messages';

export interface MessagesViewModel {
  // Data
  groupThreads: Thread[];
  telegramThreads: Thread[];
  selectedThread: Thread | null;

  // State
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Actions
  handleThreadPress: (thread: Thread) => void;
  handleBackFromThread: () => void;
  onRefresh: () => Promise<void>;
  refresh: () => Promise<void>;

  // Helpers
  getThreadDisplayName: (thread: Thread) => string;
  getThreadLastMessage: (thread: Thread) => string;
  hasUnreadMessages: (thread: Thread) => boolean;
}

export function useMessagesViewModel(): MessagesViewModel {
  const { groupThreads, telegramThreads, loading, error, refresh } =
    useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  // Handle thread selection
  const handleThreadPress = useCallback((thread: Thread) => {
    setSelectedThread(thread);
  }, []);

  // Handle back navigation from thread detail
  const handleBackFromThread = useCallback(() => {
    setSelectedThread(null);
  }, []);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Get display name for a thread
  const getThreadDisplayName = useCallback((thread: Thread): string => {
    if (thread.type === 'internal') {
      return thread.title || 'Group Chat';
    }
    return thread.participants.join(', ') || 'Patient Chat';
  }, []);

  // Get last message text for a thread
  const getThreadLastMessage = useCallback((thread: Thread): string => {
    if (!thread.messages || thread.messages.length === 0) {
      return 'No messages yet...';
    }

    const lastMessage = thread.messages[0];

    // Handle different message types
    if (lastMessage.type === 'image') {
      return '📷 Photo';
    }
    if (lastMessage.type === 'audio') {
      return '🎤 Voice message';
    }

    return lastMessage.text || 'No messages yet...';
  }, []);

  // Check if thread has unread messages
  const hasUnreadMessages = useCallback((thread: Thread): boolean => {
    return (thread.unreadCount || 0) > 0;
  }, []);

  return {
    // Data
    groupThreads,
    telegramThreads,
    selectedThread,

    // State
    loading,
    refreshing,
    error,

    // Actions
    handleThreadPress,
    handleBackFromThread,
    onRefresh,
    refresh,

    // Helpers
    getThreadDisplayName,
    getThreadLastMessage,
    hasUnreadMessages,
  };
}
