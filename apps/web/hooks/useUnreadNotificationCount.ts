// apps/web/hooks/useUnreadNotificationCount.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import axios from "axios";

interface UnreadCountResponse {
  unreadCount: number;
}

export function useUnreadNotificationCount() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data, isLoading, error, refetch } = useQuery<UnreadCountResponse>({
    queryKey: ["unreadNotificationCount", userId],
    queryFn: async () => {
      if (!userId) return { unreadCount: 0 };
      const response = await axios.get<UnreadCountResponse>(
        `/api/notifications/unread-count/${userId}`,
      );
      return response.data;
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
