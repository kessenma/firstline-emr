'use client';

import { useEffect, useRef } from 'react';
import { usePolling } from '@/hooks/usePolling';

interface MessagesPollingProps {
  chatId: string;
  enabled?: boolean;
  onMessagesUpdate?: (messages: any[]) => void;
}

export function MessagesPolling({ 
  chatId, 
  enabled = true,
  onMessagesUpdate 
}: MessagesPollingProps) {
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const fetchMessages = async () => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const response = await fetch(`/api/messages/${chatId}`, {
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const error: any = new Error('Failed to fetch messages');
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    onMessagesUpdate?.(data);
    return data;
  };

  const { stopPolling } = usePolling(fetchMessages, {
    interval: 3000,
    enabled,
    stopOn404: true,
    onError: (error) => {
      if (error.name !== 'AbortError') {
        console.error('Polling error:', error);
      }
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopPolling();
    };
  }, [stopPolling]);

  return null;
}
