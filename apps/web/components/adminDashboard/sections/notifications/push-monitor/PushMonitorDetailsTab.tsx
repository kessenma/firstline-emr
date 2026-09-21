"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings } from "lucide-react";

interface PushMonitorDetailsTabProps {
  notificationsServerUrl: string;
  gorushUrl: string;
  notificationsServerHealth: any;
  gorushHealth: any;
  stats: any;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
}

const PushMonitorDetailsTab: React.FC<PushMonitorDetailsTabProps> = ({
  notificationsServerUrl,
  gorushUrl,
  notificationsServerHealth,
  gorushHealth,
  stats,
  showAdvanced,
  setShowAdvanced,
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between py-2">
              <span className="font-medium">
                Notifications Server URL:
              </span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {notificationsServerUrl}
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Gorush URL:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {gorushUrl}
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Health Endpoint:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/notifications/health
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Send Push Endpoint:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/push/send
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Batch Send Endpoint:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/push/send-batch
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Device Token API:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/user/device-token
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">APNs Platform:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                Production (platform=1)
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">FCM Platform:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                Production (platform=2)
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Advanced Information
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(
                  {
                    notificationsServer: notificationsServerHealth,
                    gorush: gorushHealth,
                    stats: stats,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-2">
              Notifications Server Not Responding:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Check if notifications-server container is running</li>
              <li>Verify DATABASE_URL environment variable is set</li>
              <li>Check logs for connection errors</li>
              <li>Ensure port 8080 is not blocked</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Gorush Service Issues:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Verify APNS_KEY_BASE64 environment variable is set</li>
              <li>Check gorush container logs for errors</li>
              <li>Ensure .p8 key file is valid and not expired</li>
              <li>Verify APNs key_id and team_id are correct</li>
              <li>Check if port 8088 is accessible</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              Push Notifications Not Delivering:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Verify device tokens are registered in database</li>
              <li>Check if push_notifications_enabled is true</li>
              <li>Ensure mobile app has notification permissions</li>
              <li>Verify APNs certificate is for production</li>
              <li>Check gorush logs for delivery failures</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              Database Connection Errors:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Verify PostgreSQL is running and accessible</li>
              <li>Check DATABASE_URL format and credentials</li>
              <li>Ensure user_settings table exists with device token columns</li>
              <li>Run migrations if schema is outdated</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              Multi-Device Token Issues:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Device tokens are stored as arrays (TEXT[])</li>
              <li>Check if tokens are being added correctly</li>
              <li>Verify duplicate tokens are not being added</li>
              <li>Mobile app should call /api/user/device-token on login</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PushMonitorDetailsTab;
