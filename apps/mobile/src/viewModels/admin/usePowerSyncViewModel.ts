// apps/mobile/src/viewModels/admin/usePowerSyncViewModel.ts
// ViewModel for PowerSync service health monitoring

import { useState, useCallback, useEffect } from 'react';
import { getBaseUrl } from '../../config';
import { PowerSyncService } from '../../services/powersync/PowerSyncService';

interface HealthData {
  ready: boolean;
  started: boolean;
  touched_at: string;
  duration?: number;
}

interface LocalSyncStatus {
  isConnected: boolean;
  isReady: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
}

interface UsePowerSyncViewModelReturn {
  // Server Health Data
  healthData: HealthData | null;
  localSyncStatus: LocalSyncStatus | null;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;

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
  refreshLocalStatus: () => void;

  // Helpers
  getStatusColor: (isHealthy: boolean) => string;
  getStatusText: () => string;
}

export function usePowerSyncViewModel(): UsePowerSyncViewModelReturn {
  // State
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [localSyncStatus, setLocalSyncStatus] = useState<LocalSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check server health
  const checkHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const baseUrl = getBaseUrl();
      const startTime = Date.now();

      const response = await fetch(`${baseUrl}/api/powersync/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setHealthData({ ...data, duration });
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

  // Refresh local sync status
  const refreshLocalStatus = useCallback(() => {
    try {
      const powerSync = PowerSyncService.getInstance();
      const isReady = powerSync.isReady();

      setLocalSyncStatus({
        isConnected: isReady,
        isReady: isReady,
        lastSyncTime: isReady ? new Date() : null,
        pendingChanges: 0, // PowerSync handles this internally
      });
    } catch (err) {
      console.log('[PowerSyncViewModel] Local status check error:', err);
      setLocalSyncStatus({
        isConnected: false,
        isReady: false,
        lastSyncTime: null,
        pendingChanges: 0,
      });
    }
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  // Get status color
  const getStatusColor = useCallback((isHealthy: boolean): string => {
    return isHealthy ? '#10b981' : '#ef4444';
  }, []);

  // Get overall status text
  const getStatusText = useCallback((): string => {
    if (!healthData) return 'Unknown';
    if (healthData.ready && healthData.started) return 'Healthy';
    if (healthData.started && !healthData.ready) return 'Starting';
    return 'Unhealthy';
  }, [healthData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkHealth();
      refreshLocalStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, checkHealth, refreshLocalStatus]);

  // Initial fetch
  useEffect(() => {
    checkHealth();
    refreshLocalStatus();
  }, [checkHealth, refreshLocalStatus]);

  return {
    healthData,
    localSyncStatus,
    isLoading,
    isRefreshing,
    error,
    autoRefresh,
    toggleAutoRefresh,
    lastChecked,
    checkHealth,
    refreshHealth,
    refreshLocalStatus,
    getStatusColor,
    getStatusText,
  };
}
