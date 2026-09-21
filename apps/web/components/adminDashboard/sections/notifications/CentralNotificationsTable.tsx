// apps/web/components/adminDashboard/sections/notifications/CentralNotificationsTable.tsx
"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ResponsiveTable } from "@/components/ui/Table/ResponsiveTable"
import Tooltip from "@/components/form/Tooltip"
import type { CentralNotification } from "./CentralNotificationsViewModel"
import { MessageSquare, ExternalLink, Users, Eye } from 'lucide-react'
import Link from "next/link"
import type { TableColumn } from "@/components/ui/Table/types"
import type React from "react"

interface CentralNotificationsTableProps {
    notifications: CentralNotification[] | undefined
}

export function CentralNotificationsTable({ notifications }: CentralNotificationsTableProps) {
    // Using a constant since we're not changing it
    const showTooltips = true

    if (!notifications || notifications.length === 0) {
        return <div className="text-center py-8">No notifications found</div>
    }

    // Update the getNotificationType function to add a border around specialties
    const getNotificationType = (notification: CentralNotification): React.ReactNode => {
        const message = notification.message || ""

        if (message.includes("New case requires attention for your specialty")) {
            const specialtyMatch = message.match(/specialty: ([^.]+)/)
            const specialty = specialtyMatch ? specialtyMatch[1] : "Unknown"
            const locationMatch = message.match(/Patient from ([^.]+)/)
            const location = locationMatch ? locationMatch[1] : "Unknown"

            return (
                <>
                    Specialty{" "}
                    <span className="border border-border rounded px-1 py-0.5 text-foreground bg-card">{specialty}</span>{" "}
                    assigned
                </>
            )
        }

        if (message.includes("completed their intake form")) {
            const locationMatch = message.match(/from ([^.]+)/)
            const location = locationMatch ? locationMatch[1] : "Unknown"
            return `New patient from ${location}`
        }

        // Default case
        return notification.type
    }

    // Define columns for the custom Table component
    const columns: TableColumn<CentralNotification>[] = [
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
            header: "Notification Type",
            render: (value, notification) => <div className="break-words">{getNotificationType(notification)}</div>,
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
                    case "announcement":
                        variant = "secondary"
                        break
                    case "reminder":
                        variant = "outline"
                        break
                }

                return <Badge variant={variant}>{notification.type}</Badge>
            },
            priority: 2, // Medium priority - show on mobile
            mobileSize: "small",
        },
        {
            key: "recipientCount",
            header: "Recipients",
            render: (value, notification) => (
                <Tooltip tooltipText="Number of users who received this notification" showTooltip={showTooltips}>
                    <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{notification.recipientCount}</span>
                    </div>
                </Tooltip>
            ),
            priority: 1, // Low priority - may hide on mobile
            mobileSize: "small",
        },
        {
            key: "readCount",
            header: "Read",
            render: (value, notification) => (
                <Tooltip tooltipText="Number of users who have read this notification" showTooltip={showTooltips}>
                    <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>
              {notification.readCount} / {notification.recipientCount}
            </span>
                    </div>
                </Tooltip>
            ),
            priority: 1, // Low-medium priority - may hide on mobile
            mobileSize: "small",
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

    const handleRowClick = (notification: CentralNotification) => {
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
