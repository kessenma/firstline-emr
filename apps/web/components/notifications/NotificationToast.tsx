// apps/web/components/notifications/NotificationToast.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  hasNotificationBeenShown,
  markNotificationAsShown,
} from "@/lib/notificationStorage";

interface Notification {
  _id: string;
  message: string;
  patientId?: string;
  createdAt: string;
  read: boolean;
}

export function NotificationToast() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);
  const [showToast, setShowToast] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    let isFetching = false;

    const fetchNotifications = async () => {
      if (isFetching) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      )
        return;
      isFetching = true;
      try {
        const getWithRetry = async () => {
          let d = 200;
          for (let a = 0; a < 3; a++) {
            try {
              return await axios.get(`/api/notifications/${userId}`, {
                params: { limit: 1 },
              });
            } catch (e) {
              if (a === 2) throw e;
              await new Promise((r) => setTimeout(r, d));
              d *= 2;
            }
          }
        };
        const res: any = await getWithRetry();

        const notifications = res.data.notifications || [];
        if (notifications.length > 0) {
          const latest = notifications[0];

          // Only show toast for new unread notifications that haven't been shown before
          if (!latest.read && !hasNotificationBeenShown(latest._id)) {
            setLatestNotification(latest);
            markNotificationAsShown(latest._id);
            setShowToast(true);

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
              setShowToast(false);
            }, 5000);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        isFetching = false;
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 120000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);

  const handleToastClick = () => {
    if (latestNotification) {
      // Mark as read
      axios
        .patch(`/api/notifications/mark-read/${latestNotification._id}`)
        .catch((error) =>
          console.error("Error marking notification as read:", error),
        );

      // Navigate to patient page or notifications page
      if (latestNotification.patientId) {
        router.push(`/patient/${latestNotification.patientId}`);
      } else {
        router.push("/notifications");
      }

      setShowToast(false);
    }
  };

  return (
    <AnimatePresence>
      {showToast && latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-16 right-4 z-50 max-w-xs bg-card rounded-lg shadow-lg border border-border overflow-hidden cursor-pointer"
          onClick={handleToastClick}
        >
          <div className="flex items-start p-3">
            <div className="shrink-0 bg-primary rounded-full p-2 mr-3">
              <Bell className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">
                New Notification
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {latestNotification.message}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {new Date(latestNotification.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="h-1 w-full bg-primary">
            <motion.div
              className="h-full bg-destructive"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
