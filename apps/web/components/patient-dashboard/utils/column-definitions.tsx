// @ts-nocheck
// apps/web/components/patient-dashboard/utils/column-definitions.tsx
"use client";

import type React from "react";

import { StatusDropdown } from "../filters/StatusDropdown";
import { PriorityDropdown } from "../filters/PriorityDropdown";
import { NotesCell } from "../cells/NotesCell";
import { ChiefComplaintCell } from "../cells/ChiefComplaintCell";
import { TakeCaseCell } from "../cells/TakeCaseCell";
import { SpecialtyCell } from "../cells/SpecialtyCell";
import { HospitalCell } from "../cells/HospitalCell";
import { PatientIdCell } from "../cells/PatientIdCell";
import { PatientNameCell } from "../cells/PatientNameCell";
import { formatLocation, getInitials, dobToAge } from "@/utils/patientUtils";
import type { CareTeamRole } from "@fajr/shared/care-team";
import type { TableColumn } from "@/components/ui/Table/types";
import type { PatientWithMessages } from "../viewModel/types";
import type { Patient } from "@/db/schema/patients";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import axios from "axios";
import type { ToastProps } from "@/components/hooks/useToast";
import {
  getFilteredStatusOptions,
  getFilteredPriorityOptions,
} from "./business-rules";

export function getTableColumns({
  rows,
  allData,
  session,
  handleStatusChange,
  handleTakeCase,
  handleArchive,
  loadingStates,
  setLoadingStates,
  hoveredStates,
  handleHoverStart,
  handleHoverEnd,
  handlePatientClick,
  handleChatClick,
  handlePriorityChange,
  handleNotesUpdate,
  expandedStates,
  setExpandedStates,
  isAllExpanded,
  setToast,
  refreshData,
}: {
  rows: PatientWithMessages[];
  allData: PatientWithMessages[];
  session: { user: { accountType: string; email?: string } } | null;
  handleStatusChange: (
    newStatus: Patient["status"] | undefined,
    patient: PatientWithMessages,
    index: number,
  ) => void;
  handleTakeCase: (index: number, role?: CareTeamRole) => void;
  handleArchive: (index: number) => void;
  loadingStates: Record<string, string | boolean>;
  setLoadingStates: React.Dispatch<
    React.SetStateAction<Record<string, string | boolean>>
  >;
  hoveredStates: Record<string, boolean>;
  handleHoverStart: (id: string) => void;
  handleHoverEnd: (id: string) => void;
  handlePatientClick: (
    patientId: string,
    careTeam: Patient["careTeam"] | undefined,
  ) => void;
  handleChatClick: (patient: PatientWithMessages) => void;
  handlePriorityChange: (
    patientId: string,
    newPriority: Patient["priority"] | undefined,
  ) => Promise<void>;
  handleNotesUpdate: (patientId: string, newNotes: string) => Promise<void>;
  expandedStates: Record<string, boolean>;
  setExpandedStates: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  isAllExpanded: boolean;
  setToast: (options: ToastProps) => void;
  refreshData: () => Promise<void>;
}): TableColumn<PatientWithMessages>[] {
  return [
    {
      key: "id",
      header: "Patient ID",
      render: (value: string, item: PatientWithMessages) => {
        const rowId = item.id;
        const isHovered = hoveredStates[rowId] || false;
        const isLoading = !!loadingStates[rowId];
        const hasUnread = item.unreadMessages > 0;

        return (
          <PatientIdCell
            value={rowId}
            item={item}
            isHovered={isHovered}
            isLoading={isLoading}
            hasUnread={hasUnread}
            handleHoverStart={handleHoverStart}
            handleHoverEnd={handleHoverEnd}
            handlePatientClick={handlePatientClick}
            handleChatClick={handleChatClick}
          />
        );
      },
      width: "180px",
    },
    {
      key: "lastName",
      header: "Name",
      render: (_lastName: string, patient: PatientWithMessages) => (
        <PatientNameCell firstName={patient.firstName ?? undefined} lastName={patient.lastName ?? undefined} />
      ),
      width: "100px",
    },
    {
      key: "dob",
      header: "Age",
      render: (value: string) => (value ? dobToAge(value.toString()) : ""),
      width: "80px",
    },
    // Rest of the columns remain the same
    {
      key: "location",
      header: "Location",
      render: (_: any, item: PatientWithMessages) =>
        formatLocation(item.city || "", item.country || ""),
      width: "150px",
    },
    {
      key: "hospital",
      header: "Hospital",
      render: (_: any, item: PatientWithMessages) => {
        const rowId = String(item.id ?? "");
        const loadingState = loadingStates[rowId];
        const isHospitalLoading = loadingState === "hospital";
        const isRowLoading = !!loadingState;

        return (
          <HospitalCell
            hospital={item.hospital || null}
            patientId={rowId}
            missionId={item.missionId || null}
            isLoading={isHospitalLoading}
            disabled={isRowLoading && !isHospitalLoading}
            loadingState={loadingState}
            onChange={refreshData}
          />
        );
      },
      width: "150px",
    },
    { key: "language", header: "Language Spoken", width: "125px" },
    {
      key: "chiefComplaint",
      header: "Chief Complaint",
      render: (value: string, item: PatientWithMessages) => (
        <ChiefComplaintCell
          value={value}
          itemId={String(item.id ?? "")}
          isAllExpanded={isAllExpanded}
          expandedStates={expandedStates}
          setExpandedStates={setExpandedStates}
        />
      ),
      width: "200px",
    },
    {
      key: "status",
      header: "Status",
      render: (value: Patient["status"], item: PatientWithMessages) => {
        const rowId = String(item.id ?? "");
        const loadingState = loadingStates[rowId];
        const isStatusLoading = loadingState === "status";
        const isRowLoading = !!loadingState;

        return (
          <StatusDropdown
            status={value || "Pre-Op / Not Cleared"}
            onChange={(newStatus) => {
              console.log("🔵 Desktop handleStatusChange called:", {
                newStatus,
                patientId: rowId,
                index: rows.indexOf(item),
              });
              handleStatusChange(
                newStatus as Patient["status"],
                item,
                rows.indexOf(item),
              );
            }}
            isLoading={isStatusLoading}
            disabled={isRowLoading && !isStatusLoading}
            filteredOptions={getFilteredStatusOptions(session)}
            loadingState={loadingState}
          />
        );
      },
      width: "150px",
      filter: true,
    },
    {
      key: "priority",
      header: "Priority",
      render: (value: Patient["priority"], item: PatientWithMessages) => {
        const rowId = String(item.id ?? "");
        const loadingState = loadingStates[rowId];
        const isPriorityLoading = loadingState === "priority";
        const isRowLoading = !!loadingState;

        return (
          <PriorityDropdown
            priority={value || "Not Selected"}
            onChange={(newPriority) => {
              console.log("🟢 Desktop handlePriorityChange called:", {
                newPriority,
                patientId: rowId,
              });
              handlePriorityChange(rowId, newPriority as Patient["priority"]);
            }}
            isLoading={isPriorityLoading}
            disabled={isRowLoading && !isPriorityLoading}
            filteredOptions={getFilteredPriorityOptions(session)}
            loadingState={loadingState}
          />
        );
      },
      width: "150px",
      filter: true,
    },
    {
      key: "specialty",
      header: "Specialty",
      render: (value: DoctorSpecialtyList[], item: PatientWithMessages) => {
        const rowId = String(item.id ?? "");
        const currentSpecialties =
          allData.find((patient) => String(patient.id ?? "") === rowId)
            ?.specialties || [];
        const loadingState = loadingStates[rowId];
        const isSpecialtyLoading = loadingState === "specialty";
        const isRowLoading = !!loadingState;

        // Define a specialty change function with notification logic
        const handleSpecialtyChangeWithNotification = async (
          patientId: string,
          newSpecialties: DoctorSpecialtyList[],
        ) => {
          try {
            // Set loading state
            setLoadingStates((prev) => ({ ...prev, [patientId]: "specialty" }));

            // First update the patient specialty directly
            await axios.patch(`/api/patient/${patientId}/triage`, {
              specialties: newSpecialties,
            });

            // Check if we're changing from no specialty to a real specialty
            const isSpecialtySelected = (
              specialtyValues: DoctorSpecialtyList[],
            ): boolean => {
              return specialtyValues.length > 0;
            };

            const oldSpecialties = currentSpecialties;

            // Invalidate queries to refresh data
            await refreshData();
          } catch (error) {
            console.error("Error updating specialty:", error);
            setToast({
              title: "Error",
              description: "An error occurred while updating the specialty.",
              variant: "destructive",
            });
          } finally {
            setLoadingStates((prev) => ({ ...prev, [patientId]: false }));
          }
        };

        return (
          <SpecialtyCell
            specialty={currentSpecialties[0] || "Not Selected"}
            patientId={rowId}
            status={item.status || "Pre-Op / Not Cleared"}
            priority={item.priority || "Not Selected"}
            onChange={(newSpecialties) =>
              handleSpecialtyChangeWithNotification(rowId, newSpecialties)
            }
            isLoading={isSpecialtyLoading}
            disabled={isRowLoading && !isSpecialtyLoading}
            loadingState={loadingState}
            isTriageUser={session?.user?.accountType === "Triage"}
            patientName={
              `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
              undefined
            }
            patientCountry={item.country || undefined}
            patientLanguage={item.language || undefined}
          />
        );
      },
      width: "200px",
      filter: true,
    },
    {
      key: "dashboardNotes",
      header: "Additional Notes",
      render: (value: string, item: PatientWithMessages) => (
        <NotesCell
          notes={value || ""}
          onUpdate={(newNotes: string) =>
            handleNotesUpdate(item.id.toString(), newNotes)
          }
        />
      ),
      width: "200px",
    },
    {
      key: "triagedBy",
      header: "Triaged By",
      render: (value: { firstName: string; lastName: string }) =>
        getInitials(value?.firstName || "", value?.lastName || ""),
      width: "80px",
    },
    {
      key: "genderPreference",
      header: "Dr. Pref",
      render: (value: string) => {
        if (value === "Male")
          return <span style={{ fontSize: "1.5em" }}>♂</span>;
        if (value === "Female")
          return <span style={{ fontSize: "1.5em" }}>♀</span>;
        return "N/A";
      },
      width: "80px",
    },
    {
      key: "doctor",
      header: "Doctor",
      render: (_: any, item: PatientWithMessages) => (
        <TakeCaseCell
          status={item.status || "Pre-Op / Not Cleared"}
          careTeam={item.careTeam}
          session={session}
          onTakeCase={(role) => handleTakeCase(rows.indexOf(item), role)}
          rows={rows}
          index={rows.indexOf(item)}
          handleArchive={() => handleArchive(rows.indexOf(item))}
        />
      ),
      width: "150px",
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "",
      width: "150px",
    },
  ];
}
