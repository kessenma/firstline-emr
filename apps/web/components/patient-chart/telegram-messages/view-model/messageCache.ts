// apps/web/components/patient-chart/telegram-messages/view-model/messageCache.ts
"use client";

import type { TelegramMessage } from "./types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface MessageCacheData {
  messages: TelegramMessage[];
  threadInfo?: any;
}

interface MediaCacheData {
  signedUrl: string;
  objectUrl?: string; // For blob URLs that need cleanup
}

class MessageCache {
  private messageCache: Map<string, CacheEntry<MessageCacheData>> = new Map();
  private mediaCache: Map<string, CacheEntry<MediaCacheData>> = new Map();
  private readonly MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes for messages
  private readonly MEDIA_TTL = 30 * 60 * 1000; // 30 minutes for media (images, audio)

  /**
   * Get cached messages for a telegram chat
   */
  getMessages(chatId: string): MessageCacheData | null {
    const entry = this.messageCache.get(chatId);

    if (!entry) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.MESSAGE_TTL) {
      console.log(`[MessageCache] Cache expired for chat ${chatId}`);
      this.messageCache.delete(chatId);
      return null;
    }

    console.log(`[MessageCache] Cache hit for chat ${chatId}`);
    return entry.data;
  }

  /**
   * Set cached messages for a telegram chat
   */
  setMessages(chatId: string, data: MessageCacheData): void {
    console.log(`[MessageCache] Caching messages for chat ${chatId}`);
    this.messageCache.set(chatId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached media URL
   */
  getMedia(mediaUrl: string): string | null {
    const entry = this.mediaCache.get(mediaUrl);

    if (!entry) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.MEDIA_TTL) {
      console.log(`[MessageCache] Media cache expired for ${mediaUrl}`);
      // Cleanup blob URL if it exists
      if (entry.data.objectUrl) {
        URL.revokeObjectURL(entry.data.objectUrl);
      }
      this.mediaCache.delete(mediaUrl);
      return null;
    }

    console.log(`[MessageCache] Media cache hit for ${mediaUrl}`);
    return entry.data.objectUrl || entry.data.signedUrl;
  }

  /**
   * Set cached media URL
   */
  setMedia(
    mediaUrl: string,
    signedUrl: string,
    isObjectUrl: boolean = false,
  ): void {
    console.log(`[MessageCache] Caching media for ${mediaUrl}`);

    // If we're replacing an existing entry, clean up the old blob URL first
    const existingEntry = this.mediaCache.get(mediaUrl);
    if (
      existingEntry?.data.objectUrl &&
      existingEntry.data.objectUrl !== signedUrl
    ) {
      URL.revokeObjectURL(existingEntry.data.objectUrl);
      console.log(`[MessageCache] Revoked old blob URL for ${mediaUrl}`);
    }

    this.mediaCache.set(mediaUrl, {
      data: {
        signedUrl,
        objectUrl: isObjectUrl ? signedUrl : undefined,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate messages cache for a specific chat
   */
  invalidateMessages(chatId: string): void {
    console.log(`[MessageCache] Invalidating messages for chat ${chatId}`);
    this.messageCache.delete(chatId);
  }

  /**
   * Invalidate media cache for a specific URL
   */
  invalidateMedia(mediaUrl: string): void {
    console.log(`[MessageCache] Invalidating media for ${mediaUrl}`);
    const entry = this.mediaCache.get(mediaUrl);
    if (entry?.data.objectUrl) {
      URL.revokeObjectURL(entry.data.objectUrl);
    }
    this.mediaCache.delete(mediaUrl);
  }

  /**
   * Clear all message caches
   */
  clearMessageCache(): void {
    console.log(`[MessageCache] Clearing all message caches`);
    this.messageCache.clear();
  }

  /**
   * Clear all media caches
   */
  clearMediaCache(): void {
    console.log(`[MessageCache] Clearing all media caches`);
    // Cleanup all blob URLs
    this.mediaCache.forEach((entry) => {
      if (entry.data.objectUrl) {
        URL.revokeObjectURL(entry.data.objectUrl);
      }
    });
    this.mediaCache.clear();
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.clearMessageCache();
    this.clearMediaCache();
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let revokedCount = 0;

    // Clean up expired messages
    const expiredMessages: string[] = [];
    this.messageCache.forEach((entry, chatId) => {
      if (now - entry.timestamp > this.MESSAGE_TTL) {
        expiredMessages.push(chatId);
      }
    });
    expiredMessages.forEach((chatId) => this.messageCache.delete(chatId));

    // Clean up expired media
    const expiredMedia: string[] = [];
    this.mediaCache.forEach((entry, mediaUrl) => {
      if (now - entry.timestamp > this.MEDIA_TTL) {
        if (entry.data.objectUrl) {
          URL.revokeObjectURL(entry.data.objectUrl);
          revokedCount++;
        }
        expiredMedia.push(mediaUrl);
      }
    });
    expiredMedia.forEach((mediaUrl) => this.mediaCache.delete(mediaUrl));

    if (expiredMessages.length > 0 || expiredMedia.length > 0) {
      console.log(
        `[MessageCache] Cleanup complete. Removed ${expiredMessages.length} message caches, ${expiredMedia.length} media caches (${revokedCount} blob URLs revoked). Remaining - Messages: ${this.messageCache.size}, Media: ${this.mediaCache.size}`,
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    messageCount: number;
    mediaCount: number;
    oldestMessage: number | null;
    oldestMedia: number | null;
  } {
    let oldestMessage: number | null = null;
    let oldestMedia: number | null = null;
    const now = Date.now();

    this.messageCache.forEach((entry) => {
      const age = now - entry.timestamp;
      if (oldestMessage === null || age > oldestMessage) {
        oldestMessage = age;
      }
    });

    this.mediaCache.forEach((entry) => {
      const age = now - entry.timestamp;
      if (oldestMedia === null || age > oldestMedia) {
        oldestMedia = age;
      }
    });

    return {
      messageCount: this.messageCache.size,
      mediaCount: this.mediaCache.size,
      oldestMessage,
      oldestMedia,
    };
  }
}

// Create singleton instance
const messageCache = new MessageCache();

// Run cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(
    () => {
      messageCache.cleanup();
    },
    5 * 60 * 1000,
  );

  // Also cleanup on page unload to prevent memory leaks
  window.addEventListener("beforeunload", () => {
    messageCache.clearAll();
  });
}

export default messageCache;
