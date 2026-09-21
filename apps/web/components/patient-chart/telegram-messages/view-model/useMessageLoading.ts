// apps/web/components/patient-chart/telegram-messages/view-model/useMessageLoading.ts
"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import translate from "@/utils/translate/translate";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
import type { TelegramMessage } from "./types";
import messageCache from "./messageCache";

interface ThreadInfo {
  patientId?: string;
  patient?: {
    firstName: string;
    lastName: string;
    email: string;
    telegramChatId: string;
  };
  participants?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
  }>;
  unreadCount?: number;
  status?: string;
}

export const useMessageLoading = (
  telegramChatId: string,
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>,
  setIsLoading: (loading: boolean) => void,
  getSignedUrl: (filePath: string) => Promise<string | null>,
  setError: (error: string | null) => void,
) => {
  const { data: session } = useSession();
  const globalContext = useGlobalContext();
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);

  const loadMessages = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!telegramChatId) {
        console.error("Telegram Chat ID is missing.");
        return [];
      }

      // Skip if the chat ID is invalid
      if (telegramChatId === "English" || telegramChatId === "language") {
        console.error(`Invalid telegram chat ID: ${telegramChatId}`);
        return [];
      }

      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cached = messageCache.getMessages(telegramChatId);
        if (cached) {
          console.log(`Using cached messages for chat ID: ${telegramChatId}`);
          setMessages(cached.messages);
          if (cached.threadInfo) {
            setThreadInfo(cached.threadInfo);
          }
          return cached.messages;
        }
      }

      setIsLoading(true);
      try {
        console.log(`Fetching messages for chat ID: ${telegramChatId}`);

        // Make sure the URL is properly encoded
        const encodedChatId = encodeURIComponent(telegramChatId);
        const url = `/api/telegram-thread/${encodedChatId}/get`;
        console.log(`API URL: ${url}`);

        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          console.error(`API error: ${response.status} ${response.statusText}`);
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          "API response received:",
          data ? "Data received" : "No data",
        );

        // Store thread info if available
        if (data.threadInfo) {
          console.log("Thread info received:", data.threadInfo);
          setThreadInfo(data.threadInfo);
        }

        if (!data.messages || !Array.isArray(data.messages)) {
          console.error("Invalid messages data:", data);
          return [];
        }

        console.log(`Processing ${data.messages.length} messages`);

        const formattedMessages: TelegramMessage[] = await Promise.all(
          data.messages.map(async (message: any) => {
            let signedUrl;
            if (message.type === "image" || message.type === "audio") {
              signedUrl = await getSignedUrl(message.mediaUrl);
            }

            if (
              globalContext.autoTranslateLang !== "Disabled" &&
              globalContext.telegramAutoTranslateToggle &&
              message.type === "text" &&
              /^(https?:\/\/[^\s]+)\s*--\s*(.+)$/.test(message.text) === false
            ) {
              if (message.originalMessage) {
                message.text = await translate(
                  message.originalMessage,
                  globalContext.autoTranslateLang,
                );
              } else {
                var messagePart = "";
                var namePart = "";
                message.originalMessage = message.text;
                if (message.text.includes("--")) {
                  var messageArray: string[] = message.text.split("--");
                  namePart = messageArray[messageArray.length - 1];
                  messagePart = messageArray
                    .slice(0, messageArray.length - 1)
                    .join("--");
                  messagePart = await translate(
                    messagePart,
                    globalContext.autoTranslateLang,
                  );
                  message.text = messagePart + "\n-- " + namePart;
                } else {
                  messagePart = message.text;
                  message.text = await translate(
                    message.text,
                    globalContext.autoTranslateLang,
                  );
                }
                message.text = await translate(
                  message.text,
                  globalContext.autoTranslateLang,
                );
              }
            } else {
              if (message.originalMessage) {
                message.text = message.originalMessage;
              }
            }

            return {
              _id: message._id,
              text: message.text,
              originalMessage: message.originalMessage,
              sender: message.sender,
              timestamp: new Date(message.timestamp),
              isSelf:
                message.sender ===
                `${session?.user?.firstName} ${session?.user?.lastName}`,
              type: message.type,
              mediaUrl: message.mediaUrl,
              encryptedMedia: message.encryptedMedia,
              encryptionKey: message.encryptionKey,
              signedUrl: signedUrl,
            };
          }),
        );

        console.log(`Formatted ${formattedMessages.length} messages`);
        setMessages(formattedMessages);

        // Cache the messages and thread info
        messageCache.setMessages(telegramChatId, {
          messages: formattedMessages,
          threadInfo: data.threadInfo,
        });

        return formattedMessages;
      } catch (error) {
        console.error("Error loading messages:", error);
        setError("Failed to load messages");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [
      telegramChatId,
      getSignedUrl,
      session,
      globalContext.autoTranslateLang,
      globalContext.telegramAutoTranslateToggle,
      setMessages,
      setIsLoading,
    ],
  );

  return {
    loadMessages,
    threadInfo,
  };
};
