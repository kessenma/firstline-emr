"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  WifiOff,
} from "lucide-react";

interface ClientIssue {
  id: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  status: string;
  platform: string | null;
  mobilePlatform: string | null;
  createdAt: string;
  syncDiagnostics: {
    tableCounts: Record<string, number>;
    isConnected: boolean;
    connectionTimedOut: boolean;
    lastSyncTime: string | null;
    pendingChanges: number;
    errors: string[];
    serverUrl: string;
    devicePlatform: string;
  } | null;
}

const ClientIssuesViewer: React.FC = () => {
  const [clientIssues, setClientIssues] = useState<ClientIssue[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ClientIssue | null>(null);

  const fetchClientIssues = useCallback(async () => {
    setIsLoadingIssues(true);
    setIssuesError(null);
    try {
      const res = await fetch("/api/feedback?category=offline_access&limit=50");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setClientIssues(
        (data.feedback || []).map((item: any) => ({
          id: item.id,
          userName: item.userName || "",
          userEmail: item.userEmail || "",
          title: item.title,
          description: item.description,
          status: item.status,
          platform: item.platform,
          mobilePlatform: item.mobilePlatform,
          createdAt: item.createdAt,
          syncDiagnostics: item.syncDiagnostics || null,
        }))
      );
    } catch (err) {
      setIssuesError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoadingIssues(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          Sync issues reported by mobile users via the feedback system
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchClientIssues}
          disabled={isLoadingIssues}
        >
          {isLoadingIssues ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {issuesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{issuesError}</AlertDescription>
        </Alert>
      )}

      {isLoadingIssues && clientIssues.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoadingIssues && clientIssues.length === 0 && !issuesError && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No client sync issues reported
          </p>
        </div>
      )}

      {clientIssues.length > 0 && (
        <div className="space-y-3">
          {clientIssues.map((issue) => (
            <Card
              key={issue.id}
              className="cursor-pointer hover:border-orange-300 transition-colors"
              onClick={() =>
                setSelectedIssue(
                  selectedIssue?.id === issue.id ? null : issue
                )
              }
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">
                      {issue.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {issue.mobilePlatform && (
                      <Badge variant="outline" className="text-xs">
                        {issue.mobilePlatform === "ios"
                          ? "iOS"
                          : "Android"}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        issue.status === "open"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {issue.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {issue.userName || issue.userEmail}
                </p>

                {selectedIssue?.id === issue.id &&
                  issue.syncDiagnostics && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Connected:{" "}
                          </span>
                          <span
                            className={
                              issue.syncDiagnostics.isConnected
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {issue.syncDiagnostics.isConnected
                              ? "Yes"
                              : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Timed Out:{" "}
                          </span>
                          <span
                            className={
                              issue.syncDiagnostics.connectionTimedOut
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {issue.syncDiagnostics.connectionTimedOut
                              ? "Yes"
                              : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Pending:{" "}
                          </span>
                          <span>
                            {issue.syncDiagnostics.pendingChanges}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Last Sync:{" "}
                          </span>
                          <span>
                            {issue.syncDiagnostics.lastSyncTime
                              ? new Date(
                                  issue.syncDiagnostics.lastSyncTime
                                ).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Platform:{" "}
                          </span>
                          <span>
                            {issue.syncDiagnostics.devicePlatform}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Server:{" "}
                          </span>
                          <span className="truncate">
                            {issue.syncDiagnostics.serverUrl ||
                              "unknown"}
                          </span>
                        </div>
                      </div>

                      {Object.keys(
                        issue.syncDiagnostics.tableCounts
                      ).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Table Counts
                          </p>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-1 text-xs">
                            {Object.entries(
                              issue.syncDiagnostics.tableCounts
                            ).map(([table, count]) => (
                              <div
                                key={table}
                                className="flex justify-between bg-muted px-2 py-1 rounded"
                              >
                                <span className="text-muted-foreground">
                                  {table}
                                </span>
                                <span className="font-medium">
                                  {count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {issue.syncDiagnostics.errors?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">
                            Errors
                          </p>
                          {issue.syncDiagnostics.errors.map(
                            (err, i) => (
                              <p
                                key={i}
                                className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-1 rounded mb-1"
                              >
                                {err}
                              </p>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientIssuesViewer;
