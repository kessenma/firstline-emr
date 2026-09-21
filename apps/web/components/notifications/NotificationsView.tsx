// apps/web/components/notifications/NotificationsView.tsx
"use client";
import { useState, useMemo } from "react";
import { ClimbingBoxLoader } from "react-spinners";
import {
  useNotificationsViewModel,
  type Notification,
} from "./NotificationsViewModel";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationModals } from "@/components/notification-modals/NotificationModalRouter";
import {
  Check,
  Eye,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  UserX,
  UserCog,
  FileText,
  Settings,
  UserPlus,
  HeartMinus,
  List,
  ListCollapse,
  ListChecks,
  Bell,
  CheckCircle2,
  Megaphone,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "all" | "unread" | "read" | "admin";

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "announcement":
      return Megaphone;
    case "reminder":
      return Bell;
    case "alert":
      return AlertTriangle;
    case "profile_update_approved":
      return UserCheck;
    case "profile_update_denied":
      return UserX;
    case "profile_update_request":
      return UserCog;
    case "patient_update":
      return FileText;
    case "system_notification":
      return Settings;
    case "new_user_signup":
      return UserPlus;
    case "specialty_no_doctors":
      return HeartMinus;
    case "message":
    default:
      return MessageSquare;
  }
};

export function NotificationsView() {
  const { getModalHandler, modals } = useNotificationModals();
  const {
    notificationsPages,
    loadMoreRef,
    isFetchingNextPage,
    isLoading,
    handleNotificationClick,
    handleMarkAllAsRead,
    isMarkingAllAsRead,
  } = useNotificationsViewModel();

  const { unreadCount } = useUnreadNotificationCount();
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return notificationsPages.filter((n) => !n.read);
      case "read":
        return notificationsPages.filter((n) => n.read);
      case "admin":
        return notificationsPages.filter((n) => !!n.isAdminNotification);
      default:
        return notificationsPages;
    }
  }, [notificationsPages, activeTab]);

  // Counts for tab badges
  const localUnreadCount = useMemo(
    () => notificationsPages.filter((n) => !n.read).length,
    [notificationsPages],
  );
  const readCount = useMemo(
    () => notificationsPages.filter((n) => n.read).length,
    [notificationsPages],
  );

  const handleNotificationClickWrapper = (notification: Notification) => {
    const modalHandler = getModalHandler(notification);
    handleNotificationClick(notification, modalHandler ?? undefined);
  };

  // Empty state per tab
  const renderEmptyState = () => {
    if (activeTab === "unread") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            All caught up!
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            You have no unread notifications. Great job staying on top of
            things.
          </p>
        </div>
      );
    }
    if (activeTab === "admin") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No admin notifications
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Admin notifications will appear here when there are items requiring your attention.
          </p>
        </div>
      );
    }
    if (activeTab === "read") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No read notifications
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Notifications you&apos;ve already viewed will appear here.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No notifications yet
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You&apos;ll see notifications about appointments, messages, and
          important updates here.
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-12">
        <h2 className="text-2xl font-bold mb-4 border-b border-border">
          Your Notifications
        </h2>
        <div className="relative">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-border pb-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex justify-center items-center bg-background/70">
            <ClimbingBoxLoader color={"#000000"} size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-24 h-[calc(100vh-8rem)]">
      {/* Header: Title + Mark all read */}
      <div className="sticky top-0 bg-background z-50 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold">Your Notifications</h2>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
              variant="ghost"
              size="sm"
              className="gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full px-4"
            >
              {isMarkingAllAsRead ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Marking...</span>
                </>
              ) : (
                <>
                  <ListChecks className="h-4 w-4" />
                  <span>Mark all read</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="flex-1"
          >
            <TabsList variant="underline" className="w-full justify-start gap-0">
              <TabsTrigger
                value="all"
                variant="underline"
                className="gap-2 px-4"
              >
                <List className="h-4 w-4" />
                <span>All</span>
                <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {notificationsPages.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                variant="underline"
                className="gap-2 px-4"
              >
                <ListCollapse className="h-4 w-4" />
                <span>Unread</span>
                {(unreadCount || localUnreadCount) > 0 && (
                  <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {unreadCount || localUnreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="read"
                variant="underline"
                className="gap-2 px-4"
              >
                <ListChecks className="h-4 w-4" />
                <span>Read</span>
                {readCount > 0 && (
                  <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {readCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            onClick={() => setActiveTab(activeTab === "admin" ? "all" : "admin")}
            className={`ml-2 p-1.5 rounded-md border transition-colors ${
              activeTab === "admin"
                ? "border-amber-500 bg-amber-500/10 text-amber-500"
                : "border-amber-500/50 text-amber-500/70 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5"
            }`}
            title="Admin notifications"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      {filteredNotifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollArea className="h-[calc(100vh-18rem)]">
          <AnimatePresence mode="popLayout">
            <div>
              {filteredNotifications.map((notification: Notification) => {
                const Icon = getNotificationIcon(notification.type);
                const isAdminNotif = !!notification.isAdminNotification;
                const accentClass = isAdminNotif ? "text-amber-500" : "text-primary";
                const borderClass = isAdminNotif
                  ? "border-l-4 border-l-amber-500 border-b-border"
                  : "border-l-4 border-l-primary border-b-border";
                return (
                  <motion.div
                    key={notification._id}
                    layout
                    initial={{ opacity: 1 }}
                    animate={{
                      opacity: 1,
                      backgroundColor: notification.read
                        ? "transparent"
                        : "var(--accent-background)",
                    }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      layout: { duration: 0.3, ease: "easeInOut" },
                      backgroundColor: { duration: 0.4, ease: "easeInOut" },
                      opacity: { duration: 0.2 },
                    }}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      isAdminNotif
                        ? borderClass
                        : !notification.read
                          ? borderClass
                          : "border-border"
                    }`}
                    onClick={() =>
                      handleNotificationClickWrapper(notification)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                        <div
                          className={
                            isAdminNotif || !notification.read
                              ? accentClass
                              : "text-muted-foreground"
                          }
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <motion.div
                          className={
                            isAdminNotif || !notification.read
                              ? accentClass
                              : "text-muted-foreground"
                          }
                          animate={{
                            scale: notification.read ? [1, 1.2, 1] : 1,
                            rotate: notification.read ? [0, 10, -10, 0] : 0,
                          }}
                          transition={{
                            duration: 0.5,
                            ease: "easeInOut",
                          }}
                        >
                          {notification.read ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </motion.div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <motion.p
                          className={`text-lg ${
                            isAdminNotif || !notification.read
                              ? "font-semibold text-foreground"
                              : "font-normal text-muted-foreground"
                          }`}
                          animate={{
                            opacity: notification.read && !isAdminNotif ? 0.7 : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {notification.message}
                        </motion.p>
                        <div className="flex justify-between items-center mt-2">
                          <small className="text-muted-foreground">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleString()}
                          </small>
                          {isAdminNotif && (
                            <span className="text-sm text-amber-500">
                              {notification.actionUrl ? "View details" : "Admin notification"}
                            </span>
                          )}
                          {!isAdminNotif && notification.patientId &&
                            notification.type !== "specialty_no_doctors" && (
                              <span className="text-sm text-primary">
                                View patient
                              </span>
                            )}
                          {notification.type === "specialty_no_doctors" && (
                            <span className="text-sm text-primary">
                              View unassigned patient
                            </span>
                          )}
                          {(notification.redirectTo ===
                            "/admin/new-signups" ||
                            notification.type === "new_user_signup") && (
                            <span className="text-sm text-primary">
                              Review signups
                            </span>
                          )}
                          {notification.type ===
                            "profile_update_approved" && (
                            <span className="text-sm text-primary">
                              Get started
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={loadMoreRef} style={{ height: 20 }} />
              {isFetchingNextPage && (
                <div className="py-4 flex justify-center">
                  <ClimbingBoxLoader color={"#000000"} size={15} />
                </div>
              )}
            </div>
          </AnimatePresence>
        </ScrollArea>
      )}

      {/* Notification modals (signups, unassigned patient, onboarding) */}
      {modals}
    </div>
  );
}
