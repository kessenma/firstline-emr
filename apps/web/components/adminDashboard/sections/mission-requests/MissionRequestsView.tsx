"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMissionRequestsViewModel,
  type MissionRequestRow,
} from "./MissionRequestsViewModel";

export default function MissionRequestsView() {
  const {
    requests,
    requestsByStatus,
    isLoading,
    isProcessing,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    handleReview,
  } = useMissionRequestsViewModel();

  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "deny" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MissionRequestRow | null>(null);

  const openReviewDialog = (request: MissionRequestRow, action: "approve" | "deny") => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes("");
    setIsReviewDialogOpen(true);
  };

  const closeReviewDialog = () => {
    setIsReviewDialogOpen(false);
    setSelectedRequest(null);
    setReviewAction(null);
    setReviewNotes("");
  };

  const handleConfirmReview = () => {
    if (!selectedRequest || !reviewAction) return;
    handleReview(selectedRequest.id, reviewAction, reviewNotes || undefined);
    closeReviewDialog();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "denied":
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const columns: TableColumn<MissionRequestRow>[] = [
    {
      key: "userName",
      header: "User",
      render: (value: unknown, request: MissionRequestRow) => (
        <div className="flex flex-col">
          <span className="font-medium">{value as string}</span>
          <span className="text-xs text-muted-foreground">{request.userEmail}</span>
          <span className="text-xs text-muted-foreground">{request.userAccountType}</span>
        </div>
      ),
    },
    {
      key: "missionName",
      header: "Mission",
      render: (value: unknown, request: MissionRequestRow) => (
        <div className="flex flex-col">
          <span className="font-medium">{value as string}</span>
          <span className="text-xs text-muted-foreground">{request.missionCountry}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: unknown) => getStatusBadge(value as string),
    },
    {
      key: "createdAt",
      header: "Requested",
      render: (value: unknown) => (
        <span className="text-sm">{new Date(value as string).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_: unknown, request: MissionRequestRow) => (
        <div className="flex space-x-2">
          {request.status === "pending" && (
            <>
              <Button
                onClick={() => openReviewDialog(request, "approve")}
                variant="outline"
                size="sm"
                className="bg-green-50 hover:bg-green-100 border-green-200"
                disabled={isProcessing}
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                onClick={() => openReviewDialog(request, "deny")}
                variant="outline"
                size="sm"
                className="bg-red-50 hover:bg-red-100 border-red-200"
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container flex flex-col px-4 py-8 mx-auto">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-foreground">Mission Join Requests</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{requestsByStatus.pending.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{requestsByStatus.approved.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Denied</p>
                <p className="text-2xl font-bold text-red-600">{requestsByStatus.denied.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-4">
        <div className="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Search by name, email, or mission"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10"
          />
          {searchTerm && (
            <Button
              onClick={() => setSearchTerm("")}
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(value: string) => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {isLoading ? (
          <div className="py-4 text-center bg-card text-foreground">Loading requests...</div>
        ) : requests.length > 0 ? (
          <Table
            data={requests}
            columns={columns}
            backgroundColor="background"
            textColor="foreground"
            borderColor="border"
            headerBackgroundColor="muted"
            headerTextColor="muted-foreground"
            hoverBackgroundColor="muted/50"
            hoverTextColor="foreground"
            stickyHeader={true}
          />
        ) : (
          <div className="py-8 text-center bg-card text-foreground rounded-lg border">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-medium">No mission join requests found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filterStatus !== "all"
                ? `No ${filterStatus} requests at this time.`
                : "There are no mission join requests to display."}
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={closeReviewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === "approve" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {reviewAction === "approve" ? "Approve" : "Deny"} Mission Join Request
            </DialogTitle>
            <DialogDescription>
              Review the details and provide optional notes.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="font-medium">{selectedRequest.userName}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.userEmail}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.userAccountType}</p>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Requesting to join:</p>
                <p className="font-medium">{selectedRequest.missionName}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.missionCountry}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewNotes">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add any notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {reviewAction === "approve" && (
                <p className="text-xs text-muted-foreground">
                  Approving will add this user to the mission and its group chat.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeReviewDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={isProcessing}
              className={
                reviewAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isProcessing
                ? "Processing..."
                : `Confirm ${reviewAction === "approve" ? "Approval" : "Denial"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
