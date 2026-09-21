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
  Smartphone,
  Zap,
  BarChart3,
  Send,
} from "lucide-react";

interface PushMonitorStatsTabProps {
  stats: any;
  isLoading: boolean;
  formatNumber: (num: number) => string;
}

const PushMonitorStatsTab: React.FC<PushMonitorStatsTabProps> = ({
  stats,
  isLoading,
  formatNumber,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? formatNumber(stats.total_sent) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All-time notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              iOS Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats ? formatNumber(stats.ios_sent) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              APNs notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Android Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats ? formatNumber(stats.android_sent) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              FCM notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats ? formatNumber(stats.failed) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Delivery failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Last 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? formatNumber(stats.last_24h) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Recent activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Last Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats ? formatNumber(stats.last_hour) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current rate
            </p>
          </CardContent>
        </Card>
      </div>

      {!stats && !isLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Statistics Available</AlertTitle>
          <AlertDescription>
            Statistics tracking is not yet configured. Check back later.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PushMonitorStatsTab;
