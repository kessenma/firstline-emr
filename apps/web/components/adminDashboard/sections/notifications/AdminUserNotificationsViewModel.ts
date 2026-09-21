// apps/web/components/adminDashboard/sections/notifications/AdminUserNotificationsViewModel.ts
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

export interface UserNotification {
  _id: string;
  userId: string;
  notificationId: string;
  read: boolean;
  methods: string[];
  emailAddress?: string;
  message: string;
  type: "message" | "alert";
  subject?: string;
  createdAt: string;
  patientId?: string;
  redirectTo?: string;
}

interface NotificationsResponse {
  notifications: UserNotification[];
  totalCount: number;
  totalPages: number;
  unreadCount: number;
  lastReadAt: string;
}

export function useNotificationsViewModel() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // Filter states
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [read, setRead] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(15);
  const [paginationMode, setPaginationMode] = useState<"infinite" | "paged">(
    "infinite",
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Build query string
  const buildQueryString = (page = 1, limit: number = pageSize) => {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (type && type !== "all") params.append("type", type);
    if (method && method !== "all") params.append("method", method);
    if (read !== null) params.append("read", read);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return params.toString();
  };

  // Fetch user notifications with pagination
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    refetch: refetchPaged,
  } = useQuery({
    queryKey: [
      "admin-user-notifications-paged",
      userId,
      type,
      method,
      read,
      pageSize,
      currentPage,
    ],
    queryFn: async () => {
      const queryString = buildQueryString(currentPage);
      const response = await fetch(
        `/api/admin/GET/user-notifications?${queryString}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch user notifications");
      return response.json() as Promise<NotificationsResponse>;
    },
    enabled: !!token && paginationMode === "paged",
  });

  // Fetch user notifications with infinite scroll
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading,
    refetch: refetchInfinite,
  } = useInfiniteQuery({
    queryKey: [
      "admin-user-notifications-infinite",
      userId,
      type,
      method,
      read,
      pageSize,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const queryString = buildQueryString(pageParam);
      const response = await fetch(
        `/api/admin/GET/user-notifications?${queryString}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch user notifications");
      return response.json() as Promise<NotificationsResponse>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= (lastPage.totalPages || 1) ? nextPage : undefined;
    },
    enabled: !!token && paginationMode === "infinite",
  });

  // Reset filters
  const resetFilters = () => {
    setUserId(null);
    setType(null);
    setMethod(null);
    setRead(null);
    setCurrentPage(1);
  };

  // Handle page change for pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Toggle pagination mode
  const togglePaginationMode = () => {
    setPaginationMode((prev) => (prev === "infinite" ? "paged" : "infinite"));
    setCurrentPage(1);
  };

  // Get all notifications from infinite data
  const allInfiniteNotifications =
    infiniteData?.pages.flatMap((page) => page.notifications) || [];

  // Determine which data to use based on pagination mode
  const userNotifications =
    paginationMode === "infinite"
      ? allInfiniteNotifications
      : pagedData?.notifications || [];

  const totalPages =
    paginationMode === "infinite"
      ? infiniteData?.pages[0]?.totalPages || 1
      : pagedData?.totalPages || 1;

  const isLoading =
    paginationMode === "infinite" ? isInfiniteLoading : isPagedLoading;

  // Refetch based on current mode
  const refetch = () => {
    if (paginationMode === "infinite") {
      refetchInfinite();
    } else {
      refetchPaged();
    }
  };

  return {
    userNotifications,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    totalPages,
    currentPage,
    filters: {
      userId,
      setUserId,
      type,
      setType,
      method,
      setMethod,
      read,
      setRead,
      pageSize,
      setPageSize,
    },
    paginationMode,
    togglePaginationMode,
    handlePageChange,
    resetFilters,
    refetch,
  };
}
