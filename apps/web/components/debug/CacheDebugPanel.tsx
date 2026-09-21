// apps/web/components/debug/CacheDebugPanel.tsx
"use client";

import React, { useState } from "react";
import {
  useMessageCacheStats,
  useClearMessageCaches,
} from "@/components/hooks/useMessageCacheStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function CacheDebugPanel() {
  const stats = useMessageCacheStats(2000); // Update every 2 seconds
  const clearCaches = useClearMessageCaches();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  if (!stats) {
    return null;
  }

  const utilizationPercent = (used: number, max: number) =>
    Math.round((used / max) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg border-2 border-accent">
        <CardHeader
          className="p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-foreground" />
              <CardTitle className="text-sm">Cache Stats</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stats.totalEntries} entries
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="p-3 pt-0 space-y-3">
            {/* Overall Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground">Total</div>
                <div className="font-bold text-lg">{stats.totalEntries}</div>
              </div>
              <div className="text-center">
                <div className="text-success">Fresh</div>
                <div className="font-bold text-lg text-success">
                  {stats.totalFresh}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Stale</div>
                <div className="font-bold text-lg text-muted-foreground">
                  {stats.totalStale}
                </div>
              </div>
            </div>

            {/* Internal Messages Cache */}
            <div className="border rounded p-2 bg-muted">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">
                  Internal Messages
                </span>
                <Badge variant="outline" className="text-xs">
                  {utilizationPercent(
                    stats.internal.size,
                    stats.internal.maxSize,
                  )}
                  %
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.internal.size} / {stats.internal.maxSize} slots
              </div>
              <div className="flex gap-2 text-xs mt-1">
                <span className="text-success">
                  ✓ {stats.internal.freshCount}
                </span>
                <span className="text-muted-foreground">
                  ⚠ {stats.internal.staleCount}
                </span>
              </div>
            </div>

            {/* Telegram Messages Cache */}
            <div className="border rounded p-2 bg-muted/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">
                  Telegram Messages
                </span>
                <Badge variant="outline" className="text-xs">
                  {utilizationPercent(
                    stats.telegram.size,
                    stats.telegram.maxSize,
                  )}
                  %
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.telegram.size} / {stats.telegram.maxSize} slots
              </div>
              <div className="flex gap-2 text-xs mt-1">
                <span className="text-success">
                  ✓ {stats.telegram.freshCount}
                </span>
                <span className="text-muted-foreground">
                  ⚠ {stats.telegram.staleCount}
                </span>
              </div>
            </div>

            {/* Thread List Cache */}
            <div className="border rounded p-2 bg-accent/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">
                  Thread List
                </span>
                <Badge variant="outline" className="text-xs">
                  {utilizationPercent(
                    stats.threadList.size,
                    stats.threadList.maxSize,
                  )}
                  %
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.threadList.size} / {stats.threadList.maxSize} slots
              </div>
              <div className="flex gap-2 text-xs mt-1">
                <span className="text-success">
                  ✓ {stats.threadList.freshCount}
                </span>
                <span className="text-muted-foreground">
                  ⚠ {stats.threadList.staleCount}
                </span>
              </div>
            </div>

            {/* Cache Keys */}
            {showKeys && (
              <div className="border rounded p-2 bg-muted max-h-40 overflow-y-auto">
                <div className="text-xs font-medium mb-1">Cache Keys:</div>
                <div className="space-y-1">
                  {stats.internal.keys.length > 0 && (
                    <div>
                      <div className="text-xs text-primary font-medium">
                        Internal:
                      </div>
                      {stats.internal.keys.map((key) => (
                        <div
                          key={key}
                          className="text-xs text-muted-foreground ml-2"
                        >
                          • {key}
                        </div>
                      ))}
                    </div>
                  )}
                  {stats.telegram.keys.length > 0 && (
                    <div>
                      <div className="text-xs text-primary font-medium">
                        Telegram:
                      </div>
                      {stats.telegram.keys.map((key) => (
                        <div
                          key={key}
                          className="text-xs text-muted-foreground ml-2"
                        >
                          • {key}
                        </div>
                      ))}
                    </div>
                  )}
                  {stats.threadList.keys.length > 0 && (
                    <div>
                      <div className="text-xs text-accent-foreground font-medium">
                        Thread List:
                      </div>
                      {stats.threadList.keys.map((key) => (
                        <div
                          key={key}
                          className="text-xs text-muted-foreground ml-2"
                        >
                          • {key}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowKeys(!showKeys)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {showKeys ? "Hide" : "Show"} Keys
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  if (confirm("Clear all caches?")) {
                    clearCaches();
                  }
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center italic">
              Development only - will not appear in production
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
