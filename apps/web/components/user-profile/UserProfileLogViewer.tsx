// apps/web/components/user-profile/UserProfileLogViewer.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { useToast } from "@/components/hooks/useToast"
import { formatDistanceToNow } from "date-fns"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { History } from "lucide-react"
import { useUserProfile } from "./UserProfileContext"
import { cn } from "@/lib/utils"

interface ProfileChange {
    field: string
    oldValue: any
    newValue: any
}

interface UserProfileLog {
    id: string
    userId: string
    changedBy: string
    changedAt: Date
    changes: ProfileChange[]
    isAdminAction: boolean
}

interface PaginationData {
    total: number
    page: number
    limit: number
    totalPages: number
}

interface UserProfileLogViewerProps {
    userId?: string // Optional - if provided, only show logs for this user
    className?: string
}

export function UserProfileLogViewer({ userId, className }: UserProfileLogViewerProps) {
    const [logs, setLogs] = useState<UserProfileLog[]>([])
    const { setToast } = useToast()
    const [pagination, setPagination] = useState<PaginationData>({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
    })
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const { lastUpdate } = useUserProfile()

    const fetchLogs = useCallback(async (page: number) => {
        if (!userId) return

        setIsLoading(true)
        try {
            const url = `/api/user-profile-logs/${userId}?page=${page}&limit=${pagination.limit}`

            const response = await fetch(url)

            if (!response.ok) {
                throw new Error("Failed to fetch logs")
            }

            const data = await response.json()
            setLogs(data.logs)
            // Ensure page is a number to prevent infinite loops if API returns string
            setPagination({
                ...data.pagination,
                page: Number(data.pagination.page),
                limit: Number(data.pagination.limit),
                total: Number(data.pagination.total),
                totalPages: Number(data.pagination.totalPages)
            })
        } catch (error) {
            console.error("Error fetching logs:", error)
            setToast({
                title: "Error",
                description: "Failed to load profile logs",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [userId, pagination.limit, setToast])

    // Debug logging to identify why effect is running
    useEffect(() => {
        if (userId) {
            // console.log("UserProfileLogViewer: fetching logs", { userId, page: pagination.page, lastUpdate })
            fetchLogs(pagination.page)
        }
    }, [userId, pagination.page, lastUpdate, fetchLogs])

    const handlePageChange = (page: number) => {
        setPagination((prev) => ({ ...prev, page }))
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

    if (!userId) {
        return null
    }

    return (
        <Card className={cn("w-full max-w-3xl mx-auto", className)} backgroundColor="card" shadowSize="lg">
            <Accordion type="single" collapsible>
                <AccordionItem value="logs" className="border-none">
                    <AccordionTrigger className="px-6 py-4">
                        <div className="flex items-center gap-2 transition-colors border border-border p-2 rounded-2xl hover:bg-accent hover:text-accent-foreground">
                            <History className="h-5 w-5 text-primary"/>
                            <CardTitle className="text-xl text-foreground">Profile Change History</CardTitle>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-4">Loading...</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center p-4 text-muted-foreground">No profile changes found</div>
                            ) : (
                                <div className="space-y-6">
                                    {logs.map((log) => (
                                        <div key={log.id} className="border border-border rounded-lg p-4 bg-card">
                                            <div className="flex justify-between items-center mb-2">
                                                <div>
                                                    <span className="font-medium">{log.isAdminAction ? "Admin action" : "User update"}</span>
                                                    <span className="text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(log.changedAt), { addSuffix: true })}
                          </span>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="text-left py-2">Field</th>
                                                        <th className="text-left py-2">Old Value</th>
                                                        <th className="text-left py-2">New Value</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {log.changes.map((change, index) => (
                                                        <tr key={index} className="border-b border-border">
                                                            <td className="py-2">{formatFieldName(change.field)}</td>
                                                            <td className="py-2">{formatValue(change.oldValue)}</td>
                                                            <td className="py-2">{formatValue(change.newValue)}</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}

                                    {pagination.totalPages > 1 && (
                                        <Pagination
                                            currentPage={pagination.page}
                                            totalPages={pagination.totalPages}
                                            onPageChange={handlePageChange}
                                        />
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    )
}
