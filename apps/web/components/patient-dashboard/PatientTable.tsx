// apps/web/components/patient-dashboard/PatientTable.tsx
"use client";
import { ResponsivePatientTable } from "@/components/ui/Table/ResponsivePatientTable";
import { usePatientTable } from "./hooks/use-patient-table";
import { getTableColumns } from "./utils/column-definitions";
import { getColorScheme } from "./utils/color-mappings";
import type {
  PatientTableProps,
  PatientWithMessages,
} from "./types/patient-table-types";
import { useState } from "react";
import { useToast } from "@/components/hooks/useToast";
import { useIsMobile } from "@/components/ui/Table/hooks/use-mobile";
import { PatientMobileActions } from "./PatientMobileActions";
import { ChatThreadModal } from "./ChatThreadModal";
import { RequestChartAccessModal } from "@/components/patient-chart/care-team/RequestChartAccessModal";
import type { CareTeamRole } from "@fajr/shared/care-team";
import { useRouter } from "next/navigation";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { updatePatient } from "@/lib/api";

export function PatientTable({
  rows,
  allData,
  session,
  handleStatusChange,
  handleTakeCase,
  updatePatient: updatePatientFromProps,
  userType,
  handleArchive,
  loadingStates,
  setLoadingStates,
  handleSpecialtyChangeWithNotification,
  recentlyChangedIds,
}: PatientTableProps) {
  const {
    translatedRows,
    expandedStates,
    setExpandedStates,
    hoveredStates,
    isAllExpanded,
    handleHoverStart,
    handleHoverEnd,
    handlePatientClick,
    handlePriorityChange,
    handleNotesUpdate,
    refreshData,
    blockedAccess,
    setBlockedAccess,
    openBlockedChart,
  } = usePatientTable(rows, updatePatientFromProps, session, setLoadingStates);

  const { setToast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();

  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedChatPatient, setSelectedChatPatient] =
    useState<PatientWithMessages | null>(null);

  const handleChatClick = (patient: PatientWithMessages) => {
    setSelectedChatPatient(patient);
    setIsChatModalOpen(true);
  };

  const { lighter: LighterColor, darker: DarkerColor } =
    getColorScheme(userType);

  // Get the columns for the table
  const columns = getTableColumns({
    rows,
    allData,
    session,
    handleStatusChange: (newStatus, patient, index) =>
      handleStatusChange(newStatus ?? null, patient, index),
    handleTakeCase,
    handleArchive,
    loadingStates,
    setLoadingStates,
    hoveredStates,
    handleHoverStart,
    handleHoverEnd,
    handlePatientClick: (patientId, careTeam) =>
      handlePatientClick(
        patientId,
        careTeam ?? null,
        rows.find((p) => p.id === patientId)?.specialties ?? null,
      ),
    handleChatClick,
    handlePriorityChange: (patientId, newPriority) =>
      handlePriorityChange(patientId, newPriority ?? null),
    handleNotesUpdate,
    expandedStates,
    setExpandedStates,
    isAllExpanded,
    setToast,
    refreshData,
  });

  // Track active patient drawer state
  const [activePatientDrawer, setActivePatientDrawer] = useState<string | null>(
    null,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="relative grow h-full">
        <ResponsivePatientTable
          data={translatedRows}
          originalData={rows}
          columns={columns}
          rowClassName={(patient) => {
            const classes: string[] = [];
            if (!patient.telegramChatId) classes.push("bg-muted");
            if (recentlyChangedIds?.has(patient.id)) classes.push("realtime-highlight-row");
            return classes.join(" ");
          }}
          stickyHeader={true}
          onRowClick={(patient) =>
            handlePatientClick(
              patient.id,
              patient.careTeam ?? undefined,
              patient.specialties ?? null,
            )
          }
          activePatientDrawer={activePatientDrawer}
          renderMobileActions={(patient: PatientWithMessages) => {
            const isDoctor = session?.user?.accountType === "Doctor";
            const isTriage = session?.user?.accountType === "Triage";
            const patientIndex = rows.findIndex((p) => p.id === patient.id);
            const patientId = patient.id;

            return (
              <PatientMobileActions
                patient={patient}
                onChat={(patient: PatientWithMessages) => {
                  // Handle chat action
                  if (patient.telegramChatId) {
                    router.push(`/chat/${patient.telegramChatId}`);
                  }
                }}
                onNotes={(patient: PatientWithMessages) => {
                  // This function is now handled directly in PatientMobileActions
                  // with the NotesCell component
                }}
                onStatusChange={(status, patient, index) => {
                  handleStatusChange(status ?? null, patient, index);
                }}
                onPriorityChange={(patientId, newPriority) =>
                  handlePriorityChange(patientId, newPriority ?? null)
                }
                onSpecialtyChange={(patientId, specialty) =>
                  handleSpecialtyChangeWithNotification(
                    patientId,
                    specialty as DoctorSpecialtyList,
                  )
                }
                onOpenPatient={(patient: PatientWithMessages) => {
                  // Goes through the same gate as the desktop row click —
                  // this path used to router.push directly and skip it.
                  handlePatientClick(
                    patient.id,
                    patient.careTeam ?? undefined,
                    patient.specialties ?? null,
                  );
                }}
                onTakeCase={(index: number, role?: string) => {
                  handleTakeCase(index, (role || "surgeon") as CareTeamRole);
                }}
                isDoctor={isDoctor}
                isTriage={isTriage}
                patientIndex={patientIndex}
                loadingStates={loadingStates}
                onDrawerOpen={() => setActivePatientDrawer(patientId)}
                onDrawerClose={() => setActivePatientDrawer(null)}
              />
            );
          }}
        />
      </div>
      <ChatThreadModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        patient={selectedChatPatient}
      />
      {blockedAccess && (
        <RequestChartAccessModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setBlockedAccess(null);
          }}
          patientId={blockedAccess.patientId}
          message={blockedAccess.message}
          onGranted={openBlockedChart}
        />
      )}
    </div>
  );
}
