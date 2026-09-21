"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioCard } from "@/components/ui/radio-card";
import { Loader2, ShieldQuestion, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getRolesForAccountType,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type CareTeamRole,
} from "@fajr/shared/care-team";

interface RequestChartAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
  /** Why access was refused — comes from `evaluateChartAccess`. */
  message?: string | null;
  /** Called once the user has joined the care team and may proceed. */
  onGranted: () => void;
}

/**
 * Shown when someone opens a chart they are not cleared for.
 *
 * Patients are never hidden from the dashboard; specialty is enforced here
 * instead. Joining the care team is what grants access, and the resulting
 * `patient_care_team` row is the record of who opened the record.
 */
export function RequestChartAccessModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  message,
  onGranted,
}: RequestChartAccessModalProps) {
  const { data: session } = useSession();
  const accountType = (session?.user as any)?.accountType as string | undefined;
  const availableRoles = getRolesForAccountType(accountType || "");

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!selectedRole) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patient/${encodeURIComponent(patientId)}/take-case`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: selectedRole as CareTeamRole }),
        },
      );
      if (!res.ok) throw new Error("Failed to join the care team");
      onOpenChange(false);
      onGranted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join the care team",
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-primary" />
            Join this patient&apos;s care team
          </DialogTitle>
          <DialogDescription>
            {message ||
              "This patient is not assigned to your specialty."}
            {patientName ? ` (${patientName})` : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Joining records you on the care team so there is a clear trail of who
          accessed this record.
        </p>

        {availableRoles.length === 0 ? (
          <p className="text-sm text-destructive">
            Your account type cannot join care teams. Ask an administrator for
            access.
          </p>
        ) : (
          <RadioCard.Root
            value={selectedRole}
            onValueChange={setSelectedRole}
            className="flex flex-col gap-2"
          >
            {availableRoles.map((role) => (
              <RadioCard.Item key={role} value={role}>
                <div className="text-sm font-medium">{ROLE_LABELS[role]}</div>
                <div className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </div>
              </RadioCard.Item>
            ))}
          </RadioCard.Root>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!selectedRole || joining || availableRoles.length === 0}
          >
            {joining ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Join &amp; open chart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
