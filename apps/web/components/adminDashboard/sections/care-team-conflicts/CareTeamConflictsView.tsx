"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import {
  useCareTeamConflictsViewModel,
  type CareTeamConflictItem,
  type ConflictUser,
} from "./CareTeamConflictsViewModel";

export default function CareTeamConflictsView() {
  const {
    conflicts,
    isLoading,
    isResolving,
    handleResolveConflict,
  } = useCareTeamConflictsViewModel();

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] =
    useState<CareTeamConflictItem | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const openResolveDialog = (conflict: CareTeamConflictItem) => {
    setSelectedConflict(conflict);
    setSelectedWinnerId(null);
    setResolutionNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedConflict || !selectedWinnerId) return;
    await handleResolveConflict(
      selectedConflict.id,
      selectedWinnerId,
      resolutionNotes || undefined,
    );
    setResolveDialogOpen(false);
    setSelectedConflict(null);
  };

  const columns: TableColumn<CareTeamConflictItem>[] = [
    {
      key: "patientName" as any,
      header: "Patient",
      render: (_: any, conflict: CareTeamConflictItem) => (
        <span className="font-medium">
          {conflict.patientFirstName || ""} {conflict.patientLastName || ""}
        </span>
      ),
    },
    {
      key: "conflictingUsers" as any,
      header: "Conflicting Doctors",
      render: (_: any, conflict: CareTeamConflictItem) => (
        <div className="space-y-1">
          {conflict.conflictingUsers.map((user: ConflictUser) => (
            <div key={user.id} className="text-sm">
              <span className="font-medium">
                {user.firstName || ""} {user.lastName || ""}
              </span>
              <span className="text-muted-foreground ml-1">({user.email})</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Detected",
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      key: "actions" as any,
      header: "Actions",
      render: (_: any, conflict: CareTeamConflictItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openResolveDialog(conflict)}
        >
          Resolve
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">
            Care Team Conflicts
            {conflicts.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {conflicts.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conflicts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
          <p className="text-muted-foreground">
            No unresolved care team conflicts.
          </p>
        </div>
      ) : (
        <Table
          data={conflicts}
          columns={columns}
          backgroundColor="card"
          textColor="foreground"
          borderColor="border"
          headerBackgroundColor="card"
          headerTextColor="muted-foreground"
          hoverBackgroundColor="muted"
          hoverTextColor="foreground"
          stickyHeader={true}
        />
      )}

      {/* Resolve Conflict Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="shadow-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Care Team Conflict</DialogTitle>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">
                  {selectedConflict.patientFirstName || ""}{" "}
                  {selectedConflict.patientLastName || ""}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the lead doctor for this patient:
                </p>
                <RadioGroup
                  value={selectedWinnerId || ""}
                  onValueChange={setSelectedWinnerId}
                  className="space-y-2"
                >
                  {selectedConflict.conflictingUsers.map(
                    (user: ConflictUser) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedWinnerId === user.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={user.id} />
                        <div>
                          <p className="font-medium text-sm">
                            {user.firstName || ""} {user.lastName || ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                            {user.accountType ? ` - ${user.accountType}` : ""}
                          </p>
                        </div>
                      </label>
                    ),
                  )}
                </RadioGroup>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  Resolution Notes (optional)
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about why this doctor was chosen..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResolveDialogOpen(false)}
                  disabled={isResolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={!selectedWinnerId || isResolving}
                >
                  {isResolving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Resolve Conflict
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
