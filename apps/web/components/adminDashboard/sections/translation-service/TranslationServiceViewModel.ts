"use client";

import { useCallback, useEffect, useState } from "react";

interface ModelStatus {
  ctranslate2_loaded: boolean;
  transformers_loaded: boolean;
  transformers_ar_en_loaded?: boolean; // Optional, might be missing in some responses
  transformers_en_ar_loaded?: boolean; // Optional, might be missing in some responses
  any_model_loaded: boolean;
  model_name: string | null;
  model_ar_en?: string | null; // Optional
  model_en_ar?: string | null; // Optional
  load_time_seconds: number | null;
}

interface ModelDownloadProgress {
  status: "pending" | "downloading" | "completed" | "error";
  progress_percent: number;
  downloaded_mb: number;
  total_mb: number;
  error: string | null;
}

interface DownloadProgress {
  ar_en: ModelDownloadProgress;
  en_ar: ModelDownloadProgress;
}

interface HealthData {
  status: string;
  models_loaded: ModelStatus;
  uptime_seconds: number;
  cache_size: number;
  timestamp: string;
  config?: {
    port: number;
    cache_max_size: number;
    cache_eviction_time_seconds: number;
  };
  download_progress?: DownloadProgress;
}

interface TranslationTest {
  text: string;
  translatedText?: string;
  duration?: number;
  error?: string;
  timestamp: Date;
  direction: "ar-en" | "en-ar";
}

interface CacheStats {
  cache_size: number;
  max_size: number;
  eviction_time_seconds: number;
  hits: number;
  misses: number;
  evictions: number;
  hit_rate: number;
}

export function useTranslationServiceViewModel() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [testHistory, setTestHistory] = useState<TranslationTest[]>([]);
  const [isTestingTranslation, setIsTestingTranslation] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Display URL for the translation service (external-facing)
  // Actual API calls go through /api/translation/* which routes to the internal Docker service
  const serviceUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:9000`
      : "http://translation-service:9000";

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translation/health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setHealthData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch("/api/translation/cache/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cache stats: ${response.status}`);
      }

      const data = await response.json();
      setCacheStats(data);
    } catch (err) {
      console.error("Error fetching cache stats:", err);
    }
  }, []);

  const clearCache = useCallback(async () => {
    setIsClearingCache(true);
    try {
      const response = await fetch("/api/translation/cache/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.status}`);
      }

      const data = await response.json();

      // Refresh cache stats after clearing
      await fetchCacheStats();

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: errorMessage };
    } finally {
      setIsClearingCache(false);
    }
  }, [fetchCacheStats]);

  const testTranslation = useCallback(
    async (
      textToTranslate: string = "مرحبا",
      targetLang: string = "English",
    ) => {
      setIsTestingTranslation(true);
      const startTime = Date.now();

      const direction = targetLang === "English" ? "ar-en" : "en-ar";

      const testEntry: TranslationTest = {
        text: textToTranslate,
        timestamp: new Date(),
        direction,
      };

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToTranslate,
            targetLang: targetLang,
          }),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(
            `Translation failed: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        testEntry.translatedText = data.translatedText;
        testEntry.duration = duration;

        setTestHistory((prev) => [testEntry, ...prev].slice(0, 10)); // Keep last 10 tests
        return { success: true, data };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        testEntry.error = errorMessage;
        testEntry.duration = Date.now() - startTime;
        setTestHistory((prev) => [testEntry, ...prev].slice(0, 10));
        return { success: false, error: errorMessage };
      } finally {
        setIsTestingTranslation(false);
        // Refresh cache stats after test
        fetchCacheStats();
      }
    },
    [fetchCacheStats],
  );

  const clearTestHistory = useCallback(() => {
    setTestHistory([]);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, checkHealth]);

  // Fetch cache stats periodically when auto-refresh is on
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCacheStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchCacheStats]);

  // Initial health check on mount
  useEffect(() => {
    checkHealth();
    fetchCacheStats();
  }, [checkHealth, fetchCacheStats]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      if (hours > 0)
        return `${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours > 1 ? "s" : ""}`;
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      if (minutes > 0)
        return `${hours} hour${hours > 1 ? "s" : ""}, ${minutes} min`;
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  };

  const formatFileSize = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "text-green-600 dark:text-green-400";
      case "loading":
        return "text-yellow-600 dark:text-yellow-400";
      case "unhealthy":
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "loading":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "unhealthy":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return {
    healthData,
    isLoading,
    error,
    lastChecked,
    autoRefresh,
    testHistory,
    isTestingTranslation,
    cacheStats,
    isClearingCache,
    serviceUrl,
    checkHealth,
    testTranslation,
    clearTestHistory,
    toggleAutoRefresh,
    fetchCacheStats,
    clearCache,
    formatUptime,
    formatDuration,
    formatFileSize,
    getStatusColor,
    getStatusBadgeColor,
  };
}
