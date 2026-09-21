"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { SpecialtyDropdown } from "../filters/SpecialtyDropdown";
import { motion, AnimatePresence } from "framer-motion";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { useToast } from "@/components/hooks/useToast";
import { sendSpecialtyNotification } from "@/utils/client/notifyDoctorsOfSpecialty";
import axios from "axios";
import { NoSpecialtyDoctorsModal } from "../modals/NoSpecialtyDoctorsModal";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAvailableSpecialties } from "@/hooks/useAvailableSpecialties";

interface SpecialtyCellProps {
  specialty: DoctorSpecialtyList | "Not Selected";
  patientId: string;
  status: string;
  priority: string;
  onChange: (newSpecialties: DoctorSpecialtyList[]) => void;
  isLoading: boolean;
  disabled?: boolean;
  loadingState?: string | boolean;
  isTriageUser: boolean;
  patientName?: string;
  patientCountry?: string;
  patientLanguage?: string;
}

export const SpecialtyCell: React.FC<SpecialtyCellProps> = ({
  specialty,
  patientId,
  status,
  priority,
  onChange,
  isLoading,
  disabled = false,
  loadingState,
  isTriageUser,
  patientName = "Patient",
  patientCountry = "Unknown",
  patientLanguage = "English",
}) => {
  // Condition: Disable if status is "Pre-Op / Not Cleared" or priority is "Not Selected"
  const isStatusOrPriorityMissing =
    !status ||
    status === "Pre-Op / Not Cleared" ||
    !priority ||
    priority === "Not Selected";
  const isDisabled = isStatusOrPriorityMissing || !isTriageUser || disabled;

  // Track hover state & mouse position
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isNotifying, setIsNotifying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSpecialtyForModal, setSelectedSpecialtyForModal] =
    useState<DoctorSpecialtyList | null>(null);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>(
    [],
  );
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const { setToast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Use cached available specialties
  const {
    availableSpecialties: cachedAvailableSpecialties,
    isLoading: isLoadingCache,
  } = useAvailableSpecialties();

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Tooltip message logic
  const tooltipMessage = !isTriageUser
    ? "Only triage account types can select doctor specialties."
    : isStatusOrPriorityMissing
      ? "Select both Status and Priority before choosing a specialty."
      : disabled &&
          typeof loadingState === "string" &&
          loadingState !== "specialty"
        ? `Please wait for ${loadingState} to update.`
        : null; // No tooltip if everything is correct

  // Check if a specialty is selected or not
  const isSpecialtySelected = (
    specialtyValue: DoctorSpecialtyList | "Not Selected" | undefined,
  ): boolean => {
    return specialtyValue !== undefined && specialtyValue !== "Not Selected";
  };

  const currentSpecialties: DoctorSpecialtyList[] = isSpecialtySelected(
    specialty,
  )
    ? [specialty as DoctorSpecialtyList]
    : [];

  // Handle specialty change with notification
  const handleSpecialtyChange = useCallback(
    async (newSpecialties: DoctorSpecialtyList[]) => {
      if (newSpecialties.length === 0) {
        // Allow clearing the specialty
        onChange(newSpecialties);
        return;
      }

      const selectedSpecialty = newSpecialties[0];
      setIsNotifying(true);

      try {
        // First, check if there are doctors with this specialty
        const checkResponse = await axios.post(
          "/api/doctors/available-specialties",
          {
            specialty: selectedSpecialty,
          },
        );

        const { hasDoctors, doctorCount } = checkResponse.data;

        if (!hasDoctors) {
          // No doctors with this specialty, show modal immediately
          setSelectedSpecialtyForModal(selectedSpecialty);
          setShowModal(true);
          setIsNotifying(false);

          // Use cached available specialties if available, otherwise fetch
          if (cachedAvailableSpecialties.length > 0) {
            setAvailableSpecialties(cachedAvailableSpecialties);
            setIsLoadingAlternatives(false);
          } else {
            // Fetch available specialties asynchronously after modal opens
            setIsLoadingAlternatives(true);
            try {
              const availableResponse = await axios.get(
                "/api/doctors/available-specialties",
              );
              const { availableSpecialties: available } =
                availableResponse.data;
              setAvailableSpecialties(available || []);
            } catch (error) {
              console.error("Failed to fetch available specialties:", error);
              setAvailableSpecialties([]);
            } finally {
              setIsLoadingAlternatives(false);
            }
          }
          return;
        }

        // Doctors exist, proceed with update
        await axios.patch(`/api/patient/${patientId}/triage`, {
          specialties: newSpecialties,
        });

        // Update the UI
        onChange(newSpecialties);

        // Trigger notification for the first specialty
        await sendSpecialtyNotification({
          patientId,
          specialty: selectedSpecialty,
          patientName,
          patientCountry,
          patientLanguage,
          setToast,
        });

        setToast({
          title: "Specialty Updated",
          description: `${doctorCount} doctor(s) will be notified about this patient.`,
          variant: "default",
        });
      } catch (error) {
        console.error(
          "Failed to update specialty or send notification:",
          error,
        );
        setToast({
          title: "Update Failed",
          description: "Could not update patient specialty.",
          variant: "destructive",
        });
      } finally {
        setIsNotifying(false);
      }
    },
    [
      patientId,
      onChange,
      patientName,
      patientCountry,
      patientLanguage,
      setToast,
    ],
  );

  // Handle proceeding with original specialty despite no doctors
  const handleProceedAnyway = async () => {
    if (!selectedSpecialtyForModal) return;

    setShowModal(false);
    setIsNotifying(true);

    try {
      // Update patient specialty
      await axios.patch(`/api/patient/${patientId}/triage`, {
        specialties: [selectedSpecialtyForModal],
      });

      // Update the UI
      onChange([selectedSpecialtyForModal]);

      // Send notification to triage team about specialty without doctors
      try {
        await axios.post("/api/notifications/specialty-no-doctors", {
          patientId,
          specialty: selectedSpecialtyForModal,
          patientName: patientName || "Unknown",
        });
        console.log("Triage team notified about specialty without doctors");

        // Invalidate notification count queries to refresh the badge for all users
        // This will trigger a refetch of the unread count
        await queryClient.invalidateQueries({
          queryKey: ["unreadNotificationCount"],
        });

        console.log("Invalidated notification count queries");
      } catch (notifError) {
        console.error("Failed to notify triage team:", notifError);
        // Don't fail the whole operation if notification fails
      }

      setToast({
        title: "Specialty Updated",
        description: `Specialty set to ${selectedSpecialtyForModal}. The triage team has been notified.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to update specialty:", error);
      setToast({
        title: "Update Failed",
        description: "Could not update patient specialty.",
        variant: "destructive",
      });
    } finally {
      setIsNotifying(false);
      setSelectedSpecialtyForModal(null);
      setAvailableSpecialties([]);
    }
  };

  // Handle selecting an alternative specialty from modal
  const handleSelectAlternative = async (specialty: string) => {
    setShowModal(false);
    setIsNotifying(true);

    try {
      // Update patient specialty
      await axios.patch(`/api/patient/${patientId}/triage`, {
        specialties: [specialty],
      });

      // Update the UI
      onChange([specialty as DoctorSpecialtyList]);

      // Send notifications
      await sendSpecialtyNotification({
        patientId,
        specialty: specialty as DoctorSpecialtyList,
        patientName,
        patientCountry,
        patientLanguage,
        setToast,
      });

      // Get doctor count for the selected specialty
      const checkResponse = await axios.post(
        "/api/doctors/available-specialties",
        { specialty },
      );
      const { doctorCount } = checkResponse.data;

      setToast({
        title: "Specialty Updated",
        description: `${doctorCount} doctor(s) will be notified about this patient.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to update specialty:", error);
      setToast({
        title: "Update Failed",
        description: "Could not update patient specialty.",
        variant: "destructive",
      });
    } finally {
      setIsNotifying(false);
      setSelectedSpecialtyForModal(null);
      setAvailableSpecialties([]);
    }
  };

  return (
    <>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SpecialtyDropdown
          specialties={currentSpecialties}
          onChange={handleSpecialtyChange}
          disabled={isDisabled || isLoading || isNotifying}
          isLoading={isLoading || isNotifying}
          availableSpecialties={cachedAvailableSpecialties}
          showAvailabilityIndicators={true}
        />

        <AnimatePresence>
          {isHovered && isDisabled && tooltipMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: mousePosition.y + 15,
                left: mousePosition.x + 15,
                zIndex: 9999, // Ensure it's above everything
              }}
              className="pointer-events-none w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700"
            >
              <div className="relative z-10">{tooltipMessage}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NoSpecialtyDoctorsModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedSpecialtyForModal(null);
          setAvailableSpecialties([]);
          setIsLoadingAlternatives(false);
        }}
        selectedSpecialty={selectedSpecialtyForModal}
        onProceedAnyway={handleProceedAnyway}
        onSelectAlternative={handleSelectAlternative}
        isLoadingAlternatives={isLoadingAlternatives}
        availableSpecialties={availableSpecialties}
      />
    </>
  );
};
