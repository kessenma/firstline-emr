"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Loader2,
  Database,
  HardDrive,
  Rows3,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

interface TableStat {
  name: string;
  rowCount: number;
  diskSizeBytes: number;
  totalColumns: number;
}

interface SyncStats {
  tables: TableStat[];
  totalDiskBytes: number;
  totalRows: number;
  tableCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

const SyncStatsViewer: React.FC = () => {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/powersync/sync-stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxDisk = stats
    ? Math.max(...stats.tables.map((t) => t.diskSizeBytes), 1)
    : 1;

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Per-table sync statistics from PostgreSQL
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Synced Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.tableCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Rows3 className="h-4 w-4" />
                Total Rows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatNumber(stats.totalRows)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Total Disk Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatBytes(stats.totalDiskBytes)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-table breakdown */}
      {stats && stats.tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Per-Table Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Table</th>
                    <th className="pb-2 font-medium text-right">Rows</th>
                    <th className="pb-2 font-medium text-right">Disk Size</th>
                    <th className="pb-2 font-medium text-right">Columns</th>
                    <th className="pb-2 font-medium text-right">% of Total</th>
                    <th className="pb-2 font-medium w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tables.map((table) => {
                    const pct =
                      stats.totalDiskBytes > 0
                        ? (table.diskSizeBytes / stats.totalDiskBytes) * 100
                        : 0;
                    const barWidth =
                      maxDisk > 0
                        ? (table.diskSizeBytes / maxDisk) * 100
                        : 0;

                    return (
                      <tr
                        key={table.name}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {table.name}
                          </code>
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatNumber(table.rowCount)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatBytes(table.diskSizeBytes)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {table.totalColumns}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="outline" className="text-xs">
                            {pct.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2 pl-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !stats && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default SyncStatsViewer;
