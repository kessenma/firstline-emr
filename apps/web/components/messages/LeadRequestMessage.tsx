// apps/web/components/messages/LeadRequestMessage.tsx
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { getAnonymizedName } from "@fajr/shared/patient-utils";

interface LeadRequestData {
  patientId: string;
  patientName: string;
  requestingUserId: string;
  requestingUserName: string;
  requestingCareTeamId: string;
  currentLeadUserId: string;
  currentLeadCareTeamId: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
}

interface LeadRequestMessageProps {
  messageText: string;
  isSelf: boolean;
  currentUserId: string;
  messageId: string;
  threadId: string;
  onStatusUpdate?: () => void;
}

export const LeadRequestMessage: React.FC<LeadRequestMessageProps> = ({
  messageText,
  isSelf,
  currentUserId,
  messageId,
  threadId,
  onStatusUpdate,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  let data: LeadRequestData | null = null;
  try {
    data = JSON.parse(messageText);
  } catch {
    return <div className="text-sm text-destructive">Invalid lead request</div>;
  }

  if (!data || !data.patientId) {
    return <div className="text-sm text-destructive">Invalid lead request</div>;
  }

  const isCurrentLead = currentUserId === data.currentLeadUserId;
  const status = localStatus || data.status;
  const isPending = status === "pending";

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/patient/care-team/lead-request/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          threadId,
          patientId: data!.patientId,
          requestingUserId: data!.requestingUserId,
          requestingCareTeamId: data!.requestingCareTeamId,
          currentLeadCareTeamId: data!.currentLeadCareTeamId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to accept");
      }
      setLocalStatus("accepted");
      onStatusUpdate?.();
    } catch (err) {
      console.error("Failed to accept lead request:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/patient/care-team/lead-request/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          threadId,
          patientId: data!.patientId,
          requestingUserId: data!.requestingUserId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to decline");
      }
      setLocalStatus("declined");
      onStatusUpdate?.();
    } catch (err) {
      console.error("Failed to decline lead request:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadges: Record<string, React.ReactNode> = {
    pending: <Badge variant="secondary">Pending</Badge>,
    accepted: (
      <Badge variant="default" className="bg-green-600 hover:bg-green-600">
        Accepted
      </Badge>
    ),
    declined: <Badge variant="destructive">Declined</Badge>,
  };

  return (
    <div className="border rounded-xl p-3 bg-card max-w-full text-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">Lead Request</span>
        {statusBadges[status]}
      </div>

      {/* Patient */}
      <div className="text-xs text-muted-foreground mb-1">
        Patient: <strong>{data.patientName}</strong>
      </div>

      {/* Requesting Doctor */}
      <div className="text-xs text-muted-foreground mb-1">
        {data.requestingUserName} is requesting to become lead surgeon.
      </div>

      {/* Optional message */}
      {data.message && (
        <div className="text-sm bg-muted/50 rounded p-2 mt-1 mb-2 italic">
          &ldquo;{data.message}&rdquo;
        </div>
      )}

      {/* Actions -- only for the current lead, only when pending */}
      {isCurrentLead && isPending && (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {actionLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDecline}
            disabled={actionLoading}
            className="text-destructive hover:text-destructive"
          >
            {actionLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Decline
          </Button>
        </div>
      )}

      {/* View chart link */}
      <div className="flex justify-end mt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={() => window.open(`/patient/${data!.patientId}`, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
          View Chart
        </Button>
      </div>
    </div>
  );
};
