// apps/web/components/messages/InternalMessageList.tsx
"use client";

import type React from "react";
import { useMemo, memo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Loader2, FileText, Download } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { AudioNotePlayer } from "./AudioNotePlayer";
import { Button } from "@/components/ui/button";
import { PatientCardMessage } from "./PatientCardMessage";
import { CallSummaryMessage } from "./CallSummaryMessage";
import { LeadRequestMessage } from "./LeadRequestMessage";

interface InternalMessage {
  _id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  isSelf: boolean;
  type:
    | "text"
    | "image"
    | "audio"
    | "file"
    | "patient-card"
    | "lead-request"
    | "call-summary";
  mediaUrl?: string;
  signedUrl?: string;
  fileName?: string;
}

interface InternalMessageListProps {
  messages: InternalMessage[];
  isLoadingMessages: boolean;
  isSending?: boolean;
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>;
  threadInfo?: {
    title?: string;
    participants?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      image?: string;
      accountType?: string;
      doctorSpecialty?: string[];
    }[];
  };
  currentUserId?: string;
  threadId?: string;
  onMessageUpdate?: () => void;
}

// Memoized individual message component
const InternalMessageItem = memo(
  ({
    message,
    avatarContent,
    participant,
    currentUserId,
    threadId,
    onMessageUpdate,
  }: {
    message: InternalMessage;
    avatarContent: string;
    participant?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      image?: string;
      accountType?: string;
      doctorSpecialty?: string[];
    };
    currentUserId?: string;
    threadId?: string;
    onMessageUpdate?: () => void;
  }) => {
    const displayName = participant
      ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim() ||
        participant.email ||
        "Unknown User"
      : "Unknown User";

    const avatarElement = (
      <Avatar
        initials={avatarContent}
        className="!h-6 !w-6 shrink-0 self-end"
      />
    );

    return (
      <div
        className={`flex items-end gap-2 ${message.isSelf ? "flex-row-reverse self-end" : "self-start"}`}
      >
        {participant ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="focus:outline-hidden cursor-pointer">
                {avatarElement}
              </button>
            </PopoverTrigger>
            <PopoverContent sideOffset={6} className="w-64">
              <div className="space-y-1">
                <div className="text-sm font-semibold">{displayName}</div>
                {participant.email && (
                  <div className="text-xs text-muted-foreground">
                    {participant.email}
                  </div>
                )}
                {participant.accountType && (
                  <div className="text-xs">
                    <span className="font-medium">Role:</span>{" "}
                    {participant.accountType}
                  </div>
                )}
                {Array.isArray(participant.doctorSpecialty) &&
                  participant.doctorSpecialty.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Specialties:</span>{" "}
                      {participant.doctorSpecialty.join(", ")}
                    </div>
                  )}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          avatarElement
        )}
        <div
          className={`rounded-2xl p-3 ${
            message.isSelf
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          } w-full max-w-xs md:max-w-sm`}
        >
          {message.type === "image" ? (
            <div>
              {message.signedUrl ? (
                <Image
                  src={message.signedUrl}
                  alt={message.text || "Image"}
                  width={300}
                  height={200}
                  className="rounded-lg max-w-full h-auto"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {message.text || "Uploading image..."}
                  </span>
                </div>
              )}
            </div>
          ) : message.type === "audio" ? (
            <div>
              {message.signedUrl ? (
                <AudioNotePlayer mediaUrl={message.signedUrl} />
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {message.text || "Uploading audio..."}
                  </span>
                </div>
              )}
            </div>
          ) : message.type === "file" ? (
            <div>
              {message.signedUrl ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {message.text || message.fileName || "Document"}
                    </p>
                    <p className="text-xs text-muted-foreground">Click to download</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = message.signedUrl!;
                      link.download =
                        message.text || message.fileName || "document";
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {message.text || "Uploading document..."}
                  </span>
                </div>
              )}
            </div>
          ) : message.type === "call-summary" ? (
            <CallSummaryMessage
              messageText={message.text}
              isSelf={message.isSelf}
            />
          ) : message.type === "patient-card" ? (
            <PatientCardMessage
              messageText={message.text}
              isSelf={message.isSelf}
            />
          ) : message.type === "lead-request" ? (
            <LeadRequestMessage
              messageText={message.text}
              isSelf={message.isSelf}
              currentUserId={currentUserId || ""}
              messageId={message._id}
              threadId={threadId || ""}
              onStatusUpdate={onMessageUpdate}
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </div>
          )}
          <p className="text-xs opacity-70 mt-1 text-center text-muted-foreground">
            {new Date(message.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    );
  },
);

InternalMessageItem.displayName = "InternalMessageItem";

// Skeleton loader for internal messages
const InternalMessagesSkeleton = () => (
  <div className="flex flex-col gap-3 p-2 md:p-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse self-end" : "self-start"}`}
      >
        <Skeleton className="!h-6 !w-6 rounded-full shrink-0 bg-muted self-end" />
        <div className="w-full max-w-xs md:max-w-sm">
          <Skeleton
            className={`h-20 rounded-2xl bg-muted`}
          />
        </div>
      </div>
    ))}
  </div>
);

export const InternalMessageList: React.FC<InternalMessageListProps> = ({
  messages,
  isLoadingMessages,
  isSending = false,
  scrollAreaRef,
  threadInfo,
  currentUserId,
  threadId,
  onMessageUpdate,
}): React.ReactElement => {
  // Memoize the getAvatarContent function to prevent unnecessary recalculations
  const getAvatarContent = useCallback(
    (message: InternalMessage): string => {
      // PRIORITY 1: Match by senderId for accurate participant lookup from database
      if (threadInfo?.participants && message.senderId) {
        // Convert both to strings for comparison
        const messageSenderId = String(message.senderId);

        const participant = threadInfo.participants.find(
          (p) => String(p._id) === messageSenderId,
        );

        if (participant) {
          // Best case: both first and last name available
          if (participant.firstName && participant.lastName) {
            const initials = `${participant.firstName[0].toUpperCase()}${participant.lastName[0].toUpperCase()}`;
            return initials;
          }

          // Second best: just first name
          if (participant.firstName) {
            return participant.firstName[0].toUpperCase();
          }

          // Third: use email
          if (participant.email) {
            return participant.email[0].toUpperCase();
          }
        }
      }

      // FALLBACK 2: Parse sender string if no participant match
      if (
        message.sender &&
        message.sender.trim().length > 0 &&
        message.sender !== "Unknown"
      ) {
        const senderParts = message.sender.trim().split(" ");
        if (senderParts.length >= 2) {
          const initials = `${senderParts[0][0].toUpperCase()}${senderParts[senderParts.length - 1][0].toUpperCase()}`;
          return initials;
        }
        return message.sender.trim()[0].toUpperCase();
      }

      return "U";
    },
    [threadInfo?.participants],
  );

  // Memoize the rendered messages
  const renderedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        // Generate a unique key if _id is missing
        const key =
          message._id || `message-${index}-${message.timestamp.getTime()}`;
        const avatarContent = getAvatarContent(message);

        // Find participant for this message
        const participant = threadInfo?.participants?.find(
          (p) => String(p._id) === String(message.senderId),
        );

        return (
          <InternalMessageItem
            key={key}
            message={message}
            avatarContent={avatarContent}
            participant={participant}
            currentUserId={currentUserId}
            threadId={threadId}
            onMessageUpdate={onMessageUpdate}
          />
        );
      }),
    [messages, getAvatarContent, threadInfo?.participants],
  );

  return (
    <ScrollArea
      className="h-full w-full"
      ref={
        scrollAreaRef?.current
          ? (scrollAreaRef as React.RefObject<HTMLDivElement>)
          : undefined
      }
    >
      {isLoadingMessages ? (
        <InternalMessagesSkeleton />
      ) : messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <p className="text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-2 md:p-4">
          {renderedMessages}
          {isSending && (
            <div className="flex items-end gap-2 flex-row-reverse self-end opacity-60">
              <Avatar initials="..." className="!h-6 !w-6 shrink-0 self-end" />
              <div className="rounded-2xl p-3 bg-primary text-primary-foreground w-full max-w-xs md:max-w-sm">
                <div className="text-sm">Sending...</div>
                <div className="flex gap-1 mt-1">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce delay-100">•</span>
                  <span className="animate-bounce delay-200">•</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  );
};
