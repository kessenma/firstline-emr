// apps/web/components/messages/InternalMessagesViewModel.ts
"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { internalMessageCache } from "@/lib/messageCache";
import { useMediaHandling } from "./useMediaHandling";
import { useInternalMediaManager } from "./useInternalMediaManager";
import { buildPatientCardPayload, serializePatientCard } from "@fajr/shared/patient-share";

interface Message {
  _id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string | Date;
  type?: "text" | "image" | "audio" | "file";
  mediaUrl?: string;
  signedUrl?: string;
  isSelf?: boolean;
}

interface Participant {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
  accountType?: string;
  doctorSpecialty?: string[];
}

interface ThreadInfo {
  title?: string;
  participants?: Participant[];
  _id?: string;
  status?: string;
}

interface ThreadData {
  messages: Message[];
  threadInfo: ThreadInfo;
  resolvedId: string | null;
}

export default function useInternalMessagesViewModel(
  threadId: string,
  shouldFetch: boolean = true,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | undefined>(
    undefined,
  );
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Use ref to track if we're currently sending to prevent duplicate sends
  const isSendingRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Media handling hook - uses isSending state to show optimistic UI
  const { getSignedUrl, sendImage, sendAudioMessage, sendDocument } =
    useMediaHandling(resolvedId || threadId, setMessages, setIsSending);

  // Media manager hook - fetches signed URLs for media messages when loading
  const { signedUrls, isLoadingMedia } = useInternalMediaManager(
    messages,
    setMessages,
  );

  // Real-time WebSocket updates removed

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      setError("No thread ID provided");
      return;
    }

    // Prevent duplicate loads
    if (isLoadingRef.current) {
      return;
    }

    const cacheKey = `internal-thread-${threadId}`;

    // Check cache first
    const cachedData = internalMessageCache.get(cacheKey) as ThreadData | null;
    const isCacheFresh = internalMessageCache.isFresh(cacheKey);
    const isCacheStale = internalMessageCache.isStale(cacheKey);

    // If we have fresh cache, use it immediately
    if (cachedData && isCacheFresh) {
      setMessages(cachedData.messages);
      setThreadInfo(cachedData.threadInfo);
      setResolvedId(cachedData.resolvedId);
      setError(null);
      return;
    }

    // If we have stale cache, show it but revalidate in background
    if (cachedData && isCacheStale) {
      setMessages(cachedData.messages);
      setThreadInfo(cachedData.threadInfo);
      setResolvedId(cachedData.resolvedId);
      setIsRevalidating(true);
    } else {
      // No cache, show loading
      setIsLoading(true);
    }

    isLoadingRef.current = true;
    setError(null);

    try {
      // Determine if threadId is an ObjectId, UUID, or a slug
      const isObjectId = /^[a-f0-9]{24}$/i.test(threadId);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId);
      const url = (isObjectId || isUUID)
        ? `/api/internal-messages/${encodeURIComponent(threadId)}`
        : `/api/internal-messages/by-slug/${encodeURIComponent(threadId)}`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Thread not found");
        } else if (res.status === 403) {
          throw new Error("You don't have permission to view this thread");
        } else if (res.status === 401) {
          throw new Error("Please log in to view this thread");
        } else {
          throw new Error("Failed to load messages");
        }
      }

      const data = await res.json();

      // Don't fetch signed URLs here - let useInternalMediaManager handle it
      const threadData: ThreadData = {
        messages: data.thread?.messages || [],
        threadInfo: {
          title: data.thread?.title,
          participants: data.thread?.participants,
          _id: data.thread?._id,
          status: data.thread?.status,
        },
        resolvedId: data.thread?._id || null,
      };

      // Update state
      setMessages(threadData.messages);
      setThreadInfo(threadData.threadInfo);
      setResolvedId(threadData.resolvedId);
      setError(null);

      // Cache the data
      internalMessageCache.set(cacheKey, threadData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load messages";
      setError(errorMessage);
      console.error("Error loading internal messages:", err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
      isLoadingRef.current = false;
    }
  }, [threadId]);

  const sendMessage = useCallback(async () => {
    if (!threadId || !newMessage.trim()) {
      return;
    }

    // Prevent duplicate sends
    if (isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setError(null);

    try {
      // Use resolvedId if available and valid (ObjectId or UUID), otherwise use threadId
      const isResolvedObjectId = resolvedId && /^[a-f0-9]{24}$/i.test(resolvedId);
      const isResolvedUUID = resolvedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId);
      const targetId = (isResolvedObjectId || isResolvedUUID)
        ? resolvedId
        : threadId;

      const res = await fetch(
        `/api/internal-messages/${encodeURIComponent(targetId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ text: newMessage.trim() }),
        },
      );

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Thread not found");
        } else if (res.status === 403) {
          throw new Error(
            "You don't have permission to send messages in this thread",
          );
        } else if (res.status === 401) {
          throw new Error("Please log in to send messages");
        } else {
          throw new Error("Failed to send message");
        }
      }

      const msg = await res.json();

      // Add the new message to the list
      const updatedMessages = [...messages, msg];
      setMessages(updatedMessages);

      // Update cache with new message
      const cacheKey = `internal-thread-${threadId}`;
      const cachedData = internalMessageCache.get(
        cacheKey,
      ) as ThreadData | null;
      if (cachedData) {
        internalMessageCache.set(cacheKey, {
          ...cachedData,
          messages: updatedMessages,
        });
      }

      // Invalidate thread list cache since unread counts may have changed
      internalMessageCache.invalidatePattern(/^internal-threads-/);

      // Clear the input
      setNewMessage("");
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      console.error("Error sending internal message:", err);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  }, [threadId, newMessage, resolvedId, messages]);

  const sendPatientCard = useCallback(async (patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    status: string | null;
    priority: string | null;
    specialties: string[] | null;
    hospital: string | null;
    chiefComplaint: string | null;
    diagnosis: string | null;
  }) => {
    if (!threadId) return;
    if (isSendingRef.current) return;

    const cardPayload = buildPatientCardPayload(patient);
    if (!cardPayload) {
      setError("Patient data is incomplete — cannot send card");
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setError(null);

    try {
      const isResolvedObjectId = resolvedId && /^[a-f0-9]{24}$/i.test(resolvedId);
      const isResolvedUUID = resolvedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId);
      const targetId = (isResolvedObjectId || isResolvedUUID)
        ? resolvedId
        : threadId;

      const cardData = serializePatientCard(cardPayload);

      const res = await fetch(
        `/api/internal-messages/${encodeURIComponent(targetId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: cardData, type: "patient-card" }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to send patient card");
      }

      const msg = await res.json();
      const updatedMessages = [...messages, msg];
      setMessages(updatedMessages);

      const cacheKey = `internal-thread-${threadId}`;
      const cachedData = internalMessageCache.get(cacheKey) as ThreadData | null;
      if (cachedData) {
        internalMessageCache.set(cacheKey, { ...cachedData, messages: updatedMessages });
      }
      internalMessageCache.invalidatePattern(/^internal-threads-/);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send patient card";
      setError(errorMessage);
      console.error("Error sending patient card:", err);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  }, [threadId, resolvedId, messages]);

  // Auto-load messages when threadId changes
  useEffect(() => {
    if (threadId && shouldFetch) {
      loadMessages();
    }
  }, [threadId, loadMessages, shouldFetch]);

  return {
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    sendMessage,
    sendPatientCard,
    sendImage,
    sendAudioMessage,
    sendDocument,
    loadMessages,
    isLoading,
    isSending,
    isRevalidating,
    error,
    threadInfo,
    setThreadInfo,
  };
}
