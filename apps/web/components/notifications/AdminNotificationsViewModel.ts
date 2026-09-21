"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"

interface AdminNotification {
    _id: string
    message: string
    type: "announcement" | "alert" | "reminder"
    createdAt: string
}

export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const [totalCount, setTotalCount] = useState(0)

    const fetchNotifications = useCallback(async (nextPage = 1) => {
        if (!hasMore && nextPage !== 1) return

        setLoading(true)
        try {
            const { data } = await axios.get(`/api/user/get-admin-notifications?page=${nextPage}`)
            if (nextPage === 1) {
                setNotifications(data.notifications)
            } else {
                setNotifications((prev) => [...prev, ...data.notifications])
            }
            setHasMore(data.hasMore)
            setPage(nextPage)
            setTotalCount(data.totalCount)
        } catch (error) {
            console.error("Error fetching admin-notifications:", error)
        }
        setLoading(false)
    }, [hasMore])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    return { notifications, fetchNotifications, hasMore, loading, page, totalCount }
}
