"use client";

import type React from "react";

import { useCallback } from "react";
import type { TelegramMessage } from "./types";
import messageCache from "./messageCache";

export const useMediaHandling = (
  telegramChatId: string,
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>,
  setIsLoading: (loading: boolean) => void,
) => {
  const getSignedUrl = useCallback(async (filePath: string) => {
    try {
      // Use proxy mode to fetch media through the backend, avoiding CORS and certificate issues
      const response = await fetch(
        `/api/media/get-signed-url?filePath=${encodeURIComponent(filePath)}&proxy=true`,
      );
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      // Proxy mode returns binary data, create blob URL for display
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching media:", error);
      return null;
    }
  }, []);

  const sendImage = useCallback(
    async (file: File) => {
      if (!telegramChatId) {
        console.error("Telegram Chat ID is missing.");
        return;
      }
      console.log("[DEBUG] File object:", file);
      console.log("[DEBUG] Telegram Chat ID:", telegramChatId);
      setIsLoading(true);

      try {
        // Step 1: Upload the photo
        const formData = new FormData();
        formData.append("file", file);
        formData.append("telegramChatId", telegramChatId);

        const uploadResponse = await fetch(
          `/api/telegram-thread/${telegramChatId}/upload-photo`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload photo file to Digital Ocean");
        }

        const { signedUrl, filePath } = await uploadResponse.json();
        console.log(
          "[INFO] Photo uploaded successfully. Signed URL:",
          signedUrl,
        );

        // Step 2: Send the photo to the Telegram API
        const sendPhotoUrl = `/api/telegram-thread/${telegramChatId}/send-photo`;
        console.log("[DEBUG] Sending photo to Telegram via:", sendPhotoUrl);

        const response = await fetch(sendPhotoUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: signedUrl, // Use the signed URL for Telegram
            caption: "Optional caption for the image",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ERROR] Failed to send photo to Telegram:", errorText);
          throw new Error(errorText);
        }

        const data = await response.json();
        console.log("[INFO] Photo sent to Telegram successfully:", data);

        // Step 3: Fetch the signed URL for displaying in the view
        const signedDisplayUrl = await getSignedUrl(filePath);
        console.log("[INFO] Retrieved signed display URL:", signedDisplayUrl);

        // Step 4: Update state with the new message using the signed URL
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            _id: data.savedMessage._id,
            text: "Image sent",
            sender: "You",
            timestamp: new Date(data.savedMessage.timestamp),
            isSelf: true,
            type: "image",
            mediaUrl: filePath, // Store filePath for reference
            signedUrl: signedDisplayUrl ?? undefined, // Display signed URL in the UI
          },
        ]);

        // Invalidate cache since we added a new message
        messageCache.invalidateMessages(telegramChatId);
      } catch (error) {
        console.error("Error sending image:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [telegramChatId, getSignedUrl, setMessages, setIsLoading],
  );

  const sendAudioMessage = useCallback(
    async (blob: Blob, duration: number) => {
      if (!telegramChatId) {
        console.error("Telegram Chat ID is missing.");
        return;
      }

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", blob);
        formData.append("telegramChatId", telegramChatId);
        formData.append("duration", duration.toString());

        const uploadResponse = await fetch(
          `/api/telegram-thread/${telegramChatId}/upload-audio`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload audio file");
        }

        const { signedUrl, filePath } = await uploadResponse.json();

        const response = await fetch(
          `/api/telegram-thread/${telegramChatId}/send-audio`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaUrl: signedUrl,
              caption: `Audio message (${Math.round(duration)} seconds)`,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to send audio to Telegram");
        }

        const data = await response.json();

        // Add the message to local state with the signedUrl so it appears immediately
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            _id: data.savedMessage._id,
            text: "Audio sent",
            sender: "You",
            timestamp: new Date(data.savedMessage.timestamp),
            isSelf: true,
            type: "audio",
            mediaUrl: filePath,
            signedUrl: signedUrl,
          },
        ]);
      } catch (error) {
        console.error("Error sending audio message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [telegramChatId, setMessages, setIsLoading],
  );

  return {
    getSignedUrl,
    sendImage,
    sendAudioMessage,
  };
};
