// fajr-medflow-emr/apps/mobile/src/hooks/useUnreadNotificationCount.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getApiUrl } from '../config';
import { storageUtils } from '../utils/storage';

interface UnreadCountResponse {
  unreadCount: number;
}

export function useUnreadNotificationCount(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery<UnreadCountResponse>({
    queryKey: ['unreadNotificationCount', userId],
    queryFn: async () => {
      if (!userId) {
        return { unreadCount: 0 };
      }
      const token = storageUtils.getToken();
      const url = getApiUrl(`/notifications/unread-count/${userId}`);
      console.log('[useUnreadNotificationCount] Fetching from URL:', url);
      console.log('[useUnreadNotificationCount] Token exists:', !!token);
      console.log('[useUnreadNotificationCount] UserId:', userId);
      try {
        const response = await axios.get<UnreadCountResponse>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });
        console.log(
          '[useUnreadNotificationCount] Success, unread count:',
          response.data.unreadCount,
        );
        return response.data;
      } catch (error) {
        console.error('[useUnreadNotificationCount] API error:', error);
        if (axios.isAxiosError(error)) {
          console.error('[useUnreadNotificationCount] Error details:', {
            message: error.message,
            code: error.code,
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
          });
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 0, // Always consider stale to allow immediate updates
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when tab regains focus
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  return {
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}
