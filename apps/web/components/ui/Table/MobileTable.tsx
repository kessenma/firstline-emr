"use client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { TableColumn } from "./types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Stethoscope,
  StickyNote,
  MessageSquare,
  User,
  Hospital,
  Languages,
} from "lucide-react";
import ReadOnlyField from "@/components/form/ReadOnlyField";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { dobToAge, formatLocation } from "@/utils/patientUtils";

interface MobileTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (item: T) => void;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  renderActions?: (item: T) => ReactNode;
}

export function MobileTable<T>({
  data,
  columns,
  onRowClick,
  backgroundColor = "background",
  textColor = "foreground",
  borderColor = "border",
  hoverBackgroundColor = "muted/50",
  hoverTextColor = "foreground",
  renderActions,
}: MobileTableProps<T>) {
  if (!data || data.length === 0) {
    return <div className="py-8 text-center">No data available</div>;
  }

  const convertColor = (color: string, prefix: string) => {
    // If color already includes the prefix (e.g., "bg-yellow-50"), return as is
    if (color.startsWith(prefix + "-")) {
      return color;
    }
    // Otherwise, add the prefix (e.g., "yellow-50" becomes "bg-yellow-50")
    return `${prefix}-${color}`;
  };

  // Function to render icon for a field
  const renderIcon = (key: string) => {
    const iconSize = "h-4 w-4";

    switch (key) {
      case "status":
        return <Activity className={`${iconSize} text-primary`} />;
      case "priority":
        return <AlertTriangle className={`${iconSize} text-primary`} />;
      case "specialty":
        return <Stethoscope className={`${iconSize} text-primary`} />;
      case "notes":
        return <StickyNote className={`${iconSize} text-primary`} />;
      case "telegramChatId":
        return <MessageSquare className={`${iconSize} text-primary`} />;
      case "user":
        return <User className={`${iconSize} text-primary`} />;
      case "doctor":
        return (
          <RoleIcon
            accountType="Doctor"
            colored={false}
            className={`${iconSize} text-primary`}
          />
        );
      case "hospital":
        return <Hospital className={`${iconSize} text-primary`} />;
      case "language":
        return <Languages className={`${iconSize} text-primary`} />;

      default:
        return null;
    }
  };

  // Modify the renderField function to remove the badge from the notes icon in the description section
  const renderField = (
    label: string,
    value: string | ReactNode,
    iconKey?: string,
  ) => {
    return (
      <div className="flex gap-2 items-start">
        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[120px]">
          {iconKey && renderIcon(iconKey)}
          <span>{label}:</span>
        </div>
        <div className="flex-1 text-foreground break-words">
          {value || "N/A"}
        </div>
      </div>
    );
  };

  // Function to render icon-only field (no text label)
  const renderIconOnly = (value: string | ReactNode, iconKey: string) => {
    return (
      <div className="flex gap-2 items-start" title={String(value)}>
        <div className="flex gap-1 items-center text-sm font-medium text-muted-foreground">
          {renderIcon(iconKey)}
        </div>
        <div className="flex-1 text-foreground break-words">
          {value || "N/A"}
        </div>
      </div>
    );
  };

  // Update the card rendering to add more distinct borders, improve spacing, and reorder items
  return (
    <div className="p-2 space-y-6">
      {data.map((item: any, index) => {
        // Extract patient data directly from the item
        const lastName = item.lastName || "";
        const age = item.dob ? dobToAge(item.dob.toString()) : "";
        const location = formatLocation(item.city || "", item.country || "");
        const language = item.language || "";
        const chiefComplaint = item.chiefComplaint || "";
        const patientId = item._id || "";
        const status = item.status || "Pre-Op / Not Cleared";
        const priority = item.priority || "Not Selected";
        const specialty = item.specialty || "Not Selected";
        const notes = item.dashboardNotes || "";
        const hasNotes = notes && notes.trim().length > 0;

        // Handle complex objects
        const triagedBy = item.triagedBy
          ? typeof item.triagedBy === "object"
            ? `${item.triagedBy.firstName || ""} ${item.triagedBy.lastName || ""}`.trim() ||
              "N/A"
            : String(item.triagedBy)
          : "N/A";

        const leadSurgeon = Array.isArray(item.careTeam)
          ? item.careTeam.find((m: any) => m.isLead && m.role === "surgeon")
          : null;
        const doctor = leadSurgeon
          ? `${leadSurgeon.firstName || ""} ${leadSurgeon.lastName || ""}`.trim() || "N/A"
          : "N/A";

        return (
          <motion.div
            key={`mobile-row-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="w-full"
          >
            <Card
              className={cn(
                "overflow-hidden shadow-md",
                convertColor(backgroundColor, "bg"),
                "border-2 border-border",
              )}
            >
              <CardContent className="p-4">
                {/* Top section - Patient basic info */}
                <div className="space-y-3">
                  {/* Row 1: Last Initial and Age */}
                  <div className="flex gap-4">
                    <div className="flex-1 border-t-2 border-r-2 border-border">
                      {renderField("Last Initial", lastName)}
                    </div>
                    <div className="flex-1">{renderField("Age", age)}</div>
                  </div>

                  {/* Row 2: Location and Language */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      {renderField("Location", location)}
                    </div>
                    <div className="flex-1">
                      {renderIconOnly(language, "language")}
                    </div>
                  </div>

                  {/* Chief Complaint in ReadOnlyField */}
                  <ReadOnlyField
                    fieldName="chiefComplaint"
                    fieldLabel="Chief Complaint"
                    value={chiefComplaint}
                    className="mt-2 mb-2"
                  />
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-border"></div>

                {/* Bottom section - Patient medical info */}
                <div className="space-y-3">
                  {renderIconOnly(item.hospital || "Not Assigned", "hospital")}
                  {renderField("Status", status, "status")}
                  {renderField("Priority", priority, "priority")}
                  {renderIconOnly(specialty, "specialty")}

                  {/* Only show notes if they exist */}
                  {hasNotes && (
                    <ReadOnlyField
                      fieldName="additionalNotes"
                      fieldLabel="Additional Notes"
                      value={notes}
                      className="mt-2 mb-2"
                    />
                  )}

                  {/* Triaged By and Doctor side by side */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      {renderIconOnly(triagedBy, "user")}
                    </div>
                    <div className="flex-1">
                      {renderIconOnly(doctor, "doctor")}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {renderActions && renderActions(item)}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
