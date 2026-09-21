// apps/web/components/adminDashboard/sections/notifications/CentralNotificationsViewModel.ts
"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { useQuery, useInfiniteQuery } from "@tanstack/react-query"

export interface CentralNotification {
    _id: string
    message: string
    type: "message" | "alert" | "announcement" | "reminder"
    createdAt: string
    patientId?: string
    redirectTo?: string
    sourceId?: string
    subject?: string
    recipientCount: number // Count of users who received this notification
    readCount: number // Count of users who have read this notification
}

interface NotificationsResponse {
    notifications: CentralNotification[]
    totalCount: number
    totalPages: number
}

export function useCentralNotifications() {
    const { data: session } = useSession()
    const token = session?.user?.token

    // Filter states
    const [patientId, setPatientId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [type, setType] = useState<string | null>(null)
    const [notificationType, setNotificationType] = useState<string | null>(null)
    const [specialty, setSpecialty] = useState<string | null>(null)
    const [pageSize, setPageSize] = useState(15) // Set to 15 items per page
    const [paginationMode, setPaginationMode] = useState<"infinite" | "paged">("infinite")
    const [currentPage, setCurrentPage] = useState(1)

    // Build query string
    const buildQueryString = (page = 1, limit: number = pageSize) => {
        const params = new URLSearchParams()
        if (patientId) params.append("patientId", patientId)
        if (userId) params.append("userId", userId)
        if (type && type !== "all") params.append("type", type)
        if (notificationType && notificationType !== "all") params.append("notificationType", notificationType)
        if (specialty && specialty !== "all") params.append("specialty", specialty)
        params.append("page", page.toString())
        params.append("limit", limit.toString())
        return params.toString()
    }

    // Fetch central notifications with pagination
    const {
        data: pagedData,
        isLoading: isPagedLoading,
        refetch: refetchPaged,
    } = useQuery({
        queryKey: [
            "admin-central-notifications-paged",
            patientId,
            userId,
            type,
            notificationType,
            specialty,
            pageSize,
            currentPage,
        ],
        queryFn: async () => {
            const queryString = buildQueryString(currentPage)
            const response = await fetch(`/api/admin/GET/central-notifications?${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) throw new Error("Failed to fetch central notifications")
            return response.json() as Promise<NotificationsResponse>
        },
        enabled: !!token && paginationMode === "paged",
    })

    // Fetch central notifications with infinite scroll
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isInfiniteLoading,
        refetch: refetchInfinite,
    } = useInfiniteQuery({
        queryKey: ["admin-central-notifications-infinite", patientId, userId, type, notificationType, specialty, pageSize],
        queryFn: async ({ pageParam = 1 }) => {
            const queryString = buildQueryString(pageParam)
            const response = await fetch(`/api/admin/GET/central-notifications?${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) throw new Error("Failed to fetch central notifications")
            return response.json() as Promise<NotificationsResponse>
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const nextPage = allPages.length + 1
            return nextPage <= (lastPage.totalPages || 1) ? nextPage : undefined
        },
        enabled: !!token && paginationMode === "infinite",
    })

    // Reset filters
    const resetFilters = () => {
        setPatientId(null)
        setUserId(null)
        setType(null)
        setNotificationType(null)
        setSpecialty(null)
        setCurrentPage(1)
    }

    // Handle page change for pagination
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    // Toggle pagination mode
    const togglePaginationMode = () => {
        setPaginationMode((prev) => (prev === "infinite" ? "paged" : "infinite"))
        setCurrentPage(1)
    }

    // Get all notifications from infinite data
    const allInfiniteNotifications = infiniteData?.pages.flatMap((page) => page.notifications) || []

    // Determine which data to use based on pagination mode
    const centralNotifications = paginationMode === "infinite" ? allInfiniteNotifications : pagedData?.notifications || []

    const totalPages =
        paginationMode === "infinite" ? infiniteData?.pages[0]?.totalPages || 1 : pagedData?.totalPages || 1

    const isLoading = paginationMode === "infinite" ? isInfiniteLoading : isPagedLoading

    // Refetch based on current mode
    const refetch = () => {
        if (paginationMode === "infinite") {
            refetchInfinite()
        } else {
            refetchPaged()
        }
    }

    return {
        centralNotifications,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        totalPages,
        currentPage,
        filters: {
            patientId,
            setPatientId,
            userId,
            setUserId,
            type,
            setType,
            notificationType,
            setNotificationType,
            specialty,
            setSpecialty,
            pageSize,
            setPageSize,
        },
        paginationMode,
        togglePaginationMode,
        handlePageChange,
        resetFilters,
        refetch,
    }
}
