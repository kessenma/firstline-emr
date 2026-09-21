// apps/web/components/adminDashboard/sections/notifications/AdminPushDevicesView.tsx
"use client";

import React from "react";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Smartphone,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  User,
  Calendar,
  Cpu,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import {
  useAdminPushDevicesViewModel,
  type PushDevice,
} from "./AdminPushDevicesViewModel";

export function AdminPushDevicesView() {
  const {
    // Data
    filteredDevices,
    stats,

    // Loading states
    isLoading,
    actionLoading,

    // Error handling
    error,

    // Filters
    searchQuery,
    platformFilter,
    statusFilter,
    environmentFilter,

    // View mode
    viewMode,

    // Actions
    setSearchQuery,
    setPlatformFilter,
    setStatusFilter,
    setEnvironmentFilter,
    setViewMode,
    fetchDevices,
    handleDeactivate,
    handleReactivate,
    handleDelete,
    handleSendTestNotification,
  } = useAdminPushDevicesViewModel();

  const columns: TableColumn<PushDevice>[] = [
    {
      key: "user",
      header: "User",
      render: (value, device) => {
        if (!device) return <span>-</span>;
        return (
          <div className="min-w-[150px]">
            <div className="font-medium text-foreground">
              {device.userName || "Unknown"}
            </div>
            <div className="text-sm text-muted-foreground">
              {device.userEmail || "No email"}
            </div>
          </div>
        );
      },
    },
    {
      key: "device",
      header: "Device",
      render: (value, device) => {
        if (!device || !device.platform) return <span>-</span>;
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">
                {device.platform === "ios" ? "iOS" : "Android"}
              </span>
            </div>
            {device.deviceModel && (
              <div className="text-sm text-muted-foreground mt-1">
                {device.deviceModel}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "version",
      header: "App Version",
      render: (value, device) => {
        if (!device) return <span>-</span>;
        return (
          <div className="min-w-[100px]">
            {device.appVersion ? (
              <div>
                <div className="font-medium">{device.appVersion}</div>
                {device.buildNumber && (
                  <div className="text-xs text-muted-foreground">
                    Build {device.buildNumber}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">N/A</span>
            )}
          </div>
        );
      },
    },
    {
      key: "environment",
      header: "Environment",
      render: (value, device) => {
        if (!device || !device.environment) return <span>-</span>;
        return (
          <div className="min-w-[90px]">
            <Badge
              variant={device.environment === "prod" ? "default" : "outline"}
            >
              {device.environment.toUpperCase()}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value, device) => {
        if (!device || device.isActive === undefined) return <span>-</span>;
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center gap-2">
              {device.isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    Active
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">Inactive</span>
                </>
              )}
            </div>
            {device.lastSeenAt && (
              <div className="text-xs text-muted-foreground mt-1">
                Last seen:{" "}
                {format(new Date(device.lastSeenAt), "MMM d, yyyy HH:mm")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "created",
      header: "Created",
      render: (value, device) => {
        if (!device || !device.createdAt) return <span>-</span>;
        return (
          <div className="min-w-[100px] text-sm text-muted-foreground">
            {format(new Date(device.createdAt), "MMM d, yyyy")}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, device) => {
        if (!device || !device.id) return <span>-</span>;
        return (
          <div className="flex gap-2 min-w-[200px]">
            {device.isActive && (
              <Button
                size="sm"
                variant="default"
                onClick={async () => {
                  try {
                    await handleSendTestNotification(device.id);
                    alert("Test notification sent successfully!");
                  } catch (error) {
                    alert("Failed to send test notification");
                  }
                }}
                disabled={actionLoading === device.id}
                title="Send test notification"
              >
                {actionLoading === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
            {device.isActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeactivate(device.id)}
                disabled={actionLoading === device.id}
              >
                {actionLoading === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="ml-2">Deactivate</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReactivate(device.id)}
                disabled={actionLoading === device.id}
              >
                {actionLoading === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                <span className="ml-2">Reactivate</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to permanently delete this device?",
                  )
                ) {
                  handleDelete(device.id);
                }
              }}
              disabled={actionLoading === device.id}
            >
              {actionLoading === device.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Push Devices Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage push notification devices
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setViewMode(viewMode === "table" ? "cards" : "table")
            }
          >
            {viewMode === "table" ? (
              <>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Cards
              </>
            ) : (
              <>
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDevices}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeDevices}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Platform Split
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">iOS</div>
                  <div className="text-xl font-bold">{stats.iosDevices}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Android</div>
                  <div className="text-xl font-bold">
                    {stats.androidDevices}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Prod</div>
                  <div className="text-xl font-bold">
                    {stats.prodEnvironment}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Dev</div>
                  <div className="text-xl font-bold">
                    {stats.devEnvironment}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User, email, device..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Platform Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Environment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment</label>
              <Select
                value={environmentFilter}
                onValueChange={setEnvironmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All environments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                  <SelectItem value="dev">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading devices...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devices Table or Cards */}
      {!isLoading && (
        <>
          {viewMode === "table" ? (
            <Card>
              <CardContent className="pt-6">
                {filteredDevices.length > 0 ? (
                  <Table
                    columns={columns}
                    data={filteredDevices.filter((d) => d != null)}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No devices found
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <Card key={device.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5" />
                          <CardTitle className="text-base">
                            {device.platform === "ios" ? "iOS" : "Android"}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={
                            device.environment === "prod"
                              ? "default"
                              : "outline"
                          }
                        >
                          {device.environment.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>
                        {device.deviceModel || "Unknown device"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* User Info */}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {device.userName || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {device.userEmail || "No email"}
                          </div>
                        </div>
                      </div>

                      {/* Version Info */}
                      {device.appVersion && (
                        <div className="flex items-start gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="text-sm">{device.appVersion}</div>
                            {device.buildNumber && (
                              <div className="text-xs text-muted-foreground">
                                Build {device.buildNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {device.isActive ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive font-medium">
                              Inactive
                            </span>
                          </>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mt-0.5" />
                        <div>
                          <div>
                            Last seen:{" "}
                            {format(
                              new Date(device.lastSeenAt),
                              "MMM d, yyyy HH:mm",
                            )}
                          </div>
                          <div>
                            Created:{" "}
                            {format(new Date(device.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-2">
                        {device.isActive && (
                          <Button
                            size="sm"
                            variant="default"
                            className="w-full"
                            onClick={async () => {
                              try {
                                await handleSendTestNotification(device.id);
                                alert("Test notification sent successfully!");
                              } catch (error) {
                                alert("Failed to send test notification");
                              }
                            }}
                            disabled={actionLoading === device.id}
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Test
                              </>
                            )}
                          </Button>
                        )}
                        <div className="flex gap-2">
                          {device.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleDeactivate(device.id)}
                              disabled={actionLoading === device.id}
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleReactivate(device.id)}
                              disabled={actionLoading === device.id}
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Reactivate
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to permanently delete this device?",
                                )
                              ) {
                                handleDelete(device.id);
                              }
                            }}
                            disabled={actionLoading === device.id}
                          >
                            {actionLoading === device.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      No devices found
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
