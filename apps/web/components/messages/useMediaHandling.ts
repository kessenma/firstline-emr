// apps/web/components/messages/useMediaHandling.ts
"use client";

import { useCallback } from "react";
import { internalMessageCache } from "@/lib/messageCache";

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
  fileName?: string;
}

export const useMediaHandling = (
  threadId: string,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsLoading: (loading: boolean) => void,
) => {
  const getSignedUrl = useCallback(async (filePath: string) => {
    try {
      const response = await fetch(
        `/api/media/get-signed-url?filePath=${encodeURIComponent(filePath)}`,
      );
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      const data = await response.json();
      return data.signedUrl;
    } catch (error) {
      console.error("Error fetching signed URL:", error);
      return null;
    }
  }, []);

  const sendImage = useCallback(
    async (file: File) => {
      if (!threadId) {
        console.error("Thread ID is missing.");
        return;
      }
      console.log("[DEBUG] File object:", file);
      console.log("[DEBUG] Thread ID:", threadId);

      // Add optimistic message to UI
      const optimisticMessageId = `temp-${Date.now()}`;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          _id: optimisticMessageId,
          text: "Uploading image...",
          sender: "You",
          senderId: "temp",
          timestamp: new Date(),
          isSelf: true,
          type: "image",
          mediaUrl: "",
          signedUrl: undefined,
        },
      ]);

      setIsLoading(true);

      try {
        // Step 1: Upload the photo
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(
          `/api/internal-messages/${threadId}/upload-photo`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload photo file to object storage");
        }

        const { signedUrl, filePath } = await uploadResponse.json();
        console.log(
          "[INFO] Photo uploaded successfully. Signed URL:",
          signedUrl,
        );

        // Step 2: Send the message with the photo reference
        const response = await fetch(
          `/api/internal-messages/${encodeURIComponent(threadId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              text: "Image sent",
              type: "image",
              mediaUrl: filePath,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ERROR] Failed to send photo message:", errorText);
          throw new Error(errorText);
        }

        const data = await response.json();
        console.log("[INFO] Photo message sent successfully:", data);
        console.log("[DEBUG] Message saved to DB with:", {
          _id: data._id,
          type: data.type,
          mediaUrl: data.mediaUrl,
          text: data.text,
        });

        // Step 3: Fetch the signed URL for displaying in the view
        const signedDisplayUrl = await getSignedUrl(filePath);
        console.log("[INFO] Retrieved signed display URL:", signedDisplayUrl);

        // Step 4: Replace optimistic message with real message
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === optimisticMessageId
              ? {
                  _id: data._id,
                  text: data.text || "Image sent",
                  sender: data.sender,
                  senderId: data.senderId,
                  timestamp: new Date(data.timestamp),
                  isSelf: true,
                  type: "image",
                  mediaUrl: filePath,
                  signedUrl: signedDisplayUrl,
                }
              : msg,
          ),
        );

        // Invalidate cache to ensure fresh data on reload
        const cacheKey = `internal-thread-${threadId}`;
        internalMessageCache.delete(cacheKey);
        internalMessageCache.invalidatePattern(/^internal-threads-/);
      } catch (error) {
        console.error("Error sending image:", error);
        // Remove optimistic message on error
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== optimisticMessageId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, getSignedUrl, setMessages, setIsLoading],
  );

  const sendAudioMessage = useCallback(
    async (blob: Blob, duration: number) => {
      if (!threadId) {
        console.error("Thread ID is missing.");
        return;
      }

      // Add optimistic message to UI
      const optimisticMessageId = `temp-${Date.now()}`;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          _id: optimisticMessageId,
          text: `Recording audio (${Math.round(duration)}s)...`,
          sender: "You",
          senderId: "temp",
          timestamp: new Date(),
          isSelf: true,
          type: "audio",
          mediaUrl: "",
          signedUrl: undefined,
        },
      ]);

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", blob);
        formData.append("duration", duration.toString());

        const uploadResponse = await fetch(
          `/api/internal-messages/${threadId}/upload-audio`,
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
          `/api/internal-messages/${encodeURIComponent(threadId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              text: `Audio message (${Math.round(duration)} seconds)`,
              type: "audio",
              mediaUrl: filePath,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to send audio message");
        }

        const data = await response.json();
        console.log("[INFO] Audio message sent successfully:", data);
        console.log("[DEBUG] Audio message saved to DB with:", {
          _id: data._id,
          type: data.type,
          mediaUrl: data.mediaUrl,
          text: data.text,
        });

        // Replace optimistic message with real message
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === optimisticMessageId
              ? {
                  _id: data._id,
                  text: data.text || "Audio sent",
                  sender: data.sender,
                  senderId: data.senderId,
                  timestamp: new Date(data.timestamp),
                  isSelf: true,
                  type: "audio",
                  mediaUrl: filePath,
                  signedUrl: signedUrl,
                }
              : msg,
          ),
        );

        // Invalidate cache to ensure fresh data on reload
        const cacheKey = `internal-thread-${threadId}`;
        internalMessageCache.delete(cacheKey);
        internalMessageCache.invalidatePattern(/^internal-threads-/);
      } catch (error) {
        console.error("Error sending audio message:", error);
        // Remove optimistic message on error
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== optimisticMessageId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, setMessages, setIsLoading],
  );

  const sendDocument = useCallback(
    async (file: File) => {
      if (!threadId) {
        console.error("Thread ID is missing.");
        return;
      }
      console.log("[DEBUG] Document file object:", file);
      console.log("[DEBUG] Thread ID:", threadId);

      // Add optimistic message to UI
      const optimisticMessageId = `temp-${Date.now()}`;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          _id: optimisticMessageId,
          text: "Uploading document...",
          sender: "You",
          senderId: "temp",
          timestamp: new Date(),
          isSelf: true,
          type: "file",
          mediaUrl: "",
          signedUrl: undefined,
          fileName: file.name,
        },
      ]);

      setIsLoading(true);

      try {
        // Step 1: Upload the document
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(
          `/api/internal-messages/${threadId}/upload-document`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload document to object storage");
        }

        const { signedUrl, filePath, fileName } = await uploadResponse.json();
        console.log(
          "[INFO] Document uploaded successfully. Signed URL:",
          signedUrl,
        );

        // Step 2: Send the message with the document reference
        const response = await fetch(
          `/api/internal-messages/${encodeURIComponent(threadId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              text: fileName,
              type: "file",
              mediaUrl: filePath,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ERROR] Failed to send document message:", errorText);
          throw new Error(errorText);
        }

        const data = await response.json();
        console.log("[INFO] Document message sent successfully:", data);
        console.log("[DEBUG] Document message saved to DB with:", {
          _id: data._id,
          type: data.type,
          mediaUrl: data.mediaUrl,
          text: data.text,
        });

        // Step 3: Fetch the signed URL for displaying in the view
        const signedDisplayUrl = await getSignedUrl(filePath);
        console.log("[INFO] Retrieved signed display URL:", signedDisplayUrl);

        // Step 4: Replace optimistic message with real message
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === optimisticMessageId
              ? {
                  _id: data._id,
                  text: data.text || fileName,
                  sender: data.sender,
                  senderId: data.senderId,
                  timestamp: new Date(data.timestamp),
                  isSelf: true,
                  type: "file",
                  mediaUrl: filePath,
                  signedUrl: signedDisplayUrl,
                  fileName: fileName,
                }
              : msg,
          ),
        );

        // Invalidate cache to ensure fresh data on reload
        const cacheKey = `internal-thread-${threadId}`;
        internalMessageCache.delete(cacheKey);
        internalMessageCache.invalidatePattern(/^internal-threads-/);
      } catch (error) {
        console.error("Error sending document:", error);
        // Remove optimistic message on error
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== optimisticMessageId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, getSignedUrl, setMessages, setIsLoading],
  );

  return {
    getSignedUrl,
    sendImage,
    sendAudioMessage,
    sendDocument,
  };
};
