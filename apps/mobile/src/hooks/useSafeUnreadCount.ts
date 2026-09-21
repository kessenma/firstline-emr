// apps/mobile/src/hooks/useSafeUnreadCount.ts
// Safe version of unread notification count hook that handles errors gracefully

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config';
import { storageUtils } from '../utils/storage';

interface UseSafeUnreadCountResult {
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSafeUnreadCount(userId: string | undefined): UseSafeUnreadCountResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreadCount = async () => {
    if (!userId) {
      console.log('[useSafeUnreadCount] No userId provided, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = storageUtils.getToken();
      if (!token) {
        console.log('[useSafeUnreadCount] No auth token available');
        setUnreadCount(0);
        return;
      }

      const url = getApiUrl(`/notifications/unread-count/${userId}`);
      console.log('[useSafeUnreadCount] Fetching from:', url);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000, // 5 second timeout
      });

      const count = response.data?.unreadCount || 0;
      console.log('[useSafeUnreadCount] Received count:', count);
      setUnreadCount(count);
    } catch (err) {
      console.log('[useSafeUnreadCount] Error fetching count:', err);
      setError(err as Error);
      // Don't crash, just set count to 0
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Delay initial fetch to avoid race conditions
    const timer = setTimeout(() => {
      fetchUnreadCount();
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  // Set up polling for updates every 2 minutes
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [userId]);

  return {
    unreadCount,
    isLoading,
    error,
    refetch: fetchUnreadCount,
  };
}
