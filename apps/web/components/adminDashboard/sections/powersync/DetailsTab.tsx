"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings } from "lucide-react";

interface DetailsTabProps {
  serviceUrl: string;
  autoRefresh: boolean;
  healthData: any;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
}

const DetailsTab: React.FC<DetailsTabProps> = ({
  serviceUrl,
  autoRefresh,
  healthData,
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
              <span className="font-medium">Internal URL:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {serviceUrl}
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">WebSocket Endpoint:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                wss://sync.fajrmission.org
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">
                Health Check Endpoint:
              </span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/powersync/health
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Token Endpoint (Web):</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/auth/powersync-token
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">
                Token Endpoint (Mobile):
              </span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                /api/auth/mobile-login
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">JWT Key ID (kid):</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                fajr-emr-key
              </code>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">JWT Algorithm:</span>
              <Badge variant="outline">HS256</Badge>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-medium">Auto-Refresh:</span>
              <Badge variant={autoRefresh ? "default" : "secondary"}>
                {autoRefresh ? "Enabled (30s)" : "Disabled"}
              </Badge>
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
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(healthData, null, 2)}
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
              Service Not Responding:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Check if PowerSync container is running</li>
              <li>Verify Docker network connectivity</li>
              <li>Review PowerSync container logs</li>
              <li>Check PostgreSQL connection</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              JWT Authentication Errors:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>
                <strong>Missing &apos;sub&apos; claim:</strong> Users
                must log out and back in to get fresh tokens
              </li>
              <li>
                <strong>Signature verification failed:</strong> Check
                JWT_SECRET is base64-decoded in both endpoints
              </li>
              <li>
                <strong>Could not find appropriate key:</strong> Verify
                kid header matches &quot;fajr-emr-key&quot;
              </li>
              <li>
                Ensure JWT_SECRET matches in web and PowerSync
                containers
              </li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              Mobile App Connection Issues:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>
                User must log out completely and log back in after token
                changes
              </li>
              <li>
                Verify token includes: kid header, sub claim, correct
                signature
              </li>
              <li>
                Check mobile app is pointing to wss://sync.fajrmission.org
              </li>
              <li>Force quit app if old tokens are cached</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">
              Service Started but Not Ready:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Wait 30-60 seconds for startup</li>
              <li>Check for replication lock errors</li>
              <li>Verify sync rules are configured</li>
              <li>Review startup logs</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Slow Response Times:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Check database query performance</li>
              <li>Monitor container resource usage</li>
              <li>Review replication lag</li>
              <li>Consider scaling resources</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailsTab;
