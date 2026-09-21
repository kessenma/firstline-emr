// apps/web/components/patient-dashboard/hooks/use-patient-table.ts
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
import translate from "@/utils/translate/translate";
import { evaluateChartAccess } from "@fajr/shared/care-team";
import type { PatientWithMessages } from "../viewModel/types";
import type { Patient } from "@/db/schema/patients";

/** Patient whose chart the current user must join a care team to open. */
export interface BlockedChartAccess {
  patientId: string;
  message: string | null;
}

export function usePatientTable(
  rows: PatientWithMessages[],
  updatePatient: (id: string, data: Partial<Patient>) => Promise<Patient>,
  session: {
    user: {
      accountType: string;
      email?: string;
      id?: string;
      doctorSpecialty?: string[];
    };
  } | null,
  setLoadingStates?: Dispatch<SetStateAction<Record<string, string | boolean>>>,
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const globalContext = useGlobalContext();
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>(
    {},
  );
  const [translatedRows, setTranslatedRows] =
    useState<PatientWithMessages[]>(rows);
  const [hoveredStates, setHoveredStates] = useState<Record<string, boolean>>(
    {},
  );
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [blockedAccess, setBlockedAccess] = useState<BlockedChartAccess | null>(
    null,
  );

  useEffect(() => {
    const translateData = async () => {
      if (
        !globalContext.autoTranslateLang ||
        globalContext.autoTranslateLang === "Disabled"
      ) {
        setTranslatedRows(rows);
        return;
      }

      const updatedRows = await Promise.all(
        rows.map(async (patient) => {
          const translatedCity = await translate(
            patient.city || "",
            globalContext.autoTranslateLang,
          );
          const translatedCountry = await translate(
            patient.country || "",
            globalContext.autoTranslateLang,
          );
          const translatedChiefComplaint = await translate(
            patient.chiefComplaint || "",
            globalContext.autoTranslateLang,
          );
          return {
            ...patient,
            city: translatedCity,
            country: translatedCountry,
            chiefComplaint: translatedChiefComplaint,
          } as PatientWithMessages;
        }),
      );

      setTranslatedRows(updatedRows);
    };

    translateData();
  }, [rows, globalContext.autoTranslateLang]);

  const handleHoverStart = (id: string) => {
    setHoveredStates((prev) => ({ ...prev, [id]: true }));
  };

  const handleHoverEnd = (id: string) => {
    setHoveredStates((prev) => ({ ...prev, [id]: false }));
  };

  /**
   * Opening a chart is gated by specialty and care-team membership. This used
   * to be a silent `return` that only fired when the care team was non-empty,
   * so a patient with no care team was openable by anyone and a blocked click
   * gave no feedback at all. Now a blocked click surfaces the join prompt.
   */
  const handlePatientClick = (
    patientId: string,
    careTeam: Patient["careTeam"] | undefined,
    patientSpecialties?: string[] | null,
  ) => {
    const access = evaluateChartAccess({
      accountType: session?.user?.accountType,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      doctorSpecialties: session?.user?.doctorSpecialty,
      patient: { specialties: patientSpecialties, careTeam },
    });

    if (!access.allowed) {
      setBlockedAccess({ patientId, message: access.message });
      return;
    }

    router.push(`/patient/${patientId}`);
  };

  const handlePriorityChange = async (
    patientId: string,
    newPriority: Patient["priority"],
  ) => {
    console.log("🟠 handlePriorityChange called:", { patientId, newPriority });

    if (setLoadingStates) {
      setLoadingStates((prev) => ({ ...prev, [patientId]: "priority" }));
    }

    try {
      await updatePatient(patientId, { priority: newPriority });
      console.log("✅ Priority update successful");
      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["patients", "archived"] }),
      ]);
    } catch (error) {
      console.error("❌ Error updating priority:", error);
    } finally {
      if (setLoadingStates) {
        setLoadingStates((prev) => ({ ...prev, [patientId]: false }));
      }
    }
  };

  const handleNotesUpdate = async (patientId: string, newNotes: string) => {
    try {
      await updatePatient(patientId, { dashboardNotes: newNotes });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["patients", "active"] });
      queryClient.invalidateQueries({ queryKey: ["patients", "archived"] });
    } catch (error) {
      console.error("Error updating notes:", error);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["patients", "active"] }),
      queryClient.invalidateQueries({ queryKey: ["patients", "archived"] }),
    ]);
  };

  return {
    translatedRows,
    expandedStates,
    setExpandedStates,
    hoveredStates,
    isAllExpanded,
    setIsAllExpanded,
    handleHoverStart,
    handleHoverEnd,
    handlePatientClick,
    handlePriorityChange,
    handleNotesUpdate,
    refreshData,
    blockedAccess,
    setBlockedAccess,
    /** Called after the user joins the care team from the access prompt. */
    openBlockedChart: () => {
      if (blockedAccess) router.push(`/patient/${blockedAccess.patientId}`);
    },
  };
}
