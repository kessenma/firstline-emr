"use client";

import type React from "react";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import translate from "@/utils/translate/translate";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
import type { TelegramMessage } from "./types";
import messageCache from "./messageCache";

// Detect if text contains Arabic characters
const isArabic = (text: string): boolean =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text,
  );

export const useMessageHandling = (
  telegramChatId: string,
  patientId: string,
  newMessage: string,
  setNewMessage: (message: string) => void,
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>,
  setIsLoading: (loading: boolean) => void,
  languageUsed?: string,
) => {
  const { data: session } = useSession();
  const globalContext = useGlobalContext();

  // Check if the current message has a language mismatch with the patient
  const isLanguageMismatch =
    languageUsed === "Arabic" &&
    globalContext.telegramAutoTranslateToggle &&
    newMessage.trim().length > 0 &&
    !isArabic(newMessage);

  // Translate text using the translation API
  const translateText = useCallback(
    async (text: string): Promise<string> => {
      return translate(text, languageUsed || "Arabic");
    },
    [languageUsed],
  );

  // Send a pre-translated message (text = Arabic, originalMessage = English)
  const sendWithTranslation = useCallback(
    async (translatedText: string, originalText: string) => {
      if (!translatedText || !telegramChatId) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/telegram-thread/${encodeURIComponent(telegramChatId)}/send-text`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: translatedText,
              originalMessage: originalText,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            _id: data.savedMessage._id || data.savedMessage.id,
            originalMessage: originalText,
            text: translatedText,
            sender: "You",
            timestamp: new Date(data.savedMessage.timestamp),
            isSelf: true,
            type: "text",
            mediaUrl: "",
          },
        ]);
        setNewMessage("");
        messageCache.invalidateMessages(telegramChatId);
      } catch (error) {
        console.error("Error sending translated message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [telegramChatId, setMessages, setNewMessage, setIsLoading],
  );

  // Regular send — sends message as-is without translation
  const sendMessage = useCallback(async () => {
    if (!newMessage || !telegramChatId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/telegram-thread/${encodeURIComponent(telegramChatId)}/send-text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: newMessage }),
        },
      );

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          _id: data.savedMessage._id || data.savedMessage.id,
          text: newMessage,
          sender: "You",
          timestamp: new Date(data.savedMessage.timestamp),
          isSelf: true,
          type: "text",
          mediaUrl: "",
        },
      ]);
      setNewMessage("");
      messageCache.invalidateMessages(telegramChatId);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, telegramChatId, setMessages, setNewMessage, setIsLoading]);

  return {
    sendMessage,
    sendWithTranslation,
    translateText,
    isLanguageMismatch,
  };
};
