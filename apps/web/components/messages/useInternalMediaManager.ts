// apps/web/components/messages/useInternalMediaManager.ts
"use client";

import { useState, useEffect } from "react";

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

export const useInternalMediaManager = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) => {
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      // Filter messages that need signed URLs
      const mediaMessages = messages.filter(
        (message) =>
          (message.type === "image" ||
            message.type === "audio" ||
            message.type === "file") &&
          typeof message.mediaUrl === "string" &&
          message.mediaUrl.trim() !== "" &&
          !signedUrls[message.mediaUrl] &&
          !message.signedUrl, // Don't refetch if already has signedUrl
      );

      if (mediaMessages.length === 0) {
        return;
      }

      setIsLoadingMedia(true);

      try {
        const urlPromises = mediaMessages.map(async (message) => {
          try {
            console.log(
              `[InternalMediaManager] Fetching signed URL for ${message.type}:`,
              message.mediaUrl,
            );

            const response = await fetch(
              `/api/media/get-signed-url?filePath=${encodeURIComponent(message.mediaUrl as string)}`,
            );

            if (response.ok) {
              const data = await response.json();
              console.log(
                `[InternalMediaManager] Signed URL received for ${message.type}:`,
                data.signedUrl,
              );

              if (data.signedUrl && message.mediaUrl) {
                setSignedUrls((prev) => ({
                  ...prev,
                  [message.mediaUrl as string]: data.signedUrl,
                }));

                // Update the message in the messages array
                setMessages((prevMessages) =>
                  prevMessages.map((msg) =>
                    msg._id === message._id
                      ? { ...msg, signedUrl: data.signedUrl }
                      : msg,
                  ),
                );
              } else {
                console.error(
                  "[InternalMediaManager] No signed URL returned:",
                  data,
                );
              }
            } else {
              console.error(
                `[InternalMediaManager] Error fetching signed URL for ${message._id}:`,
                await response.text(),
              );
            }
          } catch (error) {
            console.error(
              `[InternalMediaManager] Error fetching signed URL for message ${message._id}:`,
              error,
            );
          }
        });

        await Promise.all(urlPromises);
        console.log("[InternalMediaManager] All signed URLs fetched.");
      } catch (error) {
        console.error(
          "[InternalMediaManager] Error in fetchSignedUrls:",
          error,
        );
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchSignedUrls();
  }, [messages, signedUrls, setMessages]);

  return {
    signedUrls,
    isLoadingMedia,
  };
};
