// apps/web/components/patient-chart/telegram-messages/TelegramMessagesViewModel.tsx

"use client";

import { useState, useCallback, useEffect } from "react";
import { useMediaHandling } from "./view-model/useMediaHandling";
import { useMessageHandling } from "./view-model/useMessageHandling";
import { useMessageLoading } from "./view-model/useMessageLoading";
import { useRealtimeMessages } from "./view-model/useRealtimeMessages";
import httpPollingService from "./view-model/http-polling-service";
import type { TelegramMessage } from "./view-model/types";
import messageCache from "./view-model/messageCache";

export type { TelegramMessage } from "./view-model/types";

const useTelegramMessagesViewModel = (
  initialPatientId: string,
  initialTelegramChatId: string,
  languageUsed?: string,
  enabled: boolean = true,
) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(
    initialTelegramChatId || "",
  );
  const [patientId] = useState(initialPatientId);
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [useRealtime, setUseRealtime] = useState(true); // Toggle between SSE and polling

  // Validate and set the telegram chat ID
  useEffect(() => {
    if (!enabled) return;
    if (!initialTelegramChatId) {
      console.error("No telegram chat ID provided");
      setError("No telegram chat ID provided");
      return;
    }

    // Check if the chat ID looks valid (not just a language name or other invalid value)
    if (
      initialTelegramChatId === "English" ||
      initialTelegramChatId === "language"
    ) {
      console.error(`Invalid telegram chat ID: ${initialTelegramChatId}`);
      setError(`Invalid telegram chat ID: ${initialTelegramChatId}`);
      return;
    }

    console.log(`Setting telegram chat ID: ${initialTelegramChatId}`);
    setTelegramChatId(initialTelegramChatId);
  }, [initialTelegramChatId, enabled]);

  const { getSignedUrl, sendImage, sendAudioMessage } = useMediaHandling(
    telegramChatId,
    setMessages,
    setIsLoading,
  );

  const { sendMessage, sendWithTranslation, translateText, isLanguageMismatch } =
    useMessageHandling(
      telegramChatId,
      patientId,
      newMessage,
      setNewMessage,
      setMessages,
      setIsLoading,
      languageUsed,
    );

  const { loadMessages, threadInfo } = useMessageLoading(
    telegramChatId,
    setMessages,
    setIsLoading,
    getSignedUrl,
    setError,
  );

  // Real-time SSE connection for live updates
  const { isConnected, reconnect } = useRealtimeMessages({
    chatId: telegramChatId,
    patientId: initialPatientId,
    enabled: enabled && useRealtime && !!telegramChatId,
    onUpdate: (update) => {
      console.log(
        "[TelegramMessagesViewModel] Real-time update received:",
        update,
      );
      // Invalidate cache and reload messages when thread is updated
      if (update.operation === "UPDATE" || update.operation === "INSERT") {
        messageCache.invalidateMessages(telegramChatId);
        loadMessages(true); // Force refresh
      }
    },
    onError: (error) => {
      console.error("[TelegramMessagesViewModel] Real-time error:", error);
      // Invalidate cache on error to ensure fresh data on next load
      messageCache.invalidateMessages(telegramChatId);
      // Fallback to polling if SSE fails
      setUseRealtime(false);
    },
    onReconnect: () => {
      console.log(
        "[TelegramMessagesViewModel] Reconnecting, reloading messages",
      );
      messageCache.invalidateMessages(telegramChatId);
      loadMessages(true); // Force refresh after reconnect
    },
  });

  // Fallback to HTTP polling if real-time is disabled or fails
  useEffect(() => {
    if (!enabled) return;
    if (!useRealtime && telegramChatId) {
      console.log("[TelegramMessagesViewModel] Using HTTP polling fallback");
      const handler = (incoming: TelegramMessage) => {
        const telegramMessage: TelegramMessage = {
          _id: incoming._id?.toString() || `${Date.now()}-${Math.random()}`,
          text: incoming.text || "",
          sender: incoming.sender || "unknown",
          timestamp:
            incoming.timestamp instanceof Date
              ? incoming.timestamp
              : new Date(incoming.timestamp),
          isSelf: incoming.isSelf ?? incoming.sender === "user",
          type: incoming.type || "text",
          mediaUrl: incoming.mediaUrl,
        };
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === telegramMessage._id);
          return exists ? prev : [...prev, telegramMessage];
        });
      };
      httpPollingService.subscribeToMessages(telegramChatId, handler);
      return () => {
        httpPollingService.unsubscribeFromMessages(telegramChatId);
      };
    }
  }, [enabled, telegramChatId, useRealtime]);

  // Function to detect if text contains Arabic characters
  const hasArabicText = (text: string): boolean => {
    const arabicRegex =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
  };

  // Function to check localStorage for cached translation
  const getCachedTranslation = (text: string): string | null => {
    try {
      const cacheKey = `translation_${btoa(text)}`;
      return localStorage.getItem(cacheKey);
    } catch {
      return null;
    }
  };

  // Function to set cached translation
  const setCachedTranslation = (text: string, translatedText: string): void => {
    try {
      const cacheKey = `translation_${btoa(text)}`;
      localStorage.setItem(cacheKey, translatedText);
    } catch {
      // Ignore localStorage errors
    }
  };

  const translateMessages = useCallback(async () => {
    if (isTranslating) return { translatedCount: 0 };

    setIsTranslating(true);
    let translatedCount = 0;
    try {
      const updatedMessages = await Promise.all(
        messages.map(async (message) => {
          // Skip if already translated or empty text
          if (message.isTranslated || !message.text.trim()) {
            // If already translated, ensure it's showing the translation
            if (message.isTranslated && message.translatedText) {
              translatedCount++;
              return {
                ...message,
                showTranslated: true, // Show English translation by default
              };
            }
            return message;
          }

          // Skip if not Arabic (only translate Arabic messages)
          if (!hasArabicText(message.text)) {
            return message;
          }

          // Check client-side cache first (for backwards compatibility)
          const cached = getCachedTranslation(message.text);
          if (cached) {
            translatedCount++;
            return {
              ...message,
              translatedText: cached,
              isTranslated: true,
              showTranslated: true, // Show English translation by default
            };
          }

          try {
            const response = await fetch("/api/translate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                text: message.text,
                targetLang: "English",
              }),
            });

            if (!response.ok) {
              throw new Error("Translation failed");
            }

            const data = await response.json();
            const translatedText = data.translatedText;

            // Cache the translation
            setCachedTranslation(message.text, translatedText);
            translatedCount++;

            return {
              ...message,
              translatedText,
              isTranslated: true,
              showTranslated: true, // Show English translation by default
            };
          } catch (error) {
            console.error("Error translating message:", error);
            return message;
          }
        }),
      );

      setMessages(updatedMessages);

      // Save translations to database if any messages were translated
      if (translatedCount > 0) {
        try {
          const translationsToSave = updatedMessages
            .filter((msg) => msg.isTranslated && msg.translatedText)
            .map((msg) => ({
              id: msg._id,
              translatedText: msg.translatedText,
              isTranslated: msg.isTranslated,
              showTranslated: msg.showTranslated,
            }));

          if (translationsToSave.length > 0) {
            const saveResponse = await fetch(
              `/api/telegram-thread/${telegramChatId}/update-translations`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ translations: translationsToSave }),
              },
            );

            if (saveResponse.ok) {
              console.log("✅ Translations saved to database");
            } else {
              console.error(
                "⚠️ Failed to save translations to database:",
                await saveResponse.text(),
              );
            }
          }
        } catch (saveError) {
          console.error("⚠️ Error saving translations to database:", saveError);
          // Don't fail the whole operation if saving to DB fails
        }
      }

      return { translatedCount };
    } catch (error) {
      console.error("Error translating messages:", error);
      setError("Failed to translate messages");
      return { translatedCount: 0 };
    } finally {
      setIsTranslating(false);
    }
  }, [messages, isTranslating, telegramChatId]);

  const toggleTranslation = useCallback((messageId: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((message) =>
        message._id === messageId
          ? { ...message, showTranslated: !message.showTranslated }
          : message,
      ),
    );
  }, []);

  return {
    messages,
    newMessage,
    setNewMessage,
    setMessages,
    sendMessage,
    sendWithTranslation,
    translateText,
    isLanguageMismatch,
    sendImage,
    sendAudioMessage,
    loadMessages,
    isLoading,
    telegramChatId,
    threadInfo,
    error,
    translateMessages,
    isTranslating,
    toggleTranslation,
    isConnected, // Real-time connection status
    reconnect, // Manual reconnect function
    useRealtime, // Current mode (true = SSE, false = polling)
    setUseRealtime, // Toggle between SSE and polling
  };
};

export default useTelegramMessagesViewModel;
