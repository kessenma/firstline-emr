// apps/web/components/adminDashboard/sections/powersync/QueueViewer.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InfiniteScroll from "@/components/ui/infiniteScroll";
import {
  RefreshCw,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  Trash2,
  Smartphone,
  Monitor,
  LayoutGrid,
  Table as TableIcon,
  FileText,
  User,
  Loader2,
} from "lucide-react";

/**
 * Pending Queue Item
 * Represents updates waiting to be synced
 */
interface PendingItem {
  id: string;
  operation: "create" | "update" | "delete";
  tableName: string;
  recordId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  data: Record<string, any>;
  retryCount: number;
  error: string | null;
  createdAt: string;
  attemptedAt: string | null;
  deviceId?: string;
}

interface QueueStats {
  totalPending: number;
  failedCount: number;
  retryingCount: number;
  byTable: Record<string, number>;
}

/**
 * QueueViewer Component
 *
 * Shows pending PowerSync updates that are waiting to be synced.
 * Typically from mobile devices in offline mode.
 *
 * @example
 * ```tsx
 * <QueueViewer />
 * ```
 */
export default function QueueViewer() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalPending: 0,
    failedCount: 0,
    retryingCount: 0,
    byTable: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true); // Auto-refresh on by default
  const [filterTable, setFilterTable] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">(
    typeof window !== "undefined" && window.innerWidth < 768
      ? "mobile"
      : "desktop",
  );

  /**
   * Fetch pending items from backend
   */
  const fetchPendingItems = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterTable !== "all" && { table: filterTable }),
      });

      const response = await fetch(`/api/powersync/pending-queue?${params}`);
      if (!response.ok) throw new Error("Failed to fetch pending items");

      const data = await response.json();
      setItems(data.items || []);

      // Calculate stats
      const failedCount = data.items.filter(
        (item: PendingItem) => item.retryCount > 3,
      ).length;

      const retryingCount = data.items.filter(
        (item: PendingItem) => item.retryCount > 0 && item.retryCount <= 3,
      ).length;

      const byTable: Record<string, number> = {};
      data.items.forEach((item: PendingItem) => {
        byTable[item.tableName] = (byTable[item.tableName] || 0) + 1;
      });

      setStats({
        totalPending: data.items.length,
        failedCount,
        retryingCount,
        byTable,
      });
    } catch (err) {
      console.error("[QueueViewer] Error:", err);
      throw err;
    }
  };

  /**
   * Refresh data
   */
  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchPendingItems();
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Retry a single failed item
   */
  const retryItem = async (itemId: string) => {
    setProcessingId(itemId);
    try {
      const response = await fetch(
        `/api/powersync/retry-queue-item/${itemId}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to retry item");

      await refreshData();
    } catch (err) {
      console.error("[QueueViewer] Retry failed:", err);
      setError(err instanceof Error ? err.message : "Failed to retry item");
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Retry all failed items
   */
  const retryAll = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/powersync/retry-all-failed", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to retry all");

      await refreshData();
    } catch (err) {
      console.error("[QueueViewer] Retry all failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to retry all items",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear all completed items
   */
  const clearCompleted = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/powersync/clear-completed-queue", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to clear completed");

      await refreshData();
    } catch (err) {
      console.error("[QueueViewer] Clear failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to clear completed items",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, [filterTable]);

  // Auto-refresh every 15 seconds if enabled (more frequent for queue)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, filterTable]);

  /**
   * Format timestamp to relative time
   */
  const formatRelativeTime = (timestamp: string): string => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 5) return `${seconds}s ago`;
    return "Just now";
  };

  /**
   * Table columns
   */
  const columns: TableColumn<PendingItem>[] = [
    {
      key: "tableName",
      header: "Table",
      render: (value, item) => (
        <span className="font-mono text-sm text-foreground">
          {item.tableName}
        </span>
      ),
    },
    {
      key: "operation",
      header: "Operation",
      render: (value, item) => (
        <Badge
          variant="outline"
          className={
            item.operation === "create"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : item.operation === "update"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }
        >
          {item.operation.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "recordId",
      header: "Record ID",
      render: (value, item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.recordId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: "userName",
      header: "User",
      render: (value, item) => (
        <div className="flex flex-col">
          {item.userName && (
            <span className="text-sm text-foreground">{item.userName}</span>
          )}
          {item.userEmail && (
            <span className="text-xs text-muted-foreground">
              {item.userEmail}
            </span>
          )}
          {!item.userName && !item.userEmail && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "data",
      header: "Changes",
      render: (value, item) => {
        const keys = Object.keys(item.data || {});
        const preview = keys.slice(0, 2).join(", ");
        const more = keys.length > 2 ? ` +${keys.length - 2} more` : "";
        return (
          <span className="text-xs text-muted-foreground">
            {preview || "—"}
            {more}
          </span>
        );
      },
    },
    {
      key: "retryCount",
      header: "Attempts",
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{item.retryCount}</span>
          {item.retryCount > 3 && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Queued",
      render: (value, item) => (
        <div className="flex flex-col">
          <span className="text-sm text-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value, item) => {
        if (item.error && item.retryCount > 3) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryItem(item.id)}
                disabled={processingId === item.id}
                className="mt-1 h-6 text-xs"
              >
                {processingId === item.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  "Retry"
                )}
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {item.retryCount > 0 ? "Retrying" : "Pending"}
            </span>
          </div>
        );
      },
    },
  ];

  // Get unique table names for filter
  const tableNames = ["all", ...Object.keys(stats.byTable)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Pending Queue
          </h3>
          <p className="text-sm text-muted-foreground">
            Updates waiting to be synced from offline devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-primary/10" : ""}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`}
            />
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Items
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalPending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Retrying
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.retryingCount}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Failed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.failedCount}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      {items.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">
                  Table:
                </label>
                <Select value={filterTable} onValueChange={setFilterTable}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tableNames.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table === "all" ? "All Tables" : table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {stats.failedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryAll}
                    disabled={isLoading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Retry All Failed
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Completed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}

      {/* Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Upload className="h-5 w-5 text-yellow-500" />
              Pending Updates ({items.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="gap-1"
              >
                <TableIcon className="h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No pending updates</p>
              <p className="mt-2 text-sm text-muted-foreground">
                All updates have been synced successfully
              </p>
            </div>
          ) : (
            <InfiniteScroll
              hasMore={false}
              isLoading={false}
              next={() => {}}
              dataLength={items.length}
              threshold={200}
              height="600px"
              loader={
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading more...
                  </span>
                </div>
              }
              endMessage={
                <div className="py-4 text-center text-sm text-muted-foreground">
                  All items loaded
                </div>
              }
            >
              {viewMode === "desktop" ? (
                <Table
                  data={items}
                  columns={columns}
                  backgroundColor="background"
                  textColor="foreground"
                  borderColor="border"
                  headerBackgroundColor="muted"
                />
              ) : (
                <div className="space-y-4 p-1">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className="border-border bg-card shadow-sm"
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs text-foreground">
                              {item.tableName}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                item.operation === "create"
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                  : item.operation === "update"
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                              }
                            >
                              {item.operation.toUpperCase()}
                            </Badge>
                          </div>

                          {/* Record ID */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              Record ID:
                            </span>
                            <span className="font-mono text-xs text-foreground">
                              {item.recordId.substring(0, 8)}...
                            </span>
                          </div>

                          {/* User Info */}
                          {(item.userName || item.userEmail) && (
                            <div className="flex items-start gap-2">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex flex-col">
                                {item.userName && (
                                  <span className="text-sm text-foreground">
                                    {item.userName}
                                  </span>
                                )}
                                {item.userEmail && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.userEmail}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Changes */}
                          {item.data && Object.keys(item.data).length > 0 && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Changes:
                                </span>
                                <div className="mt-1">
                                  <span className="text-xs text-foreground">
                                    {Object.keys(item.data)
                                      .slice(0, 2)
                                      .join(", ")}
                                    {Object.keys(item.data).length > 2 &&
                                      ` +${Object.keys(item.data).length - 2} more`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Status and Time */}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div>
                              {item.error && item.retryCount > 3 ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-destructive">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                      Failed
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryItem(item.id)}
                                    disabled={processingId === item.id}
                                    className="mt-1 h-6 text-xs"
                                  >
                                    {processingId === item.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Retry"
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {item.retryCount > 0
                                      ? "Retrying"
                                      : "Pending"}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-foreground">
                                {formatRelativeTime(item.createdAt)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.retryCount} attempt
                                {item.retryCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
