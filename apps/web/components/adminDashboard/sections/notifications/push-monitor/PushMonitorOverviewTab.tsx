"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Server,
  Smartphone,
  Database,
} from "lucide-react";

interface PushMonitorOverviewTabProps {
  notificationsServerHealth: any;
  gorushHealth: any;
  error: string | null;
  lastChecked: Date | null;
  formatUptime: (seconds: number) => string;
  getStatusColor: (status: string) => string;
}

const PushMonitorOverviewTab: React.FC<PushMonitorOverviewTabProps> = ({
  notificationsServerHealth,
  gorushHealth,
  error,
  lastChecked,
  formatUptime,
  getStatusColor,
}) => {
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Notifications Server Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Notifications Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notificationsServerHealth ? (
              <div className="flex items-center gap-2">
                {notificationsServerHealth.status === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-2xl font-bold ${getStatusColor(
                    notificationsServerHealth.status,
                  )}`}
                >
                  {notificationsServerHealth.status
                    .charAt(0)
                    .toUpperCase() +
                    notificationsServerHealth.status.slice(1)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold text-muted-foreground">
                  Unknown
                </span>
              </div>
            )}
            {notificationsServerHealth?.duration && (
              <p className="text-xs text-muted-foreground mt-1">
                Response: {notificationsServerHealth.duration}ms
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gorush Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Gorush Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gorushHealth ? (
              <div className="flex items-center gap-2">
                {gorushHealth.status === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-2xl font-bold ${getStatusColor(
                    gorushHealth.status,
                  )}`}
                >
                  {gorushHealth.status.charAt(0).toUpperCase() +
                    gorushHealth.status.slice(1)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-bold text-muted-foreground">
                  Unknown
                </span>
              </div>
            )}
            {gorushHealth?.duration && (
              <p className="text-xs text-muted-foreground mt-1">
                Response: {gorushHealth.duration}ms
              </p>
            )}
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Server Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notificationsServerHealth?.uptime !== undefined ? (
              <div>
                <p className="text-2xl font-bold">
                  {formatUptime(notificationsServerHealth.uptime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Since last restart
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">
                --
              </p>
            )}
          </CardContent>
        </Card>

        {/* Database Connection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notificationsServerHealth ? (
              <div className="flex items-center gap-2">
                {notificationsServerHealth.database_connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`text-2xl font-bold ${
                    notificationsServerHealth.database_connected
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {notificationsServerHealth.database_connected
                    ? "Connected"
                    : "Disconnected"}
                </span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">
                --
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {lastChecked && (
        <div className="text-sm text-muted-foreground text-center">
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default PushMonitorOverviewTab;
