// apps/web/components/adminDashboard/sections/powersync/ProcessedQueueViewer.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import Tooltip from "@/components/form/Tooltip";
import {
  RefreshCw,
  CheckCircle,
  Database,
  FileText,
  User,
  AlertCircle,
  Loader2,
  Smartphone,
  Monitor,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/**
 * Processed Queue Item
 * Represents a successfully synced PowerSync update
 */
interface ProcessedItem {
  id: string;
  operation: "create" | "update" | "delete";
  tableName: string;
  recordId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  data: Record<string, any>;
  syncedAt: string;
  source: "mobile" | "web";
  duration?: number; // Sync duration in ms
}

interface ProcessedStats {
  total: number;
  last24Hours: number;
  byTable: Record<string, number>;
  byOperation: Record<string, number>;
}

/**
 * ProcessedQueueViewer Component
 *
 * Shows all successfully synced PowerSync updates from both mobile and web.
 * Provides visibility into the sync system's activity.
 *
 * @example
 * ```tsx
 * <ProcessedQueueViewer />
 * ```
 */
export default function ProcessedQueueViewer() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [stats, setStats] = useState<ProcessedStats>({
    total: 0,
    last24Hours: 0,
    byTable: {},
    byOperation: {},
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterOperation, setFilterOperation] = useState<string>("all");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const [showDebug, setShowDebug] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">(
    typeof window !== "undefined" && window.innerWidth < 768
      ? "mobile"
      : "desktop",
  );
  const [expandedChanges, setExpandedChanges] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  /**
   * Fetch function for React Query
   */
  const fetchProcessedData = useCallback(
    async (pageNum: number = 0) => {
      const offset = pageNum * ITEMS_PER_PAGE;
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
        ...(filterTable !== "all" && { table: filterTable }),
        ...(filterOperation !== "all" && { operation: filterOperation }),
      });

      const response = await fetch(`/api/powersync/processed-queue?${params}`);
      if (!response.ok) throw new Error("Failed to fetch processed items");

      const data = await response.json();

      // Validate items
      const validItems = (data.items || []).map((item: any) => ({
        ...item,
        operation: item.operation || "update",
        source: item.source || "web",
        recordId: item.recordId || item.id,
        tableName: item.tableName || "user_profile_logs",
      }));

      return {
        items: validItems,
        hasMore: data.hasMore || false,
        total: data.total || validItems.length,
      };
    },
    [filterTable, filterOperation],
  );

  /**
   * React Query for initial data with caching
   */
  const {
    data: queryData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["processedQueue", filterTable, filterOperation, page],
    queryFn: () => fetchProcessedData(0),
    staleTime: 30000, // Data stays fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Update state when query data changes
  useEffect(() => {
    if (queryData) {
      setItems(queryData.items);
      setHasMore(queryData.hasMore);
      setRawApiData(queryData);

      // Calculate stats
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const last24 = queryData.items.filter(
        (item: ProcessedItem) => new Date(item.syncedAt).getTime() > oneDayAgo,
      ).length;

      const byTable: Record<string, number> = {};
      const byOperation: Record<string, number> = {};

      queryData.items.forEach((item: ProcessedItem) => {
        byTable[item.tableName] = (byTable[item.tableName] || 0) + 1;
        byOperation[item.operation] = (byOperation[item.operation] || 0) + 1;
      });

      setStats({
        total: queryData.total,
        last24Hours: last24,
        byTable,
        byOperation,
      });
    }
  }, [queryData]);

  const error = queryError ? String(queryError) : null;

  /**
   * Load more items (infinite scroll)
   */
  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const moreData = await fetchProcessedData(nextPage);

      setItems((prev) => {
        // Filter out duplicates by id
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = moreData.items.filter(
          (item: any) => !existingIds.has(item.id),
        );
        return [...prev, ...newItems];
      });

      setHasMore(moreData.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error("[ProcessedQueueViewer] Error loading more:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore, fetchProcessedData]);

  /**
   * Refresh data
   */
  const refreshData = useCallback(async () => {
    setPage(0);
    setItems([]); // Clear existing items to prevent duplicates
    await refetch();
  }, [refetch]);

  // Debug: Log items when they change
  useEffect(() => {
    if (items.length > 0) {
      console.log("[ProcessedQueueViewer] Items state changed:", {
        itemsCount: items.length,
        firstItem: items[0],
      });
    }
  }, [items]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setItems([]);
  }, [filterTable, filterOperation]);

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
    return "Just now";
  };

  /**
   * Get icon for table name
   */
  const getTableIcon = (tableName: string) => {
    const iconMap: Record<string, any> = {
      users: User,
      user_profile_logs: FileText,
      user_settings: Database,
      default: Database,
    };
    const Icon = iconMap[tableName] || iconMap.default;
    return <Icon className="h-4 w-4 text-primary" />;
  };

  /**
   * Render changes with tooltip
   */
  const renderChanges = useCallback(
    (item: ProcessedItem) => {
      if (!item.data || typeof item.data !== "object") {
        return (
          <span className="text-xs text-muted-foreground" title="No data">
            — (no data)
          </span>
        );
      }

      // Handle array format (from user_profile_logs)
      if (Array.isArray(item.data)) {
        if (item.data.length === 0) {
          return (
            <span className="text-xs text-muted-foreground">
              — (empty array)
            </span>
          );
        }

        // When expanded, show field with old -> new values
        // When collapsed, show just field names
        if (expandedChanges) {
          return (
            <div className="space-y-1">
              {item.data.map((change: any, i: number) => (
                <div key={i} className="text-xs">
                  <span className="font-medium text-foreground">
                    {change.field}:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {change.oldValue || "(empty)"}
                  </span>{" "}
                  →{" "}
                  <span className="text-foreground">
                    {change.newValue || "(empty)"}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        // Collapsed view - just field names
        const fields = item.data
          .map((change: any) => change.field)
          .filter(Boolean)
          .slice(0, 2);
        const preview = fields.join(", ");
        const more =
          item.data.length > 2 ? ` +${item.data.length - 2} more` : "";

        const tooltipContent = (
          <div className="space-y-2 max-w-md">
            <p className="font-semibold text-xs">Changes:</p>
            {item.data.map((change: any, i: number) => (
              <div key={i} className="text-xs border-b border-border/50 pb-1">
                <div className="font-medium text-primary">{change.field}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">
                    {change.oldValue || "(empty)"}
                  </span>
                  <span>→</span>
                  <span className="text-foreground">
                    {change.newValue || "(empty)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

        return (
          <Tooltip
            showTooltip={hoveredItemId === item.id}
            content={tooltipContent}
          >
            <span
              className="text-xs text-foreground cursor-help"
              title={JSON.stringify(item.data, null, 2)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              {preview || "— (no fields)"}
              {more}
            </span>
          </Tooltip>
        );
      }

      // Handle object format
      const keys = Object.keys(item.data);
      if (keys.length === 0) {
        return (
          <span className="text-xs text-muted-foreground">
            — (empty object)
          </span>
        );
      }

      const displayKeys = expandedChanges ? keys : keys.slice(0, 2);
      const preview = displayKeys.join(", ");
      const more =
        !expandedChanges && keys.length > 2 ? ` +${keys.length - 2} more` : "";

      const tooltipContent = (
        <div className="space-y-2 max-w-md">
          <p className="font-semibold text-xs">Changed Fields:</p>
          {keys.map((key) => (
            <div key={key} className="text-xs border-b border-border/50 pb-1">
              <div className="font-medium text-primary">{key}</div>
              <div className="text-foreground mt-1">
                {JSON.stringify(item.data[key])}
              </div>
            </div>
          ))}
        </div>
      );

      return (
        <Tooltip
          showTooltip={hoveredItemId === item.id}
          content={tooltipContent}
        >
          <span
            className="text-xs text-foreground cursor-help"
            title={JSON.stringify(item.data, null, 2)}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            {preview || "—"}
            {more}
          </span>
        </Tooltip>
      );
    },
    [expandedChanges, hoveredItemId],
  );

  /**
   * Table columns (memoized)
   */
  const columns: TableColumn<ProcessedItem>[] = useMemo(
    () => [
      {
        key: "tableName",
        header: "Table",
        render: (value, item) => (
          <div className="flex items-center gap-2">
            {getTableIcon(item.tableName)}
            <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {item.tableName}
            </span>
          </div>
        ),
      },
      {
        key: "operation",
        header: "Operation",
        render: (value, item) => {
          const operation = item.operation || "update";
          return (
            <Badge
              variant="outline"
              className={
                operation === "create"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : operation === "update"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }
            >
              {operation.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        key: "recordId",
        header: "Record ID",
        render: (value, item) => (
          <span
            className="font-mono text-xs text-gray-600 dark:text-gray-400"
            title={item.recordId || "No record ID"}
          >
            {item.recordId
              ? item.recordId.substring(0, 8) + "..."
              : "— (no ID)"}
          </span>
        ),
      },
      {
        key: "userName",
        header: "User",
        render: (value, item) => {
          const hasName = item.userName && item.userName.trim();
          const hasEmail = item.userEmail && item.userEmail.trim();
          const debugInfo = `userId: ${item.userId || "none"}, userName: ${item.userName || "none"}, userEmail: ${item.userEmail || "none"}`;
          return (
            <div className="flex flex-col" title={debugInfo}>
              {hasName && (
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {item.userName}
                </span>
              )}
              {hasEmail && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.userEmail}
                </span>
              )}
              {!hasName && !hasEmail && (
                <span className="text-xs text-gray-400">
                  —{" "}
                  {item.userId
                    ? `(ID: ${item.userId.substring(0, 8)})`
                    : "(no user)"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "data",
        header: "Changes",
        render: (value, item) => renderChanges(item),
      },
      {
        key: "source",
        header: "Source",
        render: (value, item) => {
          const source = item.source || "web";
          return (
            <Badge
              variant="outline"
              className={
                source === "mobile"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              }
            >
              {source === "mobile" ? (
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Web
                </span>
              )}
            </Badge>
          );
        },
      },
      {
        key: "syncedAt",
        header: "Synced",
        render: (value, item) => {
          const syncDate = item.syncedAt ? new Date(item.syncedAt) : null;
          const isValidDate = syncDate && !isNaN(syncDate.getTime());

          return (
            <div
              className="flex flex-col"
              title={`Raw: ${item.syncedAt || "none"}`}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isValidDate
                  ? formatRelativeTime(item.syncedAt)
                  : "— (invalid date)"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isValidDate
                  ? syncDate.toLocaleTimeString()
                  : item.syncedAt || "—"}
              </span>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: () => (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Synced</span>
          </div>
        ),
      },
    ],
    [renderChanges, expandedChanges],
  );

  // Get unique table names for filter
  const tableNames = ["all", ...Object.keys(stats.byTable)];
  const operations = ["all", "create", "update", "delete"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Processed Queue
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Successfully synced PowerSync updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className={showDebug ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
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
                  Total Synced
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.total}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Last 24 Hours
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.last24Hours}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tables Updated
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Object.keys(stats.byTable).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Panel */}
      {/* DEBUG: Raw API response */}
      {showDebug && rawApiData && (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">
              🐛 DEBUG: Raw API Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-foreground">
                <div>
                  <span className="font-medium">Has More:</span>{" "}
                  {String(rawApiData.hasMore)}
                </div>
                <div>
                  <span className="font-medium">Total:</span>{" "}
                  {rawApiData.total || 0}
                </div>
                <div>
                  <span className="font-medium">Items Length:</span>{" "}
                  {rawApiData.items?.length || 0}
                </div>
                <div>
                  <span className="font-medium">Count:</span>{" "}
                  {rawApiData.count || 0}
                </div>
              </div>

              {rawApiData.items && rawApiData.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">
                    First Item (Raw):
                  </p>
                  <pre className="text-xs bg-card p-3 rounded border border-border overflow-auto max-h-96">
                    {JSON.stringify(rawApiData.items[0], null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  Full Response:
                </p>
                <pre className="text-xs bg-card p-3 rounded border border-border overflow-auto max-h-96">
                  {JSON.stringify(rawApiData, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                Operation:
              </label>
              <Select value={filterOperation} onValueChange={setFilterOperation}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operations.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op === "all" ? "All Operations" : op.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(filterTable !== "all" || filterOperation !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterTable("all");
                  setFilterOperation("all");
                }}
                className="border-border"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Cache Status */}
      <p className="text-xs text-muted-foreground">
        Auto-refreshes every 30 seconds • Data cached for 5 minutes
      </p>

      {/* DEBUG: Show raw items state */}
      {showDebug && (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">
              🐛 DEBUG: Items State ({items.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length > 0 && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold mb-1 text-foreground">
                    First item:
                  </p>
                  <pre className="text-xs bg-card p-2 rounded overflow-auto max-h-48 border border-border">
                    {JSON.stringify(items[0], null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1 text-foreground">
                    Items array keys:
                  </p>
                  <p className="text-xs text-foreground">
                    {items
                      .map(
                        (item, i) =>
                          `Item ${i}: ${Object.keys(item).join(", ")}`,
                      )
                      .slice(0, 3)
                      .join(" | ")}
                  </p>
                </div>
              </div>
            )}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">No items in state</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {/* Table with Infinite Scroll */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle className="h-5 w-5 text-primary" />
              Synced Updates ({items.length} of {stats.total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedChanges(!expandedChanges)}
                className="gap-1"
                title={
                  expandedChanges
                    ? "Collapse changes - show field names only"
                    : "Expand changes - show old → new values"
                }
              >
                {expandedChanges ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    Expand
                  </>
                )}
              </Button>
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
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Database className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No synced updates found
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Updates will appear here once PowerSync syncs data
              </p>
            </div>
          ) : (
            <InfiniteScroll
              hasMore={hasMore}
              isLoading={isLoadingMore}
              next={loadMoreItems}
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
                  No more items to load
                </div>
              }
            >
              {viewMode === "desktop" ? (
                <Table
                  key={`table-${expandedChanges}`}
                  data={items}
                  columns={columns}
                  backgroundColor="background"
                  textColor="foreground"
                  borderColor="border"
                  headerBackgroundColor="muted"
                  stickyHeader
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
                            <div className="flex items-center gap-2">
                              {getTableIcon(item.tableName)}
                              <span className="font-mono text-xs text-foreground">
                                {item.tableName}
                              </span>
                            </div>
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
                              {(item.operation || "update").toUpperCase()}
                            </Badge>
                          </div>

                          {/* Record ID */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              Record ID:
                            </span>
                            <span className="font-mono text-xs text-foreground">
                              {item.recordId
                                ? item.recordId.substring(0, 8) + "..."
                                : "— (no ID)"}
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
                          {item.data &&
                            Array.isArray(item.data) &&
                            item.data.length > 0 && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    Changes:
                                  </span>
                                  <div className="mt-1 space-y-1">
                                    {item.data
                                      .slice(
                                        0,
                                        expandedChanges ? item.data.length : 2,
                                      )
                                      .map((change: any, i: number) => (
                                        <div
                                          key={i}
                                          className="text-xs text-foreground"
                                        >
                                          <span className="font-medium">
                                            {change.field}:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {change.oldValue}
                                          </span>{" "}
                                          → <span>{change.newValue}</span>
                                        </div>
                                      ))}
                                    {!expandedChanges &&
                                      item.data.length > 2 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{item.data.length - 2} more
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Source and Time */}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <Badge
                              variant="outline"
                              className={
                                item.source === "mobile"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }
                            >
                              {item.source === "mobile" ? (
                                <span className="flex items-center gap-1">
                                  <Smartphone className="h-3 w-3" />
                                  Mobile
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Monitor className="h-3 w-3" />
                                  Web
                                </span>
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.syncedAt
                                ? formatRelativeTime(item.syncedAt)
                                : "—"}
                            </span>
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
