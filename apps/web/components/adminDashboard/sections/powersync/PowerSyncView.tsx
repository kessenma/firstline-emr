"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { usePowerSyncViewModel } from "./PowerSyncViewModel";
import OverviewTab from "./OverviewTab";
import ClientIssuesViewer from "./ClientIssuesViewer";
import ReplicationTab from "./ReplicationTab";
import DetailsTab from "./DetailsTab";
import QueueViewer from "./QueueViewer";
import ProcessedQueueViewer from "./ProcessedQueueViewer";
import SyncStatsViewer from "./SyncStatsViewer";

interface Props {
  className?: string;
  isDialog?: boolean;
}

const PowerSyncView: React.FC<Props> = ({ className }) => {
  const {
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
  } = usePowerSyncViewModel();

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                PowerSync Service
              </CardTitle>
              <CardDescription>
                Real-time sync service monitoring and status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
                className={
                  autoRefresh ? "bg-blue-50 dark:bg-blue-950" : undefined
                }
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
                />
                {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
              </Button>
              <Button
                onClick={checkHealth}
                disabled={isLoading}
                size="sm"
                variant="default"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Check Health
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="client-issues" className="flex-shrink-0">Client Issues</TabsTrigger>
              <TabsTrigger value="sync-stats" className="flex-shrink-0">Sync Stats</TabsTrigger>
              <TabsTrigger value="replication" className="flex-shrink-0">Replication</TabsTrigger>
              <TabsTrigger value="queue" className="flex-shrink-0">Pending Queue</TabsTrigger>
              <TabsTrigger value="processed" className="flex-shrink-0">Processed Queue</TabsTrigger>
              <TabsTrigger value="details" className="flex-shrink-0">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <OverviewTab
                healthData={healthData}
                isLoading={isLoading}
                error={error}
                lastChecked={lastChecked}
                formatUptime={formatUptime}
                getStatusBadgeColor={getStatusBadgeColor}
              />
            </TabsContent>

            <TabsContent value="client-issues" className="space-y-4 mt-4">
              <ClientIssuesViewer />
            </TabsContent>

            <TabsContent value="sync-stats" className="space-y-4 mt-4">
              <SyncStatsViewer />
            </TabsContent>

            <TabsContent value="replication" className="space-y-4 mt-4">
              <ReplicationTab healthData={healthData} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="queue" className="space-y-4 mt-4">
              <QueueViewer />
            </TabsContent>

            <TabsContent value="processed" className="space-y-4 mt-4">
              <ProcessedQueueViewer />
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <DetailsTab
                serviceUrl={serviceUrl}
                autoRefresh={autoRefresh}
                healthData={healthData}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PowerSyncView;
