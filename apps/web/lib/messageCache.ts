// apps/web/lib/messageCache.ts
"use client";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface MessageCacheConfig {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of entries (default: 50)
  staleWhileRevalidate?: boolean; // Show stale data while fetching fresh (default: true)
}

/**
 * In-memory cache for message threads with TTL and size limits
 * Implements stale-while-revalidate pattern for optimal UX
 */
class MessageCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;
  private maxSize: number;
  private staleWhileRevalidate: boolean;
  private accessOrder: string[]; // Track LRU for eviction

  constructor(config: MessageCacheConfig = {}) {
    this.cache = new Map();
    this.ttl = config.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = config.maxSize || 50;
    this.staleWhileRevalidate = config.staleWhileRevalidate ?? true;
    this.accessOrder = [];
  }

  /**
   * Get cached data
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Update access order for LRU
    this.updateAccessOrder(key);

    // If expired and not using stale-while-revalidate, return null
    if (now > entry.expiresAt && !this.staleWhileRevalidate) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache entry is stale (expired but still available)
   * @param key - Cache key
   * @returns true if data is stale but available
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    return now > entry.expiresAt;
  }

  /**
   * Check if cache entry is fresh
   * @param key - Cache key
   * @returns true if data exists and is not expired
   */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    return now <= entry.expiresAt;
  }

  /**
   * Set cached data
   * @param key - Cache key
   * @param data - Data to cache
   * @param customTtl - Optional custom TTL for this entry
   */
  set(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl || this.ttl;

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    this.updateAccessOrder(key);
  }

  /**
   * Delete a cache entry
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Invalidate entries matching a pattern
   * @param pattern - Regex pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder[0];
    this.delete(oldestKey);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
    freshCount: number;
    staleCount: number;
  } {
    const now = Date.now();
    let freshCount = 0;
    let staleCount = 0;

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        freshCount++;
      } else {
        staleCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: this.keys(),
      freshCount,
      staleCount,
    };
  }
}

// Singleton instances for different cache types
export const internalMessageCache = new MessageCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  staleWhileRevalidate: true,
});

export const telegramMessageCache = new MessageCache({
  ttl: 3 * 60 * 1000, // 3 minutes (more frequent updates for patient messages)
  maxSize: 100,
  staleWhileRevalidate: true,
});

export const threadListCache = new MessageCache({
  ttl: 2 * 60 * 1000, // 2 minutes (thread list needs more frequent updates)
  maxSize: 10,
  staleWhileRevalidate: true,
});

// Cleanup interval - run every minute
if (typeof window !== "undefined") {
  setInterval(() => {
    internalMessageCache.cleanup();
    telegramMessageCache.cleanup();
    threadListCache.cleanup();
  }, 60 * 1000);
}

export default MessageCache;
