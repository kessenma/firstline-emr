// apps/web/components/notifications/NotificationsViewModel.ts
"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryFunctionContext,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface Notification {
  _id: string;
  id?: string;
  notificationId?: string;
  message: string;
  type:
    | "message"
    | "alert"
    | "profile_update_approved"
    | "profile_update_denied"
    | "profile_update_request"
    | "patient_update"
    | "system_notification"
    | "new_user_signup"
    | "specialty_no_doctors"
    | "announcement"
    | "reminder";
  methods: string[];
  read: boolean;
  createdAt: string;
  patientId?: string;
  redirectTo?: string;
  isAdminNotification?: boolean;
  actionUrl?: string;
  description?: string;
  links?: { url: string; displayName: string }[];
  images?: {
    filePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }[];
}

interface AdminNotificationRaw {
  id: string;
  message: string;
  type: "announcement" | "alert" | "reminder";
  senderId: string | null;
  emailSent: boolean;
  createdAt: string;
  actionUrl?: string | null;
  description?: string | null;
  links?: { url: string; displayName: string }[] | null;
  images?: {
    filePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }[] | null;
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

type QueryKey = readonly ["notifications", string] | readonly ["notifications"];

export function useNotificationsViewModel() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const fetchNotifications = async ({
    pageParam = 0,
    queryKey,
  }: QueryFunctionContext<QueryKey, number>): Promise<NotificationResponse> => {
    if (!userId) return { notifications: [] };
    const res = await axios.get(`/api/notifications/${userId}`, {
      params: { skip: pageParam, limit: 20 },
    });
    return res.data;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
  } = useInfiniteQuery<
    NotificationResponse,
    Error,
    InfiniteData<NotificationResponse>,
    QueryKey,
    number
  >({
    queryKey: userId ? ["notifications", userId] : ["notifications"],
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
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    refetchOnMount: false, // Don't refetch on mount (rely on cache and invalidation)
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      console.log("[NotificationViewModel] Marking all notifications as read");
      const response = await axios.patch(
        `/api/notifications/mark-all-read/${userId}`,
      );
      console.log(
        "[NotificationViewModel] Mark all API response:",
        response.data,
        "Status:",
        response.status,
      );
      return response;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: userId ? ["notifications", userId] : ["notifications"],
      });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(
        userId ? ["notifications", userId] : ["notifications"],
      );

      // Optimistically update all to read
      queryClient.setQueryData<InfiniteData<NotificationResponse>>(
        userId ? ["notifications", userId] : ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notif) => ({
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
    onError: (err, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          userId ? ["notifications", userId] : ["notifications"],
          context.previousNotifications,
        );
      }
    },
    onSettled: async () => {
      // Invalidate and refetch both queries to ensure UI is in sync
      console.log(
        "[NotificationViewModel] Invalidating queries after mark all as read",
      );
      await queryClient.invalidateQueries({
        queryKey: userId ? ["notifications", userId] : ["notifications"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["unreadNotificationCount", userId],
      });
      console.log(
        "[NotificationViewModel] Queries invalidated, UI should update",
      );
    },
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      console.log(
        "[NotificationViewModel] Marking notification as read:",
        notificationId,
      );
      const response = await axios.patch(
        `/api/notifications/${notificationId}`,
      );
      console.log(
        "[NotificationViewModel] API response:",
        response.data,
        "Status:",
        response.status,
      );
      return response;
    },
    onMutate: async (notificationId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: userId ? ["notifications", userId] : ["notifications"],
      });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(
        userId ? ["notifications", userId] : ["notifications"],
      );

      // Optimistically update to the new value
      queryClient.setQueryData<InfiniteData<NotificationResponse>>(
        userId ? ["notifications", userId] : ["notifications"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notif) =>
                notif._id === notificationId ? { ...notif, read: true } : notif,
              ),
            })),
          };
        },
      );

      // Return context with the previous value
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      // Rollback to the previous value on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          userId ? ["notifications", userId] : ["notifications"],
          context.previousNotifications,
        );
      }
    },
    onSettled: async () => {
      // Invalidate and refetch both queries to ensure UI is in sync
      console.log(
        "[NotificationViewModel] Invalidating queries for userId:",
        userId,
      );
      await queryClient.invalidateQueries({
        queryKey: userId ? ["notifications", userId] : ["notifications"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["unreadNotificationCount", userId],
      });
      console.log(
        "[NotificationViewModel] Queries invalidated, UI should update",
      );
    },
  });

  // Function to mark all notifications as read
  const handleMarkAllAsRead = useCallback(() => {
    console.log("[NotificationViewModel] Mark all as read clicked");
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Function to handle notification click
  const handleNotificationClick = useCallback(
    (notification: Notification, customHandler?: () => void) => {
      console.log("[NotificationViewModel] Notification clicked:", {
        _id: notification._id,
        id: notification.id,
        notificationId: notification.notificationId,
        read: notification.read,
        message: notification.message,
      });
      // Mark notification as read (skip for admin notifications)
      if (!notification.read && !notification.isAdminNotification) {
        console.log(
          "[NotificationViewModel] Marking as read with ID:",
          notification._id,
        );
        markAsReadMutation.mutate(notification._id);
      } else {
        console.log("[NotificationViewModel] Already read, skipping mutation");
      }

      // If custom handler provided, use it instead of default navigation
      if (customHandler) {
        customHandler();
        return;
      }

      // Navigate based on redirectTo field if present, otherwise use patientId
      if (notification.redirectTo) {
        router.push(notification.redirectTo);
      } else if (notification.patientId) {
        router.push(`/patient/${notification.patientId}`);
      }
    },
    [markAsReadMutation, router],
  );

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver);
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // Fetch admin notifications separately
  const { data: adminData } = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: async () => {
      const res = await axios.get("/api/user/get-admin-notifications", {
        params: { page: 1 },
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });

  const normalizedAdminNotifications = useMemo(
    () =>
      (adminData?.notifications ?? []).map(normalizeAdminNotification),
    [adminData],
  );

  // Merge regular + admin notifications, sorted by date
  const allNotifications = useMemo(() => {
    const regular =
      data?.pages.flatMap((page: NotificationResponse) => page.notifications) ??
      [];
    const merged = [...regular, ...normalizedAdminNotifications];
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
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
    handleNotificationClick,
    handleMarkAllAsRead,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
