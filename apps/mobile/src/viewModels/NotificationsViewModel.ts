// fajr-medflow-emr/apps/mobile/src/viewModels/NotificationsViewModel.ts
'use client';

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryFunctionContext,
  type InfiniteData,
} from '@tanstack/react-query';
import { useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config';
import { storageUtils } from '../utils/storage';

export interface Notification {
  _id: string;
  id?: string;
  notificationId?: string;
  message: string;
  type:
    | 'message'
    | 'alert'
    | 'profile_update_approved'
    | 'profile_update_denied'
    | 'profile_update_request'
    | 'patient_update'
    | 'system_notification'
    | 'new_user_signup'
    | 'specialty_no_doctors'
    | 'missed_call'
    | 'announcement'
    | 'reminder';
  methods: string[];
  read: boolean;
  createdAt: string;
  patientId?: string;
  redirectTo?: string;
  isAdminNotification?: boolean;
  actionUrl?: string;
  description?: string;
  links?: { url: string; displayName: string }[];
  images?: { filePath: string; fileName: string; fileSize: number; contentType: string }[];
}

interface AdminNotificationRaw {
  id: string;
  message: string;
  type: 'announcement' | 'alert' | 'reminder';
  senderId: string | null;
  emailSent: boolean;
  createdAt: string;
  actionUrl?: string | null;
  description?: string | null;
  links?: { url: string; displayName: string }[] | null;
  images?: { filePath: string; fileName: string; fileSize: number; contentType: string }[] | null;
}

function normalizeAdminNotification(raw: AdminNotificationRaw): Notification {
  return {
    _id: `admin_${raw.id}`,
    id: raw.id,
    message: raw.message,
    type: raw.type,
    methods: [],
    read: true,
    createdAt: raw.createdAt,
    isAdminNotification: true,
    actionUrl: raw.actionUrl ?? undefined,
    description: raw.description ?? undefined,
    links: raw.links ?? undefined,
    images: raw.images ?? undefined,
  };
}

interface NotificationResponse {
  notifications: Notification[];
}

type QueryKey = readonly ['notifications', string] | readonly ['notifications'];

export function useNotificationsViewModel() {
  const { user } = useAuth(); // Assuming useAuth provides { user: { id } }
  const userId = user?.id;
  useNavigation();
  const queryClient = useQueryClient();

  const fetchNotifications = async ({
    pageParam = 0,
    queryKey: _queryKey,
  }: QueryFunctionContext<QueryKey, number>): Promise<NotificationResponse> => {
    if (!userId) {
      return { notifications: [] };
    }
    const token = storageUtils.getToken();
    const url = getApiUrl(`/notifications/${userId}`);
    console.log(
      '[NotificationsViewModel] Fetching notifications from URL:',
      url,
    );
    console.log('[NotificationsViewModel] Token exists:', !!token);
    console.log('[NotificationsViewModel] UserId:', userId);
    try {
      const res = await axios.get(url, {
        params: { skip: pageParam, limit: 20 },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });
      console.log(
        '[NotificationsViewModel] Success, got',
        res.data?.notifications?.length,
        'notifications',
      );
      return res.data;
    } catch (error) {
      console.error('[NotificationsViewModel] API error:', error);
      if (axios.isAxiosError(error)) {
        console.error('[NotificationsViewModel] Error details:', {
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
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isRefetching,
    error,
  } = useInfiniteQuery<
    NotificationResponse,
    Error,
    InfiniteData<NotificationResponse>,
    QueryKey,
    number
  >({
    queryKey: userId ? ['notifications', userId] : ['notifications'],
    queryFn: fetchNotifications,
    initialPageParam: 0,
    enabled: !!userId,
    getNextPageParam: (
      lastPage: NotificationResponse,
      pages: NotificationResponse[],
    ) => {
      return lastPage.notifications.length === 20
        ? pages.length * 20
        : undefined;
    },
    // Balanced caching configuration
    staleTime: 0, // Always consider data stale to allow updates
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: true, // Refetch when app regains focus
    refetchOnMount: true, // Refetch on mount to get latest
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes (matches unread count polling)
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const token = storageUtils.getToken();
      const url = getApiUrl(`/notifications/mark-all-read/${userId}`);
      try {
        const response = await axios.patch(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        return response;
      } catch (error) {
        console.error('[NotificationViewModel] Mark all API error:', error);
        throw error;
      }
    },
    onMutate: async (): Promise<{ previousNotifications?: InfiniteData<NotificationResponse, unknown> }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: userId ? ['notifications', userId] : ['notifications'],
      });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<InfiniteData<NotificationResponse>>(
        userId ? ['notifications', userId] : ['notifications'],
      );

      // Optimistically update all to read
      queryClient.setQueryData<InfiniteData<NotificationResponse>>(
        userId ? ['notifications', userId] : ['notifications'],
        (old: InfiniteData<NotificationResponse> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: NotificationResponse) => ({
              ...page,
              notifications: page.notifications.map((notif: Notification) => ({
                ...notif,
                read: true,
              })),
            })),
          };
        },
      );

      // Return context with the previous value
      return { previousNotifications };
    },
    onError: (
      err: Error,
      variables: void,
      context:
        | { previousNotifications?: InfiniteData<NotificationResponse> }
        | undefined,
    ) => {
      console.error('Error marking all as read:', err);
      // Rollback to the previous value on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          userId ? ['notifications', userId] : ['notifications'],
          context.previousNotifications,
        );
      }
    },
    onSettled: async () => {
      // Invalidate and refetch both queries to ensure UI is in sync
      console.log(
        '[NotificationViewModel] Invalidating queries after mark all as read',
      );
      await queryClient.invalidateQueries({
        queryKey: userId ? ['notifications', userId] : ['notifications'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['unreadNotificationCount', userId],
      });
      console.log(
        '[NotificationViewModel] Queries invalidated, UI should update',
      );
    },
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const token = storageUtils.getToken();
      const url = getApiUrl(`/notifications/${notificationId}`);
      try {
        const response = await axios.patch(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        return response;
      } catch (error) {
        console.error('[NotificationViewModel] Mark read API error:', error);
        throw error;
      }
    },
    onMutate: async (notificationId: string): Promise<{ previousNotifications?: InfiniteData<NotificationResponse, unknown> }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: userId ? ['notifications', userId] : ['notifications'],
      });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<InfiniteData<NotificationResponse>>(
        userId ? ['notifications', userId] : ['notifications'],
      );

      // Optimistically update to the new value
      queryClient.setQueryData<InfiniteData<NotificationResponse>>(
        userId ? ['notifications', userId] : ['notifications'],
        (old: InfiniteData<NotificationResponse> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: NotificationResponse) => ({
              ...page,
              notifications: page.notifications.map((notif: Notification) =>
                notif._id === notificationId ? { ...notif, read: true } : notif,
              ),
            })),
          };
        },
      );

      // Return context with the previous value
      return { previousNotifications };
    },
    onError: (
      err: Error,
      notificationId: string,
      context:
        | { previousNotifications?: InfiniteData<NotificationResponse> }
        | undefined,
    ) => {
      console.error('Error marking as read:', err);
      // Rollback to the previous value on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          userId ? ['notifications', userId] : ['notifications'],
          context.previousNotifications,
        );
      }
    },
    onSettled: async () => {
      // Invalidate and refetch both queries to ensure UI is in sync
      console.log(
        '[NotificationViewModel] Invalidating queries for userId:',
        userId,
      );
      await queryClient.invalidateQueries({
        queryKey: userId ? ['notifications', userId] : ['notifications'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['unreadNotificationCount', userId],
      });
      console.log(
        '[NotificationViewModel] Queries invalidated, UI should update',
      );
    },
  });

  // Function to mark all notifications as read
  const handleMarkAllAsRead = useCallback(() => {
    console.log('[NotificationViewModel] Mark all as read clicked');
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Function to handle notification click — marks as read only.
  // Navigation / sheet logic is handled by the NotificationsScreen.
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read && !notification.isAdminNotification) {
        markAsReadMutation.mutate(notification._id);
      }
    },
    [markAsReadMutation],
  );

  const loadMoreRef = useRef(null);

  // Fetch admin notifications separately
  const { data: adminData } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const token = storageUtils.getToken();
      const url = getApiUrl('/user/get-admin-notifications');
      const res = await axios.get(url, {
        params: { page: 1 },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });

  // Normalize admin notifications
  const normalizedAdminNotifications = useMemo(
    () => (adminData?.notifications ?? []).map(normalizeAdminNotification),
    [adminData],
  );

  // Extract regular notifications and merge with admin notifications, sorted by date
  const allNotifications = useMemo(() => {
    const regular = data?.pages.flatMap((page: NotificationResponse) => page.notifications) ?? [];
    const merged = [...regular, ...normalizedAdminNotifications];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }, [data, normalizedAdminNotifications]);

  return {
    notificationsPages: allNotifications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
    refetch,
    isLoading,
    isRefetching,
    error,
    handleNotificationClick,
    handleMarkAllAsRead,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
