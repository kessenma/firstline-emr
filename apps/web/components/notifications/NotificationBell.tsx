// apps/web/components/notifications/NotificationBell.tsx
"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  message: string;
  patientId?: string;
  redirectTo?: string;
  createdAt: string;
  read: boolean;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);

  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    if (isFetchingRef.current) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;
    isFetchingRef.current = true;
    setRefreshing(true);
    try {
      const getWithRetry = async () => {
        let d = 200;
        for (let a = 0; a < 3; a++) {
          try {
            return await axios.get(`/api/notifications/${userId}`, {
              params: { limit: 5 },
            });
          } catch (e) {
            if (a === 2) throw e;
            await new Promise((r) => setTimeout(r, d));
            d *= 2;
          }
        }
      };
      const res: any = await getWithRetry();
      const list: Notification[] = res.data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await axios.patch(`/api/notifications/mark-read/${notification.id}`);
        setNotifications(
          notifications.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate based on redirectTo field if present, otherwise use patientId
    if (notification.redirectTo) {
      router.push(notification.redirectTo);
    } else if (notification.patientId) {
      router.push(`/patient/${notification.patientId}`);
    }
  };

  const handleViewAllNotifications = () => {
    router.push("/notifications");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="flex absolute -top-1 -right-1 justify-center items-center p-0 w-5 h-5"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 font-medium border-b flex items-center justify-between">
          <span>Notifications</span>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => {
              const now = Date.now();
              if (now - lastRefreshRef.current < 1000) return;
              lastRefreshRef.current = now;
              fetchNotifications();
            }}
          >
            Refresh
          </Button>
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${!notification.read ? "bg-muted" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <p className="text-sm">{notification.message}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-primary">
                      {notification.redirectTo
                        ? "View dashboard"
                        : notification.patientId
                          ? "View patient"
                          : ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="p-2 text-center border-t cursor-pointer"
              onClick={handleViewAllNotifications}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
