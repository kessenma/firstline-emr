"use client"

import { useAdminNotifications } from "./AdminNotificationsViewModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function AdminNotificationsView() {
    const { notifications, fetchNotifications, hasMore, loading, page, totalCount } = useAdminNotifications()

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Notifications</h1>
            <p className="text-sm text-muted-foreground mb-4">Total notifications: {totalCount}</p>

            {notifications.length === 0 && !loading ? (
                <p>No notifications available.</p>
            ) : (
                <ul className="space-y-4">
                    {notifications.map((notif) => (
                        <li
                            key={notif._id}
                            className="p-4 border rounded-lg shadow-sm hover:shadow-sm transition-shadow duration-200 bg-card"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                                    {notif.type.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-foreground">{notif.message}</p>
                        </li>
                    ))}
                </ul>
            )}

            {hasMore && (
                <Button
                    onClick={() => fetchNotifications(page + 1)}
                    disabled={loading}
                    className="mt-6"
                    variant="default"
                >
                    {loading ? "Loading..." : "Load More"}
                </Button>
            )}
        </div>
    )
}
