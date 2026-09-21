"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * PowerSync Health Data Interface
 *
 * Response from /api/powersync/health endpoint
 * which proxies to PowerSync service's /probes/liveness
 */
interface HealthData {
  ready: boolean; // Service is ready for connections
  started: boolean; // Service has completed startup
  touched_at: string; // ISO timestamp of last activity
  duration?: number; // Response time in ms (added by frontend)
}

/**
 * PowerSync ViewModel Hook
 *
 * Manages state and operations for the PowerSync admin dashboard.
 * Provides health monitoring, auto-refresh capabilities, and status formatting.
 *
 * Related Documentation:
 * - docs/power-sync/01_01_2026_jwt_kid_fix.md (JWT kid header & base64 decoding)
 * - docs/power-sync/01_01_2026_jwt_sub_claim_fix.md (JWT sub claim requirement)
 *
 * JWT Configuration:
 * - Key ID (kid): "fajr-emr-key"
 * - Algorithm: HS256
 * - Secret: Base64-encoded, decoded before use
 * - Mobile Token Expiry: 14 days
 * - Web Token Expiry: 24 hours
 *
 * @returns PowerSync monitoring state and operations
 */

export function usePowerSyncViewModel() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Internal service URL (not exposed externally)
  // Actual API calls go through /api/powersync/* which routes to the internal Docker service
  // External WebSocket URL for mobile clients: wss://sync.fajrmission.org
  const serviceUrl =
    typeof window !== "undefined"
      ? "http://powersync:6061"
      : "http://powersync:6061";

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const response = await fetch("/api/powersync/health", {
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

      // Add duration to response
      setHealthData({ ...data, duration });
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

  return {
    healthData,
    isLoading,
    error,
    lastChecked,
    autoRefresh,
    serviceUrl,
    checkHealth,
    toggleAutoRefresh,
    formatUptime,
    getStatusColor,
    getStatusBadgeColor,
  };
}
