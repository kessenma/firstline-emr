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
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Server,
  Zap,
  Play,
} from "lucide-react";

interface OverviewTabProps {
  healthData: any;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
  formatUptime: (seconds: number) => string;
  getStatusBadgeColor: (status: string) => string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  healthData,
  isLoading,
  error,
  lastChecked,
  formatUptime,
  getStatusBadgeColor,
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
        {/* Service Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData ? (
              <div className="flex items-center gap-2">
                {healthData.ready ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                )}
                <Badge
                  className={getStatusBadgeColor(
                    healthData.ready ? "healthy" : "loading",
                  )}
                >
                  {healthData.ready ? "Healthy" : "Starting"}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <Badge variant="outline">Unknown</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData && healthData.touched_at ? (
              <div>
                <p className="text-2xl font-bold">
                  {formatUptime(
                    Math.floor(
                      (Date.now() -
                        new Date(healthData.touched_at).getTime()) /
                        1000,
                    ),
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Since last activity
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">
                --
              </p>
            )}
          </CardContent>
        </Card>

        {/* Started Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Play className="h-4 w-4" />
              Service Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData ? (
              <div className="flex items-center gap-2">
                {healthData.started ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-2xl font-bold">
                  {healthData.started ? "Yes" : "No"}
                </span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">
                --
              </p>
            )}
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData?.duration !== undefined ? (
              <div>
                <p className="text-2xl font-bold">
                  {healthData.duration}
                  <span className="text-sm font-normal text-muted-foreground">
                    ms
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Last check
                </p>
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

export default OverviewTab;
