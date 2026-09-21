// apps/web/components/patient-chart/Medications/rx/CancelPrescriptionDialog.tsx
//
// The confirm shared by the clinician and pharmacy cancel flows.
//
// The warning that the reason reaches the patient sits *above* the box, not
// below it. Told afterwards, someone has already written a clinical note to a
// colleague and has to go back and rewrite it for a patient.
'use client';

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import {
  isCancellationReasonRequired,
  type RxCancellerRole,
} from "@fajr/shared/medications";

interface CancelPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives whether the reason is demanded and how the warning is worded. */
  role: Extract<RxCancellerRole, "doctor" | "pharmacist">;
  submitting: boolean;
  onConfirm: (reason: string) => void;
}

export const CancelPrescriptionDialog: React.FC<CancelPrescriptionDialogProps> = ({
  open,
  onOpenChange,
  role,
  submitting,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  const reasonRequired = isCancellationReasonRequired(role);

  // Reopening for a different prescription must not inherit the last reason —
  // sending one script's explanation to another patient is a real hazard.
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const canConfirm = (!reasonRequired || !!reason.trim()) && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Cancel this prescription?
          </DialogTitle>
          <DialogDescription>
            This cannot be undone. The prescription link and QR code stop
            working immediately, and a replacement has to be a new prescription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Before the box, deliberately. */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              The patient will be told on Telegram, and{" "}
              <strong>your reason is sent to them word for word</strong>. Write
              it for the patient, not for the chart.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              Reason{" "}
              {reasonRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </Label>
            <Textarea
              id="cancellation-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                role === "pharmacist"
                  ? "e.g. This medication is out of stock until Monday."
                  : "e.g. Switching you to a different medication."
              }
            />
            {reasonRequired && (
              <p className="text-xs text-muted-foreground">
                A reason is required: without one the patient is left to work
                out for themselves why their prescription stopped working.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelPrescriptionDialog;
