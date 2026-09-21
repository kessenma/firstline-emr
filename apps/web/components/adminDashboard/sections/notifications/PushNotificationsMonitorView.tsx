"use client";

import React, { useState } from "react";
import { usePushNotificationsMonitorViewModel } from "./PushNotificationsMonitorViewModel";
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
  Bell,
  Loader2,
  RefreshCw,
} from "lucide-react";
import PushMonitorOverviewTab from "./push-monitor/PushMonitorOverviewTab";
import PushMonitorServicesTab from "./push-monitor/PushMonitorServicesTab";
import PushMonitorStatsTab from "./push-monitor/PushMonitorStatsTab";
import PushMonitorDetailsTab from "./push-monitor/PushMonitorDetailsTab";

interface Props {
  className?: string;
}

const PushNotificationsMonitorView: React.FC<Props> = ({ className }) => {
  const {
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
  } = usePushNotificationsMonitorViewModel();

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications Monitoring
              </CardTitle>
              <CardDescription>
                Real-time monitoring of notifications-server and gorush services
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <PushMonitorOverviewTab
                notificationsServerHealth={notificationsServerHealth}
                gorushHealth={gorushHealth}
                error={error}
                lastChecked={lastChecked}
                formatUptime={formatUptime}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="services" className="space-y-4 mt-4">
              <PushMonitorServicesTab
                notificationsServerHealth={notificationsServerHealth}
                gorushHealth={gorushHealth}
                lastChecked={lastChecked}
                formatUptime={formatUptime}
                getStatusBadgeColor={getStatusBadgeColor}
              />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-4">
              <PushMonitorStatsTab
                stats={stats}
                isLoading={isLoading}
                formatNumber={formatNumber}
              />
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <PushMonitorDetailsTab
                notificationsServerUrl={notificationsServerUrl}
                gorushUrl={gorushUrl}
                notificationsServerHealth={notificationsServerHealth}
                gorushHealth={gorushHealth}
                stats={stats}
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

export default PushNotificationsMonitorView;
