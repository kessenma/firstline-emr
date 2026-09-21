// apps/web/components/patient-chart/telegram-messages/TelegramMessagesView.tsx
"use client";

import type React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageInput } from "./view/MessageInput";
import type { TelegramMessage } from "./TelegramMessagesViewModel";
import { FullScreenTelegramMessages } from "./view/FullScreenTelegramMessages";
import { MessageList } from "./view/MessageList";
import { useMediaManager } from "./view/useMediaManager";
import { TelegramHeader } from "./view/TelegramHeader";
import { AlertCircle } from "lucide-react";

interface TelegramMessagesViewProps {
  messages: TelegramMessage[];
  newMessage: string;
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>;
  setNewMessage: (message: string) => void;
  sendMessage: (telegramChatId: string) => void;
  sendWithTranslation?: (translatedText: string, originalText: string) => Promise<void>;
  translateText?: (text: string) => Promise<string>;
  isLanguageMismatch?: boolean;
  sendImage: (file: File) => void;
  sendAudioMessage: (file: Blob, duration: number) => void;
  isLoading: boolean;
  telegramChatId: string;
  isLoadingMessages: boolean;
  doctorEmail?: string;
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>;
  threadInfo?: any;
  error?: string | null;
  translateMessages?: () => Promise<{ translatedCount: number }>;
  isTranslating?: boolean;
  toggleTranslation?: (messageId: string) => void;
  patientDetails?: {
    firstName: string;
    lastName: string;
    id: string;
  };
  isEmbedded?: boolean;
}

export const TelegramMessagesView: React.FC<TelegramMessagesViewProps> = ({
  messages,
  newMessage,
  setMessages,
  setNewMessage,
  sendMessage,
  sendWithTranslation,
  translateText,
  isLanguageMismatch = false,
  sendImage,
  sendAudioMessage,
  isLoading,
  telegramChatId,
  isLoadingMessages,
  doctorEmail,
  scrollAreaRef: externalScrollAreaRef,
  threadInfo,
  error,
  translateMessages,
  isTranslating,
  toggleTranslation,
  patientDetails,
  isEmbedded = false,
}) => {
  const internalScrollAreaRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const initialLoadRef = useRef(true);

  // Translation dialog state
  const [pendingTranslation, setPendingTranslation] = useState<{
    original: string;
    translated: string;
  } | null>(null);
  const [isTranslatingForSend, setIsTranslatingForSend] = useState(false);

  // Use the external ref if provided, otherwise use the internal one
  const scrollAreaRef = externalScrollAreaRef || internalScrollAreaRef;

  const { decryptedImages, signedUrls } =
    useMediaManager(messages, setMessages);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, scrollAreaRef]);

  useEffect(() => {
    // Reset initial load tracking when chat changes
    initialLoadRef.current = true;
  }, [telegramChatId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLDivElement | null;

      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, scrollAreaRef]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isFullScreen]);

  // Handle send with language mismatch check
  const handleSend = useCallback(async () => {
    if (isLanguageMismatch && translateText && sendWithTranslation) {
      setIsTranslatingForSend(true);
      try {
        const translated = await translateText(newMessage);
        setPendingTranslation({ original: newMessage, translated });
      } catch (err) {
        console.error("Translation failed:", err);
        sendMessage(telegramChatId);
      } finally {
        setIsTranslatingForSend(false);
      }
    } else {
      sendMessage(telegramChatId);
    }
  }, [isLanguageMismatch, translateText, sendWithTranslation, newMessage, sendMessage, telegramChatId]);

  // Handle one-click translate + send
  const handleTranslateAndSend = useCallback(async () => {
    if (!translateText || !sendWithTranslation || !newMessage.trim()) return;

    setIsTranslatingForSend(true);
    try {
      const translated = await translateText(newMessage);
      await sendWithTranslation(translated, newMessage);
    } catch (err) {
      console.error("Translate + send failed:", err);
    } finally {
      setIsTranslatingForSend(false);
    }
  }, [translateText, sendWithTranslation, newMessage]);

  // Handle dialog: send translated
  const handleConfirmTranslation = useCallback(async () => {
    if (pendingTranslation && sendWithTranslation) {
      await sendWithTranslation(pendingTranslation.translated, pendingTranslation.original);
    }
    setPendingTranslation(null);
  }, [pendingTranslation, sendWithTranslation]);

  // Handle dialog: send without translating
  const handleSendWithoutTranslation = useCallback(() => {
    sendMessage(telegramChatId);
    setPendingTranslation(null);
  }, [sendMessage, telegramChatId]);

  // If there's an error, display it
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto h-[600px] flex flex-col bg-background shadow-lg">
        <CardHeader className="p-2 border-b">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Telegram Messages</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex grow justify-center items-center p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 w-12 h-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Error Loading Messages</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground/70">
              Please check that you have a valid Telegram chat ID and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's no valid chat ID, display a message
  if (!telegramChatId) {
    return (
      <Card className="w-full max-w-md mx-auto h-[600px] flex flex-col bg-background shadow-lg">
        <CardHeader className="p-2 border-b">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Telegram Messages</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex grow justify-center items-center p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 w-12 h-12 text-warning" />
            <h3 className="mb-2 text-lg font-medium">No Chat Selected</h3>
            <p className="text-sm text-muted-foreground">
              Please select a valid Telegram chat to view messages.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isFullScreen ? (
        <FullScreenTelegramMessages
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={() => sendMessage(telegramChatId)}
          sendImage={sendImage}
          sendAudioMessage={sendAudioMessage}
          isLoading={isLoading}
          telegramChatId={telegramChatId}
          isLoadingMessages={isLoadingMessages}
          toggleFullScreen={toggleFullScreen}
          translateMessages={translateMessages}
          isTranslating={isTranslating}
          threadInfo={threadInfo}
        />
      ) : (
        <Card
          className={
            isEmbedded
              ? "w-full flex-1 min-h-0 flex flex-col bg-background border-0 shadow-none"
              : "w-full max-w-md mx-auto h-[600px] flex flex-col bg-background shadow-lg"
          }
        >
          <CardHeader className="p-2 border-b">
            <TelegramHeader
              toggleFullScreen={toggleFullScreen}
              telegramChatId={telegramChatId}
              threadInfo={threadInfo}
              translateMessages={translateMessages}
              isTranslating={isTranslating}
              patientDetails={patientDetails}
              hideTitle={isEmbedded}
            />
          </CardHeader>
          <CardContent className="overflow-hidden flex-1 p-0 min-h-0 flex flex-col">
            <MessageList
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              decryptedImages={decryptedImages}
              scrollAreaRef={scrollAreaRef}
              threadInfo={threadInfo}
              onToggleTranslation={toggleTranslation}
            />
          </CardContent>
          <CardFooter className="p-3 border-t">
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={handleSend}
              onTranslateAndSend={isLanguageMismatch ? handleTranslateAndSend : undefined}
              sendImage={sendImage}
              sendAudioMessage={(file: Blob, duration: number) => {
                const convertedFile = new File([file], "audio_message.wav", {
                  type: file.type,
                });
                sendAudioMessage(convertedFile, duration);
              }}
              isLoading={isLoading || isTranslatingForSend}
              telegramChatId={telegramChatId}
            />
          </CardFooter>
        </Card>
      )}

      {/* Translation preview dialog */}
      <Dialog open={!!pendingTranslation} onOpenChange={(open: boolean) => { if (!open) setPendingTranslation(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Translate to Arabic?</DialogTitle>
            <DialogDescription>
              You&apos;re about to respond in English to an Arabic-speaking patient.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-3 space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">English (your message):</span>
              <p className="text-sm text-foreground mt-1">{pendingTranslation?.original}</p>
            </div>
            <div className="border-t pt-2">
              <span className="text-xs font-medium text-muted-foreground">Arabic (translation):</span>
              <p className="text-sm text-foreground mt-1 text-right" dir="rtl">{pendingTranslation?.translated}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPendingTranslation(null)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSendWithoutTranslation}>
              Send Without Translating
            </Button>
            <Button onClick={handleConfirmTranslation}>
              Send Translation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
