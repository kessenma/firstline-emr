// apps/mobile/src/viewModels/admin/useTranslationServiceViewModel.ts
// ViewModel for translation service health monitoring

import { useState, useCallback, useEffect } from 'react';
import { getBaseUrl } from '../../config';

interface ModelStatus {
  ctranslate2_loaded: boolean;
  transformers_loaded: boolean;
  transformers_ar_en_loaded?: boolean;
  transformers_en_ar_loaded?: boolean;
  any_model_loaded: boolean;
  model_name: string | null;
  model_ar_en?: string | null;
  model_en_ar?: string | null;
  load_time_seconds: number | null;
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

interface TranslationTest {
  text: string;
  translatedText?: string;
  duration?: number;
  error?: string;
  timestamp: Date;
  direction: 'ar-en' | 'en-ar';
}

interface UseTranslationServiceViewModelReturn {
  // Data
  healthData: HealthData | null;
  cacheStats: CacheStats | null;
  testHistory: TranslationTest[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isTestingTranslation: boolean;
  isClearingCache: boolean;

  // Error
  error: string | null;

  // Auto-refresh
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;

  // Last checked
  lastChecked: Date | null;

  // Actions
  checkHealth: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  fetchCacheStats: () => Promise<void>;
  clearCache: () => Promise<{ success: boolean; error?: string }>;
  testTranslation: (text?: string, targetLang?: string) => Promise<{ success: boolean; error?: string }>;
  clearTestHistory: () => void;

  // Helpers
  formatUptime: (seconds: number) => string;
  getStatusColor: (status: string) => string;
}

export function useTranslationServiceViewModel(): UseTranslationServiceViewModelReturn {
  // State
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [testHistory, setTestHistory] = useState<TranslationTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestingTranslation, setIsTestingTranslation] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check health
  const checkHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/translation/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setHealthData(data);
      setLastChecked(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setHealthData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh health (for pull-to-refresh)
  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true);
    await checkHealth();
  }, [checkHealth]);

  // Fetch cache stats
  const fetchCacheStats = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/translation/cache/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cache stats: ${response.status}`);
      }

      const data = await response.json();
      setCacheStats(data);
    } catch (err) {
      console.error('[TranslationService] Error fetching cache stats:', err);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsClearingCache(true);
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/translation/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.status}`);
      }

      // Refresh cache stats after clearing
      await fetchCacheStats();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    } finally {
      setIsClearingCache(false);
    }
  }, [fetchCacheStats]);

  // Test translation
  const testTranslation = useCallback(
    async (
      textToTranslate: string = 'مرحبا',
      targetLang: string = 'English',
    ): Promise<{ success: boolean; error?: string }> => {
      setIsTestingTranslation(true);
      const startTime = Date.now();

      const direction = targetLang === 'English' ? 'ar-en' : 'en-ar';

      const testEntry: TranslationTest = {
        text: textToTranslate,
        timestamp: new Date(),
        direction,
      };

      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToTranslate,
            targetLang: targetLang,
          }),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        testEntry.translatedText = data.translatedText;
        testEntry.duration = duration;

        setTestHistory(prev => [testEntry, ...prev].slice(0, 10));
        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        testEntry.error = errorMessage;
        testEntry.duration = Date.now() - startTime;
        setTestHistory(prev => [testEntry, ...prev].slice(0, 10));
        return { success: false, error: errorMessage };
      } finally {
        setIsTestingTranslation(false);
        fetchCacheStats();
      }
    },
    [fetchCacheStats],
  );

  // Clear test history
  const clearTestHistory = useCallback(() => {
    setTestHistory([]);
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  // Format uptime
  const formatUptime = useCallback((seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return '#10b981';
      case 'loading':
        return '#f59e0b';
      case 'unhealthy':
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkHealth();
      fetchCacheStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, checkHealth, fetchCacheStats]);

  // Initial fetch
  useEffect(() => {
    checkHealth();
    fetchCacheStats();
  }, [checkHealth, fetchCacheStats]);

  return {
    healthData,
    cacheStats,
    testHistory,
    isLoading,
    isRefreshing,
    isTestingTranslation,
    isClearingCache,
    error,
    autoRefresh,
    toggleAutoRefresh,
    lastChecked,
    checkHealth,
    refreshHealth,
    fetchCacheStats,
    clearCache,
    testTranslation,
    clearTestHistory,
    formatUptime,
    getStatusColor,
  };
}
