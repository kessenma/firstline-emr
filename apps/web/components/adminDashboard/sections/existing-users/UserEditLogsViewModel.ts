// apps/web/components/adminDashboard/sections/existing-users/UserEditLogsViewModel.ts
"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/hooks/useToast"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

interface ProfileChange {
    field: string
    oldValue: any
    newValue: any
}

export interface UserProfileLog {
    _id: string
    userId: string
    changedBy: string
    changedAt: Date
    changes: ProfileChange[]
    isAdminAction: boolean
    userEmail?: string
    userName?: string
}

interface PaginationData {
    total: number
    page: number
    limit: number
    totalPages: number
}

interface LogsResponse {
    logs: UserProfileLog[]
    pagination: PaginationData
}

export function useUserEditLogsViewModel() {
    const { data: session } = useSession()
    const [page, setPage] = useState(1)
    const [limit] = useState(50)
    const { setToast } = useToast()

    // Use React Query for data fetching and caching
    const { data, isLoading, error } = useQuery<LogsResponse>({
        queryKey: ["userProfileLogs", page, limit],
        queryFn: async () => {
            const response = await axios.get(`/api/user-profile-logs?page=${page}&limit=${limit}`)
            return response.data
        },
        enabled: !!session?.user?.isAdmin,
    })

    // Use useMemo for derived values
    const logs = useMemo(() => {
        return data?.logs || []
    }, [data])

    const pagination = useMemo(() => {
        return (
            data?.pagination || {
                total: 0,
                page,
                limit,
                totalPages: 0,
            }
        )
    }, [data, page, limit])

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
    }

    // Format field names for display
    const formatFieldName = (field: string) => {
        return field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
    }

    // Format values for display
    const formatValue = (value: any) => {
        if (value === null || value === undefined) return "None"
        if (Array.isArray(value)) return value.join(", ") || "None"
        if (typeof value === "object" && value instanceof Date) return new Date(value).toLocaleDateString()
        if (typeof value === "object") return JSON.stringify(value)
        return String(value)
    }

    return {
        logs,
        isLoading,
        error,
        pagination,
        handlePageChange,
        formatFieldName,
        formatValue,
    }
}

