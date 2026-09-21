"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, User, Stethoscope } from "lucide-react";
import { PatientDetailSheet } from "./PatientDetailSheet";
import { getAnonymizedName } from "@fajr/shared/patient-utils";
import { parsePatientCard } from "@fajr/shared/patient-share";

interface PatientCardMessageProps {
  messageText: string;
  isSelf: boolean;
}

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "secondary";
  if (status.includes("Not Cleared")) return "destructive";
  if (status.includes("Discharged")) return "secondary";
  return "default";
}

function getPriorityVariant(priority: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!priority || priority === "Not Selected") return "secondary";
  if (priority === "Emergency" || priority === "Urgent") return "destructive";
  if (priority === "Moderate") return "default";
  return "outline";
}

export const PatientCardMessage: React.FC<PatientCardMessageProps> = ({
  messageText,
  isSelf,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const data = useMemo(() => parsePatientCard(messageText), [messageText]);

  if (!data) {
    return <div className="text-sm text-destructive">Invalid patient card</div>;
  }

  const name = getAnonymizedName(data.firstName, data.lastName);

  return (
    <>
      <div
        className="border rounded-xl p-3 bg-card cursor-pointer hover:bg-accent/50 transition-colors max-w-full"
        onClick={() => setSheetOpen(true)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{name}</div>
            {data.hospital && (
              <div className="text-[10px] text-muted-foreground">{data.hospital}</div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-1.5">
          {data.status && (
            <Badge variant={getStatusVariant(data.status)} className="text-[10px] px-1.5 py-0">
              {data.status}
            </Badge>
          )}
          {data.priority && data.priority !== "Not Selected" && (
            <Badge variant={getPriorityVariant(data.priority)} className="text-[10px] px-1.5 py-0">
              {data.priority}
            </Badge>
          )}
        </div>

        {/* Specialties */}
        {data.specialties && data.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {data.specialties.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                <Stethoscope className="h-2.5 w-2.5" />
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Chief Complaint */}
        {data.chiefComplaint && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {data.chiefComplaint}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/patient/${data.patientId}`, "_blank");
            }}
          >
            <ExternalLink className="h-3 w-3" />
            View Chart
          </Button>
        </div>
      </div>

      <PatientDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        patientId={data.patientId}
      />
    </>
  );
};
