"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Server,
  Smartphone,
} from "lucide-react";

interface PushMonitorServicesTabProps {
  notificationsServerHealth: any;
  gorushHealth: any;
  lastChecked: Date | null;
  formatUptime: (seconds: number) => string;
  getStatusBadgeColor: (status: string) => string;
}

const PushMonitorServicesTab: React.FC<PushMonitorServicesTabProps> = ({
  notificationsServerHealth,
  gorushHealth,
  lastChecked,
  formatUptime,
  getStatusBadgeColor,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notifications Server Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Notifications Server
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              {notificationsServerHealth && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                    notificationsServerHealth.status,
                  )}`}
                >
                  {notificationsServerHealth.status
                    .charAt(0)
                    .toUpperCase() +
                    notificationsServerHealth.status.slice(1)}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database:</span>
              {notificationsServerHealth && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    notificationsServerHealth.database_connected
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {notificationsServerHealth.database_connected
                    ? "Connected"
                    : "Disconnected"}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Gorush:</span>
              {notificationsServerHealth && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    notificationsServerHealth.gorush_connected
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {notificationsServerHealth.gorush_connected
                    ? "Connected"
                    : "Disconnected"}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Uptime:</span>
              <span className="text-sm">
                {notificationsServerHealth?.uptime !== undefined
                  ? formatUptime(notificationsServerHealth.uptime)
                  : "--"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Response:</span>
              <span className="text-sm">
                {notificationsServerHealth?.duration !== undefined
                  ? `${notificationsServerHealth.duration}ms`
                  : "--"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Gorush Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Gorush Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status:</span>
              {gorushHealth && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                    gorushHealth.status,
                  )}`}
                >
                  {gorushHealth.status.charAt(0).toUpperCase() +
                    gorushHealth.status.slice(1)}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Service:</span>
              <span className="text-sm">
                {gorushHealth?.service || "Push Notification Gateway"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Response:</span>
              <span className="text-sm">
                {gorushHealth?.duration !== undefined
                  ? `${gorushHealth.duration}ms`
                  : "--"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last Check:</span>
              <span className="text-sm">
                {lastChecked
                  ? lastChecked.toLocaleTimeString()
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {notificationsServerHealth?.status === "healthy" &&
        gorushHealth?.status === "healthy" && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>All Services Operational</AlertTitle>
            <AlertDescription>
              Push notification services are healthy and ready to send
              notifications to mobile devices.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
};

export default PushMonitorServicesTab;
