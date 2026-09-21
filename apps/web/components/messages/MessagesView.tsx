// apps/web/components/messages/MessagesView.tsx
"use client";
import { useMessagesViewModel } from "./MessagesViewModel";
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, PenSquare, Users, MessageSquare, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ComposeMessageDialog } from "./staff";
import { CallLauncher } from "@/components/calls";

// Memoized thread item component
const ThreadItem = React.memo(
  ({
    thread,
    isLoading,
    onClick,
  }: {
    thread: any;
    isLoading: boolean;
    onClick: () => void;
  }) => {
    // Use displayTitle for 1:1 threads (resolved from participant name), title for groups
    const displayName =
      thread.type === "internal"
        ? thread.displayTitle || thread.title
        : thread.participants.join(", ");
    const lastMessage = thread.messages[0]?.text || "No messages yet...";
    const isGroupChat = thread.isGroupChat;
    const isArchived = thread.status === "archived";

    return (
      <div
        className={`p-4 border-b cursor-pointer hover:bg-muted transition ${
          thread.unreadCount > 0 ? "bg-muted" : ""
        } ${isArchived ? "opacity-60" : ""}`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <h3 className="flex gap-2 items-center text-lg font-semibold">
            {thread.type === "internal" && (
              isArchived ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : isGroupChat ? (
                <Users className="w-4 h-4 text-muted-foreground" />
              ) : (
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              )
            )}
            {displayName}
            {isArchived && (
              <Badge variant="secondary" className="text-xs">Archived</Badge>
            )}
            {isLoading && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </h3>
          {thread.unreadCount > 0 && !isArchived && (
            <Badge variant="destructive">{thread.unreadCount}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{lastMessage}</p>
      </div>
    );
  },
);

ThreadItem.displayName = "ThreadItem";

// Skeleton loader for thread list
const ThreadListSkeleton = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 border-b">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    ))}
  </>
);

export function MessagesView() {
  const {
    staffThreads,
    telegramThreads,
    loading,
    isRevalidating,
    error,
    markThreadAsRead,
  } = useMessagesViewModel();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingThreadId, setLoadingThreadId] = React.useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>("staff");
  const [composeOpen, setComposeOpen] = useState(false);

  // Handle initial tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "staff" || tabParam === "patient") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleThreadClick = useCallback(
    (thread: any) => {
      // Internal threads use '_id' (which contains the UUID), telegram threads also use '_id'
      const threadId = thread._id || thread.id;
      setLoadingThreadId(threadId);
      if (thread.type === "internal") {
        markThreadAsRead(threadId, "internal");
        // Always use the thread ID (UUID) for navigation
        // Slug-based routing only works for predefined groups (All Doctors, etc.)
        router.push(`/messages/${threadId}`);
      } else {
        markThreadAsRead(threadId, "telegram");
        router.push(`/messages/${thread.chatId}`);
      }
    },
    [markThreadAsRead, router],
  );

  const handleAdminNotificationsClick = useCallback(() => {
    router.push(`/messages/admin-notifications`);
  }, [router]);

  if (error) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive p-4">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Messages</CardTitle>
          <div className="flex items-center gap-2">
            {isRevalidating && !loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
            <CallLauncher />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="staff" className="flex-1">
              Staff
              {!loading && staffThreads.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {staffThreads.reduce((sum: number, t: any) => sum + t.unreadCount, 0) ||
                    staffThreads.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patient" className="flex-1">
              Patient
              {!loading && telegramThreads.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {telegramThreads.reduce((sum, t) => sum + t.unreadCount, 0) ||
                    telegramThreads.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <>
                  {/* Admin Notifications Skeleton */}
                  <div className="p-4 bg-accent/10 border-b">
                    <Skeleton className="h-6 w-48 mb-2 bg-accent/20" />
                    <Skeleton className="h-4 w-64 bg-accent/20" />
                  </div>
                  {/* Thread List Skeleton */}
                  <ThreadListSkeleton />
                </>
              ) : (
                <>
                  {/* Compose New Message Button */}
                  <div className="p-3 border-b">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setComposeOpen(true)}
                    >
                      <PenSquare className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </div>

                  {/* Admin Notifications Thread */}
                  <div
                    className="p-4 bg-accent/10 border-b transition cursor-pointer hover:bg-accent/20"
                    onClick={handleAdminNotificationsClick}
                  >
                    <h3 className="text-lg font-semibold text-accent-foreground">
                      Admin Notifications
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      View system alerts and announcements.
                    </p>
                  </div>

                  {/* Staff Threads (groups + direct) */}
                  {staffThreads.length > 0 ? (
                    staffThreads.map((thread: any) => (
                      <ThreadItem
                        key={thread.id}
                        thread={thread}
                        isLoading={loadingThreadId === thread.id}
                        onClick={() => handleThreadClick(thread)}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No staff messages yet
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patient">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <ThreadListSkeleton />
              ) : (
                <>
                  {telegramThreads.length > 0 ? (
                    telegramThreads.map((thread: any) => (
                      <ThreadItem
                        key={thread._id}
                        thread={thread}
                        isLoading={loadingThreadId === thread._id}
                        onClick={() => handleThreadClick(thread)}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No patient messages yet
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Compose Message Dialog */}
      <ComposeMessageDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </Card>
  );
}
