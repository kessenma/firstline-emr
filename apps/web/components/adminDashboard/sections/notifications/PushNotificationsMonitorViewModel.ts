"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Notifications Server Health Data
 * Response from /api/notifications/health
 */
interface NotificationsServerHealth {
  status: "healthy" | "unhealthy";
  service: string;
  uptime: number;
  timestamp: string;
  database_connected: boolean;
  gorush_connected: boolean;
  duration?: number;
}

/**
 * Gorush Health Data
 * Response from gorush health endpoint
 */
interface GorushHealth {
  status: "healthy" | "unhealthy";
  service: string;
  timestamp: string;
  duration?: number;
}

/**
 * Recent Notification Stats
 */
interface NotificationStats {
  total_sent: number;
  ios_sent: number;
  android_sent: number;
  failed: number;
  last_24h: number;
  last_hour: number;
}

/**
 * Push Notifications Monitor ViewModel Hook
 *
 * Manages state and operations for push notifications monitoring dashboard.
 * Similar to PowerSync monitoring, provides health checks, auto-refresh, and status formatting.
 *
 * Related Services:
 * - notifications-server: Go HTTP server on port 8080
 * - gorush: Push notification service on port 8088
 *
 * @returns Push notification monitoring state and operations
 */
export function usePushNotificationsMonitorViewModel() {
  const [notificationsServerHealth, setNotificationsServerHealth] =
    useState<NotificationsServerHealth | null>(null);
  const [gorushHealth, setGorushHealth] = useState<GorushHealth | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Internal service URLs (not exposed externally)
  const notificationsServerUrl =
    typeof window !== "undefined"
      ? "http://notifications-server:8080"
      : "http://notifications-server:8080";
  const gorushUrl =
    typeof window !== "undefined"
      ? "http://gorush:8088"
      : "http://gorush:8088";

  /**
   * Check health of notifications-server
   */
  const checkNotificationsServerHealth = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await fetch("/api/notifications/health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      setNotificationsServerHealth({ ...data, duration });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      throw new Error(`Notifications Server: ${errorMessage}`);
    }
  }, []);

  /**
   * Check health of gorush service
   */
  const checkGorushHealth = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await fetch("/api/notifications/gorush-health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (!response.ok) {
        throw new Error(
          `Gorush health check failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      setGorushHealth({ ...data, duration });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      throw new Error(`Gorush: ${errorMessage}`);
    }
  }, []);

  /**
   * Fetch notification statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Stats fetch failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      // Stats are optional, don't throw error
      console.warn("Failed to fetch notification stats:", err);
    }
  }, []);

  /**
   * Check all health endpoints
   */
  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        checkNotificationsServerHealth(),
        checkGorushHealth(),
        fetchStats(),
      ]);
      setLastChecked(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      // Don't clear health data on error, keep showing last known state
    } finally {
      setIsLoading(false);
    }
  }, [checkNotificationsServerHealth, checkGorushHealth, fetchStats]);

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

  // Initial health check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  /**
   * Format uptime in human-readable format
   * @param seconds - Uptime in seconds
   * @returns Formatted string (e.g., "2d 5h 30m")
   */
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

  /**
   * Get Tailwind CSS color classes for status text
   * @param status - Status string (healthy, loading, error, etc.)
   * @returns Tailwind CSS color classes
   */
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "text-green-600 dark:text-green-400";
      case "loading":
      case "starting":
        return "text-yellow-600 dark:text-yellow-400";
      case "unhealthy":
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  /**
   * Get Tailwind CSS classes for status badge background
   * @param status - Status string (healthy, loading, error, etc.)
   * @returns Tailwind CSS badge color classes
   */
  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "loading":
      case "starting":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "unhealthy":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return {
    notificationsServerHealth,
    gorushHealth,
    stats,
    isLoading,
    error,
    lastChecked,
    autoRefresh,
    notificationsServerUrl,
    gorushUrl,
    checkHealth,
    toggleAutoRefresh,
    formatUptime,
    getStatusColor,
    getStatusBadgeColor,
    formatNumber,
  };
}
