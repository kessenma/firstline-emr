// apps/web/components/adminDashboard/sections/ClearTestDataView.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import {
  useClearTestDataViewModel,
  type PatientData,
} from "../delete-patients/ClearTestDataViewModel";
import {
  Search,
  Trash2,
  Clock,
  Phone,
  User,
  Hash,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/Alert";

interface ClearTestDataViewProps {
  isDialog?: boolean;
}

const ClearTestDataView = ({ isDialog = false }: ClearTestDataViewProps) => {
  const vm = useClearTestDataViewModel();
  const [hasLoadedRecent, setHasLoadedRecent] = React.useState(false);

  // Load recent patients when tab changes to 'recent'
  React.useEffect(() => {
    if (vm.searchType === "recent" && !hasLoadedRecent) {
      vm.loadRecentPatients();
      setHasLoadedRecent(true);
    }
  }, [vm.searchType]);

  // Reload when patient type filter changes
  React.useEffect(() => {
    if (vm.searchType === "recent" && hasLoadedRecent) {
      vm.loadRecentPatients();
    }
  }, [vm.patientTypeFilter]);

  // Format date for display
  const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Table columns for recently created patients
  const columns: TableColumn<PatientData>[] = [
    {
      key: "name",
      header: "Name",
      render: (value, patient) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
            {patient?.firstName?.[0]?.toUpperCase() || "?"}
            {patient?.lastName?.[0]?.toUpperCase() || ""}
          </div>
          <div className="font-medium text-sm">
            {patient?.firstName || ""} {patient?.lastName || ""}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (value, patient) => (
        <Badge
          variant={patient?.type === "medevac" ? "default" : "secondary"}
          className="text-xs"
        >
          {patient?.type === "medevac" ? "MedEvac" : "Regular"}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (value, patient) => (
        <span className="text-sm text-muted-foreground">
          {vm.formatPhoneNumber(patient?.phone)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value, patient) => (
        <Badge variant="outline" className="text-xs">
          {patient?.status || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (value, patient) => (
        <span className="text-xs text-muted-foreground">
          {patient?.createdAt ? formatDate(patient.createdAt) : "Unknown"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (value, patient) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => vm.handleDelete(patient)}
          disabled={!patient || vm.deleting === patient.id}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {vm.deleting === patient?.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ),
    },
  ];

  // Render search results
  const renderSearchResults = () => {
    if (vm.searchResults.length === 0) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Search Results ({vm.searchResults.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            data={vm.searchResults}
            columns={columns}
            stickyHeader={false}
            deletingId={vm.deleting}
            enableAnimations={true}
            enableDeleteAnimation={true}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Clear Test Data
        </h2>
        <p className="text-sm text-muted-foreground">
          Search and delete test patient data from the system
        </p>
      </div>

      <Separator />

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Deleting a patient will permanently remove all associated data
          including medical records, notes, and Telegram threads. This action
          cannot be undone.
        </AlertDescription>
      </Alert>

      {/* Patient Type Filter */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Filter by Type:</Label>
        <Select
          value={vm.patientTypeFilter}
          onValueChange={(value: any) =>
            vm.setPatientTypeFilter(value as "all" | "regular" | "medevac")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            <SelectItem value="regular">Regular Patients</SelectItem>
            <SelectItem value="medevac">MedEvac Patients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Tabs */}
      <Tabs
        value={vm.searchType}
        onValueChange={(value: string) => {
          vm.setSearchType(value as any);
          vm.clearSearchInputs();
          // Reset the loaded flag when changing tabs
          if (value !== "recent") {
            setHasLoadedRecent(false);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="h-4 w-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="id" className="gap-2">
            <Hash className="h-4 w-4" />
            Patient ID
          </TabsTrigger>
          <TabsTrigger value="phone" className="gap-2">
            <Phone className="h-4 w-4" />
            Phone
          </TabsTrigger>
          <TabsTrigger value="name" className="gap-2">
            <User className="h-4 w-4" />
            Name
          </TabsTrigger>
        </TabsList>

        {/* Recent Patients Tab */}
        <TabsContent value="recent" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base font-medium">
                  Recently Created Patients
                </CardTitle>
                <CardDescription>
                  Last 10 patients added to the system
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={vm.loadRecentPatients}
                disabled={vm.loading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${vm.loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {vm.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : vm.recentPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No recent patients found
                  </p>
                </div>
              ) : (
                <Table
                  data={vm.recentPatients}
                  columns={columns}
                  stickyHeader={false}
                  deletingId={vm.deleting}
                  enableAnimations={true}
                  enableDeleteAnimation={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient ID Search Tab */}
        <TabsContent value="id" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Search by Patient ID
              </CardTitle>
              <CardDescription>
                Enter the unique patient identifier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter patient ID (UUID)"
                    value={vm.patientId}
                    onChange={(e) => vm.setPatientId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") vm.handleSearch();
                    }}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={vm.handleSearch}
                  disabled={vm.loading || !vm.patientId.trim()}
                  className="gap-2"
                >
                  {vm.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
          {renderSearchResults()}
        </TabsContent>

        {/* Phone Search Tab */}
        <TabsContent value="phone" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Search by Phone Number
              </CardTitle>
              <CardDescription>
                Enter phone number (partial match supported)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    value={vm.phoneNumber}
                    onChange={(e) => vm.setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") vm.handleSearch();
                    }}
                  />
                </div>
                <Button
                  onClick={vm.handleSearch}
                  disabled={vm.loading || !vm.phoneNumber.trim()}
                  className="gap-2"
                >
                  {vm.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
          {renderSearchResults()}
        </TabsContent>

        {/* Name Search Tab */}
        <TabsContent value="name" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Search by Name
              </CardTitle>
              <CardDescription>
                Enter first name, last name, or both (partial match supported)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter first name"
                    value={vm.firstName}
                    onChange={(e) => vm.setFirstName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") vm.handleSearch();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter last name"
                    value={vm.lastName}
                    onChange={(e) => vm.setLastName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") vm.handleSearch();
                    }}
                  />
                </div>
              </div>
              <Button
                onClick={vm.handleSearch}
                disabled={
                  vm.loading || (!vm.firstName.trim() && !vm.lastName.trim())
                }
                className="w-full gap-2"
              >
                {vm.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search Patients
              </Button>
            </CardContent>
          </Card>
          {renderSearchResults()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClearTestDataView;
