// apps/web/components/messages/MessagesViewModel.ts
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { threadListCache } from "@/lib/messageCache";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

interface Thread {
  id?: string;
  chatId?: string;
  participants: string[];
  participantDetails?: any[];
  unreadCount: number;
  messages: Message[];
  title?: string;
  displayTitle?: string;
  type: "internal" | "telegram";
  isGroupChat?: boolean;
  slug?: string;
  lastActivity?: string | Date;
  otherParticipant?: any;
  status?: string;
}

interface CachedThreadList {
  threads: Thread[];
  timestamp: number;
}

export function useMessagesViewModel() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchThreads = async () => {
      if (!session?.user?.id) return;

      // Prevent duplicate fetches
      if (isFetchingRef.current) return;

      const cacheKey = `internal-threads-${session.user.id}`;

      // Check cache first
      const cachedData = threadListCache.get(
        cacheKey,
      ) as CachedThreadList | null;
      const isCacheFresh = threadListCache.isFresh(cacheKey);
      const isCacheStale = threadListCache.isStale(cacheKey);

      // If we have fresh cache, use it immediately
      if (cachedData && isCacheFresh) {
        setThreads(cachedData.threads);
        setLoading(false);
        setError(null);
        return;
      }

      // If we have stale cache, show it but revalidate in background
      if (cachedData && isCacheStale) {
        setThreads(cachedData.threads);
        setLoading(false);
        setIsRevalidating(true);
      } else {
        // No cache, show loading
        setLoading(true);
      }

      isFetchingRef.current = true;

      try {
        const [internalRes, telegramRes] = await Promise.all([
          fetch("/api/internal-messages"),
          fetch("/api/messages"),
        ]);

        if (!internalRes.ok || !telegramRes.ok) {
          throw new Error("Failed to fetch messages");
        }

        const internalData = await internalRes.json();
        const telegramData = await telegramRes.json();

        const internalThreads: Thread[] = (internalData.threads || []).map(
          (t: any) => ({
            id: t.id ?? t._id,
            slug: t.slug,
            participants: t.participants,
            participantDetails: t.participantDetails,
            unreadCount: t.unreadCount || 0,
            messages: t.messages || [],
            title: t.title,
            displayTitle: t.displayTitle,
            type: "internal",
            isGroupChat: t.isGroupChat === true,
            lastActivity: t.lastActivity,
            otherParticipant: t.otherParticipant,
            status: t.status,
          }),
        );

        const telegramThreads: Thread[] = (telegramData.threads || []).map(
          (t: any) => ({
            id: t.id ?? t._id,
            chatId: t.chatId,
            participants:
              t.participants?.map((p: any) => p.toString?.() ?? p) ?? [],
            unreadCount: t.unreadCount || 0,
            messages: t.messages || [],
            type: "telegram",
          }),
        );

        const merged = [...internalThreads, ...telegramThreads];
        merged.sort((a, b) => {
          const aTime =
            a.type === "internal"
              ? ((a as any).lastActivity ?? a.messages[0]?.timestamp ?? 0)
              : (a.messages[0]?.timestamp ?? 0);
          const bTime =
            b.type === "internal"
              ? ((b as any).lastActivity ?? b.messages[0]?.timestamp ?? 0)
              : (b.messages[0]?.timestamp ?? 0);
          return (
            new Date(bTime as any).getTime() - new Date(aTime as any).getTime()
          );
        });

        setThreads(merged);
        setError(null);

        // Cache the data
        threadListCache.set(cacheKey, {
          threads: merged,
          timestamp: Date.now(),
        });
      } catch (err) {
        setError("Failed to load messages. Please try again later.");
        console.error("Error fetching threads:", err);
      } finally {
        setLoading(false);
        setIsRevalidating(false);
        isFetchingRef.current = false;
      }
    };

    fetchThreads();
  }, [session]);

  const markThreadAsRead = useCallback(
    async (threadId: string, type: "internal" | "telegram") => {
      if (!session?.user?.id) return;

      try {
        const url =
          type === "internal"
            ? `/api/internal-messages/mark-read/${threadId}`
            : `/api/messages/mark-read/${threadId}`;
        await axios.post(url);

        // Optimistically update UI
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
          ),
        );

        // Update cache
        const cacheKey = `internal-threads-${session.user.id}`;
        const cachedData = threadListCache.get(
          cacheKey,
        ) as CachedThreadList | null;
        if (cachedData) {
          const updatedThreads = cachedData.threads.map((thread) =>
            thread.id === threadId ? { ...thread, unreadCount: 0 } : thread,
          );
          threadListCache.set(cacheKey, {
            threads: updatedThreads,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error marking thread as read:", error);
      }
    },
    [session?.user?.id],
  );

  // Memoize filtered threads
  const groupThreads = useMemo(
    () => threads.filter((t: any) => t.type === "internal" && t.isGroupChat),
    [threads],
  );

  const directThreads = useMemo(
    () => threads.filter((t: any) => t.type === "internal" && !t.isGroupChat),
    [threads],
  );

  // All staff threads (both group and direct) sorted by lastActivity
  const staffThreads = useMemo(
    () => threads.filter((t: any) => t.type === "internal"),
    [threads],
  );

  const telegramThreads = useMemo(
    () => threads.filter((t: any) => t.type === "telegram"),
    [threads],
  );

  return {
    threads,
    groupThreads,
    directThreads,
    staffThreads,
    telegramThreads,
    loading,
    isRevalidating,
    error,
    markThreadAsRead,
  };
}
