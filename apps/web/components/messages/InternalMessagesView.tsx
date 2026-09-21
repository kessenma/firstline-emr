// apps/web/components/messages/InternalMessagesView.tsx
"use client";

import React, { useMemo, useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { InternalMessageList } from "./InternalMessageList";
import { InternalMessageInput } from "./InternalMessageInput";
import { InternalChatHeader } from "./InternalChatHeader";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

interface InternalMessage {
  _id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  isSelf: boolean;
  type: "text" | "image" | "audio";
  mediaUrl?: string;
  signedUrl?: string;
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
  status?: string;
}

interface Props {
  scrollAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  threadId: string;
  messages: any[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  sendMessage: () => void;
  sendImage: (file: File) => void;
  sendAudioMessage: (file: Blob, duration: number) => void;
  sendDocument: (file: File) => void;
  onSendPatientCard?: (patient: any) => void;
  isLoading: boolean;
  isSending?: boolean;
  isRevalidating?: boolean;
  threadInfo?: ThreadInfo;
  onThreadInfoUpdate?: (newThreadInfo: ThreadInfo) => void;
}

export function InternalMessagesView({
  scrollAreaRef,
  threadId,
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
  sendImage,
  sendAudioMessage,
  sendDocument,
  onSendPatientCard,
  isLoading,
  isSending = false,
  isRevalidating = false,
  threadInfo,
  onThreadInfoUpdate,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  // Determine if this is a system group that can't be left
  const isSystemGroup = useMemo(() => {
    const title = threadInfo?.title || "";
    return (
      ["All Doctors", "All Triage", "All Triage and Doctors"].includes(title) ||
      title.startsWith("Specialty: ")
    );
  }, [threadInfo?.title]);

  // Handle leaving a thread
  const handleLeaveThread = useCallback(async () => {
    if (!threadId) return;

    const confirmed = window.confirm(
      "Are you sure you want to leave this thread? You will no longer see new messages.",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/internal-messages/${encodeURIComponent(threadId)}/leave`,
        { method: "POST", credentials: "include" },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to leave thread");
        return;
      }

      router.push("/messages");
    } catch {
      alert("Failed to leave thread");
    }
  }, [threadId, router]);

  // Handle adding participants to the thread
  const handleAddParticipants = useCallback(async (
    userIds: string[],
    options: { historyOption: "none" | "days" | "all"; historyDays?: number }
  ) => {
    if (!threadId || userIds.length === 0) return;

    const res = await fetch(`/api/internal-messages/${encodeURIComponent(threadId)}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        participantIds: userIds,
        historyOption: options.historyOption,
        historyDays: options.historyDays,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add participants");
    }

    const data = await res.json();

    // Update thread info with new participants
    if (onThreadInfoUpdate && data.thread?.participants) {
      onThreadInfoUpdate({
        ...threadInfo,
        participants: data.thread.participants,
      });
    }
  }, [threadId, threadInfo, onThreadInfoUpdate]);

  // Memoize normalized messages to prevent unnecessary recalculations
  const normalizedMessages: InternalMessage[] = useMemo(() => {
    console.log(
      "[InternalMessagesView] Processing messages:",
      messages?.length,
    );
    return (messages || []).map((m: any) => {
      const normalized = {
        _id: m._id,
        text: m.text,
        sender: m.sender,
        senderId: m.senderId,
        timestamp: new Date(m.timestamp),
        isSelf: String(m.senderId) === String(session?.user?.id),
        type: m.type || "text",
        mediaUrl: m.mediaUrl,
        signedUrl: m.signedUrl,
      };

      if (m.type === "image" || m.type === "audio") {
        console.log(`[InternalMessagesView] Media message ${m._id}:`, {
          type: m.type,
          mediaUrl: m.mediaUrl,
          signedUrl: m.signedUrl,
        });
      }

      return normalized;
    });
  }, [messages, session?.user?.id]);

  // Memoize handlers
  const handleBack = useCallback(() => {
    router.push("/messages");
  }, [router]);

  const participantCount = threadInfo?.participants?.length || 0;
  const threadTitle = threadInfo?.title || "Group Messages";

  return (
    <Card className="w-full max-w-5xl mx-auto h-[75vh] flex flex-col bg-background shadow-lg">
      <CardHeader className="p-0">
        <InternalChatHeader
          threadTitle={threadTitle}
          participantCount={participantCount}
          isRevalidating={isRevalidating}
          isLoading={isLoading}
          threadInfo={threadInfo}
          onBack={handleBack}
          onAddParticipants={handleAddParticipants}
          onLeaveThread={handleLeaveThread}
          isSystemGroup={isSystemGroup}
        />
      </CardHeader>

      {/* Messages Section */}
      <CardContent className="overflow-hidden grow p-0">
        <InternalMessageList
          messages={normalizedMessages}
          isLoadingMessages={isLoading}
          isSending={isSending}
          scrollAreaRef={scrollAreaRef}
          threadInfo={threadInfo}
          currentUserId={String(session?.user?.id || "")}
          threadId={threadId}
        />
      </CardContent>

      {/* Input Section */}
      <CardFooter className="p-3 border-t">
        {threadInfo?.status === "archived" ? (
          <div className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            This thread has been archived and is read-only.
          </div>
        ) : (
          <InternalMessageInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendMessage={sendMessage}
            sendImage={sendImage}
            sendAudioMessage={sendAudioMessage}
            sendDocument={sendDocument}
            onSendPatientCard={onSendPatientCard}
            isLoading={isSending}
            threadId={threadId}
          />
        )}
      </CardFooter>
    </Card>
  );
}
