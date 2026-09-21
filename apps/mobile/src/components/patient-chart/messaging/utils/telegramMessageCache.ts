// apps/mobile/src/components/patient-chart/messaging/utils/telegramMessageCache.ts
// Singleton cache for telegram messages and media URLs

import type { MessageCacheData, CacheEntry } from './telegramTypes';

class TelegramMessageCache {
  private static instance: TelegramMessageCache;
  private messageCache: Map<string, CacheEntry<MessageCacheData>>;
  private mediaCache: Map<string, CacheEntry<string>>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // TTL values
  private readonly MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MEDIA_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.messageCache = new Map();
    this.mediaCache = new Map();
    this.startCleanupInterval();
  }

  public static getInstance(): TelegramMessageCache {
    if (!TelegramMessageCache.instance) {
      TelegramMessageCache.instance = new TelegramMessageCache();
    }
    return TelegramMessageCache.instance;
  }

  // Start periodic cleanup
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  // Message cache methods
  public getMessages(chatId: string): MessageCacheData | null {
    const entry = this.messageCache.get(chatId);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.MESSAGE_TTL) {
      this.messageCache.delete(chatId);
      return null;
    }

    return entry.data;
  }

  public setMessages(chatId: string, data: MessageCacheData): void {
    this.messageCache.set(chatId, {
      data,
      timestamp: Date.now(),
    });
  }

  public invalidateMessages(chatId: string): void {
    this.messageCache.delete(chatId);
    console.log(`🗑️ [TelegramCache] Invalidated messages for chatId: ${chatId}`);
  }

  public hasValidMessages(chatId: string): boolean {
    const entry = this.messageCache.get(chatId);
    if (!entry) return false;
    return Date.now() - entry.timestamp <= this.MESSAGE_TTL;
  }

  // Media cache methods
  public getMedia(mediaUrl: string): string | null {
    const entry = this.mediaCache.get(mediaUrl);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.MEDIA_TTL) {
      this.mediaCache.delete(mediaUrl);
      return null;
    }

    return entry.data;
  }

  public setMedia(mediaUrl: string, signedUrl: string): void {
    this.mediaCache.set(mediaUrl, {
      data: signedUrl,
      timestamp: Date.now(),
    });
  }

  public invalidateMedia(mediaUrl: string): void {
    this.mediaCache.delete(mediaUrl);
  }

  // Cleanup expired entries
  public cleanup(): void {
    const now = Date.now();
    let messagesCleared = 0;
    let mediaCleared = 0;

    // Clean message cache
    for (const [chatId, entry] of this.messageCache.entries()) {
      if (now - entry.timestamp > this.MESSAGE_TTL) {
        this.messageCache.delete(chatId);
        messagesCleared++;
      }
    }

    // Clean media cache
    for (const [mediaUrl, entry] of this.mediaCache.entries()) {
      if (now - entry.timestamp > this.MEDIA_TTL) {
        this.mediaCache.delete(mediaUrl);
        mediaCleared++;
      }
    }

    if (messagesCleared > 0 || mediaCleared > 0) {
      console.log(
        `🧹 [TelegramCache] Cleanup: ${messagesCleared} messages, ${mediaCleared} media entries cleared`
      );
    }
  }

  // Clear all caches
  public clearAll(): void {
    this.messageCache.clear();
    this.mediaCache.clear();
    console.log('🗑️ [TelegramCache] All caches cleared');
  }

  // Get cache statistics
  public getStats(): {
    messageCount: number;
    mediaCount: number;
    messageTTL: number;
    mediaTTL: number;
  } {
    return {
      messageCount: this.messageCache.size,
      mediaCount: this.mediaCache.size,
      messageTTL: this.MESSAGE_TTL,
      mediaTTL: this.MEDIA_TTL,
    };
  }

  // Stop cleanup interval (for testing or shutdown)
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const telegramMessageCache = TelegramMessageCache.getInstance();
export default telegramMessageCache;
