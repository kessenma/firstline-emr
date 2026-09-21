// apps/web/components/patient-chart/telegram-messages/view/MessageList.tsx
import type React from "react";
import { useMemo, memo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TelegramMessage } from "../view-model/types";
import { MessageRenderer } from "./MessageRenderer";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListProps {
  messages: TelegramMessage[];
  isLoadingMessages: boolean;
  decryptedImages: { [key: string]: string };
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>;
  threadInfo?: {
    patientId?: string;
    participants?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      image?: string;
    }[];
  };
  onToggleTranslation?: (messageId: string) => void;
}

// Memoized individual message component
const MessageItem = memo(
  ({
    message,
    decryptedImages,
    onToggleTranslation,
    avatarContent,
  }: {
    message: TelegramMessage;
    decryptedImages: { [key: string]: string };
    onToggleTranslation?: (messageId: string) => void;
    avatarContent: string;
  }) => {
    return (
      <div
        className={`flex items-end gap-2 ${message.isSelf ? "flex-row-reverse self-end" : "self-start"}`}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>{avatarContent}</AvatarFallback>
        </Avatar>
        <div
          className={`rounded-2xl p-3 ${
            message.isSelf
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          } w-full max-w-xs md:max-w-sm`}
        >
          <MessageRenderer
            message={message}
            decryptedImages={decryptedImages}
            onToggleTranslation={onToggleTranslation}
          />
          <p className="text-xs opacity-70 mt-1 text-center text-muted-foreground">
            {new Date(message.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

// Skeleton loader for messages
const MessagesSkeleton = () => (
  <div className="flex flex-col gap-3 p-2 md:p-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse self-end" : "self-start"}`}
      >
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="w-full max-w-xs md:max-w-sm">
        <Skeleton
          className={`h-20 rounded-2xl bg-muted`}
        />
        </div>
      </div>
    ))}
  </div>
);

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoadingMessages,
  decryptedImages,
  scrollAreaRef,
  threadInfo,
  onToggleTranslation,
}) => {
  // Function to get avatar content for a message sender
  const getAvatarContent = useCallback(
    (message: TelegramMessage): string => {
      // If it's the patient (isSelf), show "P" for Patient
      if (message.isSelf) {
        return "P";
      }

      // For non-patient messages, try to find the participant and show initials
      if (threadInfo?.participants) {
        // Try to match by sender name format "FirstName LastName"
        const senderParts = message.sender.trim().split(" ");
        if (senderParts.length >= 2) {
          const firstName = senderParts[0];
          const lastName = senderParts[senderParts.length - 1];

          const participant = threadInfo.participants.find(
            (p) =>
              p.firstName &&
              p.lastName &&
              p.firstName.toLowerCase() === firstName.toLowerCase() &&
              p.lastName.toLowerCase() === lastName.toLowerCase(),
          );

          if (participant && participant.firstName && participant.lastName) {
            return `${participant.firstName[0].toUpperCase()}${participant.lastName[0].toUpperCase()}`;
          }
        }

        // Fallback: try partial matching for cases where sender format might be different
        for (const participant of threadInfo.participants) {
          if (participant.firstName && participant.lastName) {
            const fullName = `${participant.firstName} ${participant.lastName}`;
            if (message.sender.toLowerCase().includes(fullName.toLowerCase())) {
              return `${participant.firstName[0].toUpperCase()}${participant.lastName[0].toUpperCase()}`;
            }
          }
        }
      }

      // Final fallback: use first letter of sender or "U" for Unknown
      if (message.sender && message.sender.trim().length > 0) {
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

        return (
          <MessageItem
            key={key}
            message={message}
            decryptedImages={decryptedImages}
            onToggleTranslation={onToggleTranslation}
            avatarContent={avatarContent}
          />
        );
      }),
    [messages, decryptedImages, onToggleTranslation, getAvatarContent],
  );

  return (
    <ScrollArea
      className="h-full w-full"
      ref={scrollAreaRef}
    >
      {isLoadingMessages ? (
        <MessagesSkeleton />
      ) : (
        <div className="flex flex-col gap-3 p-2 md:p-4">{renderedMessages}</div>
      )}
    </ScrollArea>
  );
};
