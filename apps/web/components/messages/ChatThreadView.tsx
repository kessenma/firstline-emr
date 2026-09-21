// apps/web/components/messages/ChatThreadView.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import useTelegramMessagesViewModel from "@/components/patient-chart/telegram-messages/TelegramMessagesViewModel";
import { TelegramMessagesView } from "@/components/patient-chart/telegram-messages/TelegramMessagesView";
import { InternalMessagesView } from "@/components/messages/InternalMessagesView";
import useInternalMessagesViewModel from "@/components/messages/InternalMessagesViewModel";

type MessageMode = "internal" | "telegram" | null;

interface ChatThreadViewProps {
  id: string;
  language?: string;
  patientDetails?: {
    firstName: string;
    lastName: string;
    id: string;
  };
  isEmbedded?: boolean;
}

export function ChatThreadView({
  id,
  language,
  patientDetails,
  isEmbedded,
}: ChatThreadViewProps) {
  const [mode, setMode] = useState<MessageMode>(null);
  const [patientId, setPatientId] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingMode, setIsLoadingMode] = useState(true);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);

  // Determine the mode (internal vs telegram) based on the ID
  useEffect(() => {
    const decideMode = async () => {
      if (!id) return;

      setIsLoadingMode(true);

      try {
        // Check if it's a MongoDB ObjectId (24 hex chars) or UUID (36 chars with dashes)
        const isObjectId = /^[a-f0-9]{24}$/i.test(id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isObjectId || isUUID) {
          // Try internal messages by ID (handles both ObjectId and UUID)
          const testInternal = await fetch(
            `/api/internal-messages/${encodeURIComponent(id)}`,
          );
          if (testInternal.ok) {
            setMode("internal");
            setIsLoadingMode(false);
            return;
          }
        } else {
          // For slugs (like "all-doctors"), try internal messages by slug
          const testSlug = await fetch(
            `/api/internal-messages/by-slug/${encodeURIComponent(id)}`,
          );
          if (testSlug.ok) {
            setMode("internal");
            setIsLoadingMode(false);
            return;
          }
        }

        // If not internal, assume it's telegram
        setMode("telegram");
      } catch (error) {
        console.error("Error determining message mode:", error);
        // Default to telegram on error
        setMode("telegram");
      } finally {
        setIsLoadingMode(false);
      }
    };

    decideMode();
  }, [id]);

  // Fetch telegram thread info if mode is telegram
  useEffect(() => {
    if (mode !== "telegram" || !id) return;

    const fetchThreadInfo = async () => {
      try {
        const res = await fetch(
          `/api/telegram-thread/${encodeURIComponent(id)}/get`,
          { credentials: "include" },
        );

        if (!res.ok) {
          console.error("Failed to fetch telegram thread info");
          return;
        }

        const data = await res.json();
        if (data?.threadInfo?.patientId) {
          setPatientId(data.threadInfo.patientId);
        }
      } catch (error) {
        console.error("Failed to fetch telegram thread info:", error);
      }
    };

    fetchThreadInfo();
  }, [id, mode]);

  // Initialize ViewModels - they handle their own loading states
  const internalVM = useInternalMessagesViewModel(id, mode === "internal");
  const telegramVM = useTelegramMessagesViewModel(
    patientId,
    id,
    language,
    mode === "telegram",
  );

  // Load telegram messages when mode is confirmed
  useEffect(() => {
    if (mode === "telegram" && id) {
      setIsTelegramLoading(true);
      telegramVM.loadMessages().finally(() => setIsTelegramLoading(false));
    }
  }, [mode, id, telegramVM.loadMessages]);

  // While determining mode, render the appropriate view with loading state
  // The views will show their own skeleton loaders
  if (isLoadingMode || !mode) {
    // Assume internal for now - it will show skeleton loader
    return (
      <InternalMessagesView
        scrollAreaRef={scrollAreaRef}
        threadId={id}
        messages={[]}
        newMessage=""
        setNewMessage={() => {}}
        sendMessage={() => {}}
        sendImage={() => {}}
        sendAudioMessage={() => {}}
        sendDocument={() => {}}
        isLoading={true}
        isSending={false}
        isRevalidating={false}
        threadInfo={undefined}
      />
    );
  }

  // Render Internal Messages View (staff-to-staff communication)
  if (mode === "internal") {
    return (
      <InternalMessagesView
        scrollAreaRef={scrollAreaRef}
        threadId={id}
        messages={internalVM.messages}
        newMessage={internalVM.newMessage}
        setNewMessage={internalVM.setNewMessage}
        sendMessage={internalVM.sendMessage}
        sendImage={internalVM.sendImage}
        sendAudioMessage={internalVM.sendAudioMessage}
        sendDocument={internalVM.sendDocument}
        onSendPatientCard={internalVM.sendPatientCard}
        isLoading={internalVM.isLoading}
        isSending={internalVM.isSending}
        isRevalidating={internalVM.isRevalidating}
        threadInfo={internalVM.threadInfo}
        onThreadInfoUpdate={internalVM.setThreadInfo}
      />
    );
  }

  // Render Telegram Messages View (patient-to-staff communication)
  return (
    <TelegramMessagesView
      scrollAreaRef={scrollAreaRef}
      telegramChatId={id}
      messages={telegramVM!.messages}
      setMessages={telegramVM!.setMessages}
      newMessage={telegramVM!.newMessage}
      setNewMessage={telegramVM!.setNewMessage}
      sendMessage={telegramVM!.sendMessage}
      sendImage={telegramVM!.sendImage}
      sendAudioMessage={telegramVM!.sendAudioMessage}
      isLoading={telegramVM!.isLoading}
      isLoadingMessages={isLoadingMode || isTelegramLoading}
      translateMessages={telegramVM!.translateMessages}
      isTranslating={telegramVM!.isTranslating}
      toggleTranslation={telegramVM!.toggleTranslation}
      patientDetails={patientDetails}
      isEmbedded={isEmbedded}
    />
  );
}
