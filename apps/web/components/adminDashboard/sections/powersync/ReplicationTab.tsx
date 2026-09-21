"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Activity, Database, AlertCircle } from "lucide-react";

interface ReplicationTabProps {
  healthData: any;
  isLoading: boolean;
}

const ReplicationTab: React.FC<ReplicationTabProps> = ({
  healthData,
  isLoading,
}) => {
  return (
    <div className="space-y-4">
      {healthData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Replication Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Ready:</span>
                    <Badge
                      variant={
                        healthData.ready ? "default" : "secondary"
                      }
                    >
                      {healthData.ready ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      Started:
                    </span>
                    <Badge
                      variant={
                        healthData.started ? "default" : "secondary"
                      }
                    >
                      {healthData.started ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      Last Activity:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(healthData.touched_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Activity className="h-4 w-4" />
            <AlertTitle>Sync Service Active</AlertTitle>
            <AlertDescription>
              PowerSync is actively syncing data between your PostgreSQL
              database and mobile clients. Real-time updates are being
              processed.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!healthData && !isLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Click &quot;Check Health&quot; to fetch replication status.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ReplicationTab;
