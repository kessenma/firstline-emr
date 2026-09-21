// apps/web/components/adminDashboard/sections/notifications/AdminUserNotificationsTable.tsx
"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ResponsiveTable } from "@/components/ui/Table/ResponsiveTable"
import Tooltip from "@/components/form/Tooltip"
import type { UserNotification } from "./AdminUserNotificationsViewModel"
import { MessageSquare, ExternalLink, Mail, CheckCircle, XCircle } from 'lucide-react'
import Link from "next/link"
import type { TableColumn } from "@/components/ui/Table/types"

interface UserNotificationsTableProps {
    notifications: UserNotification[] | undefined
}

export function UserNotificationsTable({ notifications }: UserNotificationsTableProps) {
    // Using a constant since we're not changing it
    const showTooltips = true

    if (!notifications || notifications.length === 0) {
        return <div className="text-center py-8">No notifications found</div>
    }

    // Define columns for the custom Table component
    const columns: TableColumn<UserNotification>[] = [
        {
            key: "createdAt",
            header: "Date",
            render: (value, notification) => (
                <span className="whitespace-nowrap">{format(new Date(notification.createdAt), "MMM d, yyyy HH:mm")}</span>
            ),
            priority: 3, // High priority - show on mobile
            mobileSize: "medium",
        },
        {
            key: "message",
            header: "Message",
            render: (value, notification) => (
                <div className="break-words" title={notification.message}>
                    {notification.message}
                </div>
            ),
            priority: 4, // Highest priority - show on mobile
            mobileSize: "large",
        },
        {
            key: "type",
            header: "Category",
            render: (value, notification) => {
                let variant: "default" | "destructive" | "outline" | "secondary" = "default"

                switch (notification.type) {
                    case "alert":
                        variant = "destructive"
                        break
                }

                return <Badge variant={variant}>{notification.type}</Badge>
            },
            priority: 2, // Medium priority - show on mobile
            mobileSize: "small",
        },
        {
            key: "methods",
            header: "Method",
            render: (value, notification) => (
                <div className="flex items-center gap-1">
                    {notification.methods.includes("in-app") && (
                        <Tooltip tooltipText="In-App Notification" showTooltip={showTooltips}>
                            <Badge variant="default">In-App</Badge>
                        </Tooltip>
                    )}
                    {notification.methods.includes("email") && (
                        <Tooltip tooltipText="Email Notification" showTooltip={showTooltips}>
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>Email</span>
                            </Badge>
                        </Tooltip>
                    )}
                </div>
            ),
            priority: 1, // Lower priority - may hide on mobile
            mobileSize: "medium",
        },
        {
            key: "read",
            header: "Read",
            render: (value, notification) => (
                <div className="flex justify-center">
                    {notification.read ? (
                        <Tooltip tooltipText="Notification has been read" showTooltip={showTooltips}>
                            <CheckCircle className="h-5 w-5 text-primary" />
                        </Tooltip>
                    ) : (
                        <Tooltip tooltipText="Notification has not been read" showTooltip={showTooltips}>
                            <XCircle className="h-5 w-5 text-destructive" />
                        </Tooltip>
                    )}
                </div>
            ),
            priority: 2, // Medium priority - show on mobile
            mobileSize: "small",
        },
        {
            key: "userId",
            header: "User ID",
            render: (value, notification) => (
                <div className="max-w-[150px] truncate" title={notification.userId}>
                    {notification.userId}
                </div>
            ),
            priority: 1, // Lower priority - may hide on mobile
            mobileSize: "medium",
        },
        {
            key: "_id",
            header: "Actions",
            render: (value, notification) => (
                <div className="flex space-x-2">
                    <Tooltip tooltipText={notification.message} showTooltip={showTooltips}>
                        <button className="text-muted-foreground hover:text-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">View message</span>
                        </button>
                    </Tooltip>

                    {notification.patientId && (
                        <Tooltip tooltipText="View patient" showTooltip={showTooltips}>
                            <Link
                                href={`/patient/${notification.patientId}`}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                            >
                            <ExternalLink className="h-4 w-4" />
                            </Link>
                        </Tooltip>
                    )}
                </div>
            ),
            priority: 2, // Medium priority - show on mobile
            mobileSize: "small",
        },
    ]

    const handleRowClick = (notification: UserNotification) => {
        // Optional: Handle row click, e.g., show notification details
        console.log("Notification clicked:", notification)
    }

    return (
        <div className="overflow-x-auto h-full">
            <ResponsiveTable
                data={notifications}
                columns={columns}
                onRowClick={handleRowClick}
                backgroundColor="card"
                textColor="foreground"
                borderColor="border"
                headerBackgroundColor="card"
                headerTextColor="muted-foreground"
                hoverBackgroundColor="muted"
                hoverTextColor="foreground"
                stickyHeader={true}
            />
        </div>
    )
}
