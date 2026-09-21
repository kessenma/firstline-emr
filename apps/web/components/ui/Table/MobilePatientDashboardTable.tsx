// @ts-nocheck
"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Stethoscope,
  StickyNote,
  MessageSquare,
  User,
  IdCard,
  Languages,
  ExternalLink,
  Hospital,
} from "lucide-react";

import ReadOnlyField from "@/components/form/ReadOnlyField";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { dobToAge, formatLocation } from "@/utils/patientUtils";
import type { PatientWithMessages } from "@/components/patient-dashboard/types/patient-table-types";

interface MobilePatientDashboardTableProps {
  data: PatientWithMessages[];
  onRowClick?: (item: PatientWithMessages) => void;
  renderActions?: (item: PatientWithMessages) => ReactNode;
  className?: string;
  activePatientDrawer?: string | null; // ID of patient with active drawer
}

export function MobilePatientDashboardTable({
  data,
  onRowClick,
  renderActions,
  className,
  activePatientDrawer,
}: MobilePatientDashboardTableProps) {
  const [navigatingPatientId, setNavigatingPatientId] = useState<string | null>(
    null,
  );

  const handleExternalLinkClick = async (
    patient: PatientWithMessages,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent card click from also firing

    console.log("🔍 Mobile handleExternalLinkClick called:", {
      patient: patient,
      patientKeys: Object.keys(patient),
      patientId: patient.id,
      patientIdType: typeof patient.id,
      hasOnRowClick: !!onRowClick,
      onRowClickType: typeof onRowClick,
    });

    // Check if patient.id exists before proceeding
    if (!patient.id) {
      console.error("❌ Patient ID is missing, cannot navigate", {
        patient: patient,
        availableKeys: Object.keys(patient),
      });
      return;
    }

    const patientId = patient.id.toString();
    setNavigatingPatientId(patientId);

    console.log("🚀 About to call onRowClick with patient:", patientId);

    try {
      // Call onRowClick with entire patient object (same as desktop version)
      // The callback will extract patientId and doctor as needed
      if (onRowClick) {
        console.log("✅ Calling onRowClick...");
        await onRowClick(patient);
        console.log("✅ onRowClick completed");
      } else {
        console.warn("⚠️ onRowClick is not defined!");
      }
    } catch (error) {
      console.error("❌ Error in onRowClick:", error);
    } finally {
      // Clear loading state after a short delay to ensure navigation has started
      setTimeout(() => setNavigatingPatientId(null), 1000);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-lg text-muted-foreground">No patients found</div>
        <div className="mt-2 text-sm text-muted-foreground/70">
          Check your filters or try refreshing
        </div>
      </div>
    );
  }

  // Function to render icon for a field
  const renderIcon = (key: string, className: string = "h-4 w-4") => {
    const iconColor = "#c71e07";

    switch (key) {
      case "status":
        return <Activity className={className} color={iconColor} />;
      case "priority":
        return <AlertTriangle className={className} color={iconColor} />;
      case "specialty":
        return <Stethoscope className={className} color={iconColor} />;
      case "notes":
        return <StickyNote className={className} color={iconColor} />;
      case "messages":
        return <MessageSquare className={className} color={iconColor} />;
      case "user":
        return <User className={className} color={iconColor} />;
      case "doctor":
        return (
          <RoleIcon
            accountType="Doctor"
            colored={false}
            className={className}
            color={iconColor}
          />
        );
      case "id":
        return <IdCard className={className} color={iconColor} />;
      case "language":
        return <Languages className={className} color={iconColor} />;
      case "externalLink":
        return <ExternalLink className={className} color={iconColor} />;
      case "hospital":
        return <Hospital className={className} color={iconColor} />;

      default:
        return null;
    }
  };

  // Function to render a field with icon and label
  const renderField = (
    label: string,
    value: string | ReactNode,
    iconKey?: string,
    className?: string,
  ) => {
    return (
      <div className={cn("flex gap-1.5 sm:gap-2 items-center min-w-0", className)}>
        {iconKey && <div className="shrink-0">{renderIcon(iconKey, "h-3.5 w-3.5 sm:h-4 sm:w-4")}</div>}
        <div className="flex flex-1 gap-1.5 sm:gap-2 items-center min-w-0">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
            {label}:
          </span>
          <span className="flex-1 text-xs sm:text-sm text-foreground truncate">
            {value || "N/A"}
          </span>
        </div>
      </div>
    );
  };

  // Function to render icon-only field (no text label)
  const renderIconOnly = (
    value: string | ReactNode,
    iconKey: string,
    className?: string,
  ) => {
    return (
      <div
        className={cn("flex gap-1.5 sm:gap-2 items-center min-w-0", className)}
        title={String(value)}
      >
        <div className="shrink-0">{renderIcon(iconKey, "h-3.5 w-3.5 sm:h-4 sm:w-4")}</div>
        <span className="flex-1 text-xs sm:text-sm text-foreground truncate break-all">
          {value || "N/A"}
        </span>
      </div>
    );
  };

  // Function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "not started":
        return "bg-muted text-muted-foreground";
      case "in progress":
        return "bg-accent text-foreground";
      case "completed":
        return "bg-primary/10 text-primary";
      case "urgent":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-destructive/10 text-destructive";
      case "medium":
        return "bg-accent text-foreground";
      case "low":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("p-2 sm:p-4 space-y-3 sm:space-y-4 max-w-full overflow-hidden pb-48", className)}>
      {data.map((patient, index) => {
        // Extract patient data
        const lastName = patient.lastName || "";
        const age = patient.dob ? dobToAge(patient.dob.toString()) : "";
        const location = formatLocation(
          patient.city || "",
          patient.country || "",
        );
        const language = patient.language || "";
        const chiefComplaint = patient.chiefComplaint || "";
        const patientId = patient.id?.toString() || "";
        const status = patient.status || "Pre-Op / Not Cleared";
        const priority = patient.priority || "Not Selected";
        const specialty =
          patient.specialties && patient.specialties.length > 0
            ? patient.specialties.length === 1
              ? patient.specialties[0]
              : `${patient.specialties.length} specialties`
            : "Not Selected";
        const notes = patient.dashboardNotes || "";
        const hasNotes = notes && notes.trim().length > 0;
        const unreadMessages = patient.unreadMessages || 0;

        // Handle complex objects
        const triagedBy = patient.triagedBy
          ? typeof patient.triagedBy === "object"
            ? `${patient.triagedBy.firstName || ""} ${patient.triagedBy.lastName || ""}`.trim() ||
              "N/A"
            : String(patient.triagedBy)
          : "N/A";

        const leadSurgeon = Array.isArray(patient.careTeam)
          ? patient.careTeam.find((m: any) => m.isLead && m.role === "surgeon")
          : null;
        const doctor = leadSurgeon
          ? `${leadSurgeon.firstName || ""} ${leadSurgeon.lastName || ""}`.trim() || "N/A"
          : "N/A";

        return (
          <motion.div
            key={`patient-card-${patientId}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="w-full"
          >
            <Card
              className={cn(
                "overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 max-w-full",
                !patient.telegramChatId && "bg-muted opacity-75",
              )}
              borderColor={
                activePatientDrawer === patient.id?.toString()
                  ? "border-primary"
                  : "border-border"
              }
              borderSize={
                activePatientDrawer === patient.id?.toString() ? 2 : 1
              }
            >
              {/* Card Header - Patient Identity */}
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex gap-2 sm:gap-3 items-center min-w-0 flex-1">
                    <div
                      className="flex justify-center items-center w-8 h-8 bg-accent/20 rounded-full transition-colors cursor-pointer hover:bg-accent/30"
                      onClick={(event) =>
                        handleExternalLinkClick(patient, event)
                      }
                      aria-label="Open Patient Detail View"
                    >
                      {navigatingPatientId === patient.id?.toString() ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#c71e07]"></div>
                      ) : (
                        renderIcon("externalLink", "h-5 w-5")
                      )}
                    </div>
                    <div className="flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-primary">
                        {lastName.charAt(0).toUpperCase() || "P"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                        Patient {lastName}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {age && `${age} years old`}{" "}
                        {location && `• ${location}`}
                      </p>
                    </div>
                  </div>

                  {/* Status and Priority Badges */}
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <span
                      className={cn(
                        "px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap",
                        getStatusColor(status),
                      )}
                    >
                      {status}
                    </span>
                    {priority !== "Not Selected" && (
                      <span
                        className={cn(
                          "px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap",
                          getPriorityColor(priority),
                        )}
                      >
                        {priority}
                      </span>
                    )}
                    {patient.hospital && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap bg-accent text-accent-foreground border border-border">
                        <Hospital className="h-2.5 w-2.5" />
                        {patient.hospital}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Card Content - Patient Details */}
              <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                {/* Chief Complaint */}
                {chiefComplaint && (
                  <div className="p-2 sm:p-3 mb-3 sm:mb-4 bg-primary/10 rounded-lg">
                    <div className="flex gap-2 items-start">
                      <div className="text-xs sm:text-sm font-medium text-primary mt-0.5 shrink-0">
                        Chief Complaint:
                      </div>
                      <div className="flex-1 text-xs sm:text-sm text-primary break-words">
                        {chiefComplaint}
                      </div>
                    </div>
                  </div>
                )}

                {/* Patient Details Grid */}
                <div className="space-y-2 sm:space-y-3">
                  {/* Row 1: Basic Info */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-2 min-w-0">
                      {renderIconOnly(patient.hospital || "Not Assigned", "hospital")}
                      {language && renderIconOnly(language, "language")}
                    </div>
                    <div className="space-y-2 min-w-0">
                      {renderIconOnly(specialty, "specialty")}
                      {unreadMessages > 0 &&
                        renderField(
                          "Messages",
                          `${unreadMessages} unread`,
                          "messages",
                        )}
                    </div>
                  </div>

                  {/* Row 2: Medical Team */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="min-w-0">{renderIconOnly(triagedBy, "user")}</div>
                    <div className="min-w-0">{renderIconOnly(doctor, "doctor")}</div>
                  </div>

                  {/* Notes Section */}
                  {hasNotes && (
                    <div className="p-2 sm:p-3 mt-3 sm:mt-4 bg-muted rounded-lg">
                      <div className="flex gap-2 items-start">
                        {renderIcon("notes", "h-4 w-4 shrink-0")}
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 text-xs sm:text-sm font-medium text-foreground">
                            Notes:
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground break-words">
                            {notes}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {renderActions && (
                  <div className="pt-4 mt-4 border-t border-border">
                    {renderActions(patient)}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
