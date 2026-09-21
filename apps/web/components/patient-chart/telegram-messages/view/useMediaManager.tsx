"use client";

import type React from "react";

import { useState, useEffect } from "react";
import type { TelegramMessage } from "./../TelegramMessagesViewModel";
import messageCache from "./../view-model/messageCache";

export const useMediaManager = (
  messages: TelegramMessage[],
  setMessages: React.Dispatch<React.SetStateAction<TelegramMessage[]>>,
) => {
  const [decryptedImages, setDecryptedImages] = useState<{
    [key: string]: string;
  }>({});
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urlPromises = messages.map(async (message) => {
        if (
          (message.type === "image" || message.type === "audio") &&
          typeof message.mediaUrl === "string" &&
          message.mediaUrl.trim() !== "" &&
          !signedUrls[message.mediaUrl]
        ) {
          // Check cache first
          const cachedUrl = messageCache.getMedia(message.mediaUrl);
          if (cachedUrl) {
            console.log(
              `Using cached blob URL for ${message.type}:`,
              message.mediaUrl,
            );
            setSignedUrls((prev) => ({
              ...prev,
              [message.mediaUrl as string]: cachedUrl,
            }));
            return;
          }

          try {
            console.log(
              `Fetching and caching ${message.type} data:`,
              message.mediaUrl,
            );

            // Use proxy mode for all media to cache actual blob data and avoid CORS issues
            const proxyUrl = `/api/media/get-signed-url?filePath=${encodeURIComponent(message.mediaUrl)}&proxy=true`;
            console.log(
              `Downloading ${message.type} via proxy:`,
              message.mediaUrl,
            );

            const response = await fetch(proxyUrl);

            if (response.ok) {
              // Create blob URL from proxied data (works for both images and audio)
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              console.log(`Blob URL created for ${message.type}:`, blobUrl);

              if (
                typeof message.mediaUrl === "string" &&
                message.mediaUrl.trim() !== ""
              ) {
                setSignedUrls((prev) => ({
                  ...prev,
                  [message.mediaUrl as string]: blobUrl,
                }));
                // Cache the blob URL (actual media data in memory)
                messageCache.setMedia(message.mediaUrl, blobUrl, true);
              }
            } else {
              console.error(
                `Error fetching proxied media for ${message._id}:`,
                response.status,
                await response.text(),
              );
              // Fallback: try to get signed URL instead (no caching)
              try {
                const fallbackResponse = await fetch(
                  `/api/media/get-signed-url?filePath=${encodeURIComponent(message.mediaUrl)}`,
                );
                if (fallbackResponse.ok) {
                  const data = await fallbackResponse.json();
                  setSignedUrls((prev) => ({
                    ...prev,
                    [message.mediaUrl as string]: data.signedUrl,
                  }));
                  // Don't cache signed URLs - they expire quickly
                }
              } catch (fallbackError) {
                console.error(
                  "Error fetching fallback signed URL:",
                  fallbackError,
                );
              }
            }
          } catch (error) {
            console.error("Error fetching signed URL:", error);
          }
        }
      });

      await Promise.all(urlPromises);
      console.log("All media fetched and cached.");
    };

    fetchSignedUrls();
  }, [messages, signedUrls]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    // Store current signed URLs for cleanup
    const currentUrls = Object.values(signedUrls);

    return () => {
      // Revoke all blob URLs on unmount
      currentUrls.forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
          console.log("[useMediaManager] Revoked blob URL on unmount:", url);
        }
      });
    };
  }, [signedUrls]);

  return {
    decryptedImages,
    signedUrls,
  };
};
