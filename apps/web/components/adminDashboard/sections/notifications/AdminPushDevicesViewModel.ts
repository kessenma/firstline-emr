// apps/web/components/adminDashboard/sections/notifications/AdminPushDevicesViewModel.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface PushDevice {
  id: string;
  userId: string | null;
  platform: "ios" | "android";
  token: string;
  environment: "dev" | "prod";
  isActive: boolean;
  lastSeenAt: Date | string;
  deviceId: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userName: string | null;
  userEmail: string | null;
}

export interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  iosDevices: number;
  androidDevices: number;
  devEnvironment: number;
  prodEnvironment: number;
}

export interface UseAdminPushDevicesViewModel {
  // Data
  devices: PushDevice[];
  filteredDevices: PushDevice[];
  stats: DeviceStats | null;

  // Loading states
  isLoading: boolean;
  actionLoading: string | null;

  // Error handling
  error: string | null;

  // Filters
  searchQuery: string;
  platformFilter: string;
  statusFilter: string;
  environmentFilter: string;

  // View mode
  viewMode: "table" | "cards";

  // Actions
  setSearchQuery: (query: string) => void;
  setPlatformFilter: (platform: string) => void;
  setStatusFilter: (status: string) => void;
  setEnvironmentFilter: (environment: string) => void;
  setViewMode: (mode: "table" | "cards") => void;
  fetchDevices: () => Promise<void>;
  handleDeactivate: (deviceId: string) => Promise<void>;
  handleReactivate: (deviceId: string) => Promise<void>;
  handleDelete: (deviceId: string) => Promise<void>;
  handleSendTestNotification: (deviceId: string) => Promise<void>;
}

export function useAdminPushDevicesViewModel(): UseAdminPushDevicesViewModel {
  const { data: session } = useSession();

  // State
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<PushDevice[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Fetch devices from API
  const fetchDevices = useCallback(async () => {
    if (!session?.user?.token) {
      setError("No authentication token available");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/push-devices", {
        headers: {
          Authorization: `Bearer ${session.user.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch devices: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("📊 Received devices data:", data);
      console.log("📊 Number of devices:", data.devices?.length);
      if (data.devices?.length > 0) {
        console.log("📊 First device sample:", data.devices[0]);
        console.log("📊 First device keys:", Object.keys(data.devices[0]));
      }

      // Validate and filter devices to ensure they have required fields
      const validDevices = (data.devices || []).filter((device: any) => {
        const isValid =
          device &&
          device.id &&
          device.platform &&
          device.environment !== undefined;
        if (!isValid) {
          console.warn("⚠️ Invalid device filtered out:", device);
        }
        return isValid;
      });

      console.log("📊 Valid devices after filtering:", validDevices.length);
      setDevices(validDevices);
      setStats(data.stats || null);
    } catch (err) {
      console.error("❌ Error fetching devices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch devices");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.token]);

  // Apply filters whenever devices or filter values change
  useEffect(() => {
    let filtered = [...devices];

    // Apply platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter((d) => d.platform === platformFilter);
    }

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((d) => d.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((d) => !d.isActive);
    }

    // Apply environment filter
    if (environmentFilter !== "all") {
      filtered = filtered.filter((d) => d.environment === environmentFilter);
    }

    // Apply search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.userName?.toLowerCase().includes(query) ||
          d.userEmail?.toLowerCase().includes(query) ||
          d.deviceModel?.toLowerCase().includes(query) ||
          d.deviceId?.toLowerCase().includes(query) ||
          d.token?.toLowerCase().includes(query),
      );
    }

    setFilteredDevices(filtered);
  }, [devices, searchQuery, platformFilter, statusFilter, environmentFilter]);

  // Deactivate a device
  const handleDeactivate = useCallback(
    async (deviceId: string) => {
      if (!session?.user?.token) {
        setError("No authentication token available");
        return;
      }

      try {
        setActionLoading(deviceId);
        setError(null);

        const response = await fetch(`/api/admin/push-devices/${deviceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.token}`,
          },
          body: JSON.stringify({ action: "deactivate" }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to deactivate device");
        }

        // Refresh devices list
        await fetchDevices();
      } catch (err) {
        console.error("❌ Error deactivating device:", err);
        setError(
          err instanceof Error ? err.message : "Failed to deactivate device",
        );
        throw err;
      } finally {
        setActionLoading(null);
      }
    },
    [fetchDevices, session?.user?.token],
  );

  // Reactivate a device
  const handleReactivate = useCallback(
    async (deviceId: string) => {
      if (!session?.user?.token) {
        setError("No authentication token available");
        return;
      }

      try {
        setActionLoading(deviceId);
        setError(null);

        const response = await fetch(`/api/admin/push-devices/${deviceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.token}`,
          },
          body: JSON.stringify({ action: "reactivate" }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to reactivate device");
        }

        // Refresh devices list
        await fetchDevices();
      } catch (err) {
        console.error("❌ Error reactivating device:", err);
        setError(
          err instanceof Error ? err.message : "Failed to reactivate device",
        );
        throw err;
      } finally {
        setActionLoading(null);
      }
    },
    [fetchDevices, session?.user?.token],
  );

  // Delete a device
  const handleDelete = useCallback(
    async (deviceId: string) => {
      if (!session?.user?.token) {
        setError("No authentication token available");
        return;
      }

      try {
        setActionLoading(deviceId);
        setError(null);

        const response = await fetch(`/api/admin/push-devices/${deviceId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.user.token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete device");
        }

        // Refresh devices list
        await fetchDevices();
      } catch (err) {
        console.error("❌ Error deleting device:", err);
        setError(
          err instanceof Error ? err.message : "Failed to delete device",
        );
        throw err;
      } finally {
        setActionLoading(null);
      }
    },
    [fetchDevices, session?.user?.token],
  );

  // Send test notification to a device
  const handleSendTestNotification = useCallback(
    async (deviceId: string) => {
      if (!session?.user?.token) {
        setError("No authentication token available");
        return;
      }

      try {
        setActionLoading(deviceId);
        setError(null);

        const response = await fetch(
          `/api/admin/push-devices/${deviceId}/test`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.user.token}`,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to send test notification",
          );
        }

        const data = await response.json();
        console.log("✅ Test notification sent:", data);
      } catch (err) {
        console.error("❌ Error sending test notification:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to send test notification",
        );
        throw err;
      } finally {
        setActionLoading(null);
      }
    },
    [session?.user?.token],
  );

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    // Data
    devices,
    filteredDevices,
    stats,

    // Loading states
    isLoading,
    actionLoading,

    // Error handling
    error,

    // Filters
    searchQuery,
    platformFilter,
    statusFilter,
    environmentFilter,

    // View mode
    viewMode,

    // Actions
    setSearchQuery,
    setPlatformFilter,
    setStatusFilter,
    setEnvironmentFilter,
    setViewMode,
    fetchDevices,
    handleDeactivate,
    handleReactivate,
    handleDelete,
    handleSendTestNotification,
  };
}
