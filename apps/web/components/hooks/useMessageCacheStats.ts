// apps/web/components/hooks/useMessageCacheStats.ts
"use client";

import { useState, useEffect } from "react";
import {
  internalMessageCache,
  telegramMessageCache,
  threadListCache,
} from "@/lib/messageCache";

interface CacheStats {
  size: number;
  maxSize: number;
  keys: string[];
  freshCount: number;
  staleCount: number;
}

interface AllCacheStats {
  internal: CacheStats;
  telegram: CacheStats;
  threadList: CacheStats;
  totalEntries: number;
  totalFresh: number;
  totalStale: number;
}

/**
 * Hook to monitor message cache statistics
 * Useful for debugging and performance monitoring
 */
export function useMessageCacheStats(refreshInterval: number = 5000) {
  const [stats, setStats] = useState<AllCacheStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      const internalStats = internalMessageCache.getStats();
      const telegramStats = telegramMessageCache.getStats();
      const threadListStats = threadListCache.getStats();

      setStats({
        internal: internalStats,
        telegram: telegramStats,
        threadList: threadListStats,
        totalEntries:
          internalStats.size + telegramStats.size + threadListStats.size,
        totalFresh:
          internalStats.freshCount +
          telegramStats.freshCount +
          threadListStats.freshCount,
        totalStale:
          internalStats.staleCount +
          telegramStats.staleCount +
          threadListStats.staleCount,
      });
    };

    // Initial stats
    updateStats();

    // Update stats at interval
    const interval = setInterval(updateStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return stats;
}

/**
 * Hook to clear all message caches
 */
export function useClearMessageCaches() {
  return () => {
    internalMessageCache.clear();
    telegramMessageCache.clear();
    threadListCache.clear();
  };
}

/**
 * Hook to invalidate specific cache patterns
 */
export function useInvalidateCache() {
  return {
    invalidateInternal: (pattern: RegExp) => {
      internalMessageCache.invalidatePattern(pattern);
    },
    invalidateTelegram: (pattern: RegExp) => {
      telegramMessageCache.invalidatePattern(pattern);
    },
    invalidateThreadList: (pattern: RegExp) => {
      threadListCache.invalidatePattern(pattern);
    },
    invalidateAll: () => {
      internalMessageCache.clear();
      telegramMessageCache.clear();
      threadListCache.clear();
    },
  };
}
