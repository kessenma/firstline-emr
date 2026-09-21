// @ts-nocheck
// apps/web/components/patient-dashboard/PatientMobileActions.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Merge,
  ArrowUpNarrowWide,
  Search,
  Stethoscope,
  NotebookPen,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CircleLoader } from "react-spinners";

import type { PatientWithMessages } from "./types/patient-table-types";
import { SpecialtyDropdown } from "./filters/SpecialtyDropdown";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Patient } from "@/db/schema/patients";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { NotesCell } from "./cells/NotesCell";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RadioCard } from "@/components/ui/radio-card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Hospital } from "lucide-react";

import { updatePatient } from "@/lib/api";
import { useToast } from "@/components/hooks/useToast";
import { useMissions } from "@/hooks/useMissions";
import axios from "axios";
import {
  canEditSpecialty,
  getFilteredStatusOptions,
  getFilteredPriorityOptions,
} from "./utils/business-rules";
import { ChatThreadModal } from "./ChatThreadModal";
import { PatientStatusList } from "@/data/patientStatus.enum";
import { getRolesForAccountType, ROLE_LABELS, ROLE_DESCRIPTIONS, type CareTeamRole } from "@fajr/shared/care-team";
import { UserPlus } from "lucide-react";

interface PatientMobileActionsProps {
  patient: PatientWithMessages;
  onChat: (patient: PatientWithMessages) => void;
  onNotes: (patient: PatientWithMessages) => void;
  onStatusChange: (
    newStatus: Patient["status"],
    patient: PatientWithMessages,
    index: number,
  ) => void;
  onPriorityChange: (
    patientId: string,
    newPriority: Patient["priority"],
  ) => Promise<void>;
  onSpecialtyChange?: (
    patientId: string,
    specialty: DoctorSpecialtyList,
  ) => Promise<void>;
  onOpenPatient: (patient: PatientWithMessages) => void;
  onTakeCase: (index: number, role?: string) => void;
  isDoctor: boolean;
  isTriage: boolean;
  patientIndex: number;
  loadingStates?: Record<string, string | boolean>;
  isAnyDrawerOpen?: boolean;
  onDrawerOpen?: () => void;
  onDrawerClose?: () => void;
}

type ActionType = "status" | "priority" | "specialty" | "notes" | null;

export function PatientMobileActions({
  patient,
  onChat,
  onNotes,
  onStatusChange,
  onPriorityChange,
  onSpecialtyChange,
  onOpenPatient,
  onTakeCase,
  isDoctor,
  isTriage,
  patientIndex,
  loadingStates = {},
  isAnyDrawerOpen = false,
  onDrawerOpen,
  onDrawerClose,
}: PatientMobileActionsProps) {
  console.log("🚀 PatientMobileActions rendered for patient:", patient.id, {
    isDoctor,
    isTriage,
  });
  console.log("🔍 Patient data:", {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    telegramChatId: patient.telegramChatId,
    hasAllFields: !!(
      patient.firstName &&
      patient.lastName &&
      patient.telegramChatId
    ),
  });

  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [isPriorityDrawerOpen, setIsPriorityDrawerOpen] = useState(false);
  const [isSpecialtyDrawerOpen, setIsSpecialtyDrawerOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isTakeCaseDrawerOpen, setIsTakeCaseDrawerOpen] = useState(false);
  const { setToast } = useToast();
  const { missions } = useMissions();

  // Get hospitals from the patient's assigned mission
  const patientMission = missions.find((m) => m.id === patient.missionId);
  const hospitalOptions = (patientMission?.hospitals || []).map((h) => typeof h === 'string' ? h : h.name);

  // Care team role logic
  const accountType = isTriage ? "Triage" : isDoctor ? "Doctor" : "";
  const availableRoles = getRolesForAccountType(accountType);
  const canJoinTeam = availableRoles.length > 0;

  // Create session object for business rules
  const session = {
    user: {
      accountType: isTriage ? "Triage" : isDoctor ? "Doctor" : "Unknown",
    },
  };

  // Business rules using centralized logic
  const isSpecialtyDisabled = !canEditSpecialty(
    session,
    patient.status,
    patient.priority,
  );
  const isPriorityDisabled = isTriage && patient.status === PatientStatusList.PRE_OP_NOT_CLEARED;
  const filteredStatusOptions = getFilteredStatusOptions(session);
  const filteredPriorityOptions = getFilteredPriorityOptions(session);

  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");
  const [tempSpecialties, setTempSpecialties] = useState<DoctorSpecialtyList[]>(
    [],
  );

  // State to track pending updates for drawer persistence
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [pendingPriority, setPendingPriority] = useState<string | null>(null);

  // Close drawers when loading finishes if we have a pending update
  useEffect(() => {
    const isLoading = loadingStates[patient.id];
    
    if (!isLoading) {
      if (pendingStatus) {
        setPendingStatus(null);
        setIsStatusDrawerOpen(false);
        onDrawerClose?.();
      }
      if (pendingPriority) {
        setPendingPriority(null);
        setIsPriorityDrawerOpen(false);
        onDrawerClose?.();
      }
    }
  }, [loadingStates, patient.id, pendingStatus, pendingPriority, onDrawerClose]);

  // Auto-scroll functionality for selected status and priority
  const selectedStatusIndex = useMemo(() => {
    return getFilteredStatusOptions(session).findIndex(
      (s) => s === patient.status,
    );
  }, [session, patient.status]);

  const selectedPriorityIndex = useMemo(() => {
    return getFilteredPriorityOptions(session).findIndex(
      (p) => p === patient.priority,
    );
  }, [session, patient.priority]);

  useEffect(() => {
    if (isStatusDrawerOpen && selectedStatusIndex >= 0) {
      setTimeout(() => {
        const selectedRadioCard = document.querySelector(
          `[data-radio-container="status"] [data-radio-value="${patient.status}"]`,
        ) as HTMLElement;
        if (selectedRadioCard) {
          selectedRadioCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 300);
    }
  }, [isStatusDrawerOpen, selectedStatusIndex, patient.status]);

  useEffect(() => {
    if (isPriorityDrawerOpen && selectedPriorityIndex >= 0) {
      setTimeout(() => {
        const selectedRadioCard = document.querySelector(
          `[data-radio-container="priority"] [data-radio-value="${patient.priority}"]`,
        ) as HTMLElement;
        if (selectedRadioCard) {
          selectedRadioCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 300);
    }
  }, [isPriorityDrawerOpen, selectedPriorityIndex, patient.priority]);

  const handleStatusClick = () => {
    setIsStatusDrawerOpen(true);
    onDrawerOpen?.();
  };

  const handlePriorityClick = () => {
    if (isPriorityDisabled) {
      setToast({
        title: "Cannot Change Priority",
        description:
          "Please select a status other than 'Pre-Op / Not Cleared' before changing priority.",
        variant: "destructive",
      });
      return;
    }
    setIsPriorityDrawerOpen(true);
    onDrawerOpen?.();
  };

  const handleSpecialtyClick = () => {
    if (isSpecialtyDisabled) {
      if (!isTriage) {
        setToast({
          title: "Access Denied",
          description: "Only triage users can change patient specialty.",
          variant: "destructive",
        });
      } else {
        setToast({
          title: "Cannot Change Specialty",
          description:
            "Please select status and priority before changing specialty.",
          variant: "destructive",
        });
      }
      return;
    }
    setIsSpecialtyDrawerOpen(true);
    onDrawerOpen?.();
  };

  const handleNotesClick = () => {
    setIsNotesOpen(true);
    onDrawerOpen?.();
  };

  const handleChatClick = () => {
    setIsChatModalOpen(true);
    onDrawerOpen?.();
  };

  const handleTakeCaseClick = () => {
    setIsTakeCaseDrawerOpen(true);
    onDrawerOpen?.();
  };

  const handleHospitalSelect = async (newHospital: string) => {
    const value = newHospital === "not-assigned" ? null : newHospital;
    if (value === patient.hospital) return;
    try {
      await axios.patch(`/api/patient/${patient.id}/triage`, {
        hospital: value,
      });
      setToast({
        title: "Hospital Updated",
        description: value ? `Hospital set to ${value}.` : "Hospital cleared.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating hospital:", error);
      setToast({
        title: "Error",
        description: "Failed to update hospital.",
        variant: "destructive",
      });
    }
  };

  const handleStatusSelect = (newStatus: string) => {
    const typedStatus = newStatus as Patient["status"];
    console.log("🔵 Mobile handleStatusSelect called:", {
      newStatus: typedStatus,
      patientId: patient.id,
      patientIndex,
    });
    setPendingStatus(newStatus);
    onStatusChange(typedStatus, patient, patientIndex);
    // Drawer will be closed by the useEffect when loading finishes
  };

  const handlePrioritySelect = (newPriority: string) => {
    const typedPriority = newPriority as Patient["priority"];
    console.log("🟡 Mobile handlePrioritySelect called:", {
      newPriority: typedPriority,
      patientId: patient.id,
    });
    setPendingPriority(newPriority);
    onPriorityChange(patient.id.toString(), typedPriority);
    // Drawer will be closed by the useEffect when loading finishes
  };

  const handleSpecialtyDone = () => {
    // For now, we'll just close the drawer since the parent component needs to be updated
    // to handle specialty arrays instead of single specialty
    setIsSpecialtyDrawerOpen(false);
    setSpecialtySearchQuery(""); // Clear search when closing
    setTempSpecialties([]); // Clear temp selections
    onDrawerClose?.();
  };

  const handleSpecialtyToggle = (
    specialty: DoctorSpecialtyList,
    checked: boolean,
  ) => {
    if (checked) {
      // Add specialty if not already selected and under limit
      const isAlreadySelected = tempSpecialties.some(
        (item) => item === specialty,
      );
      if (!isAlreadySelected && tempSpecialties.length < 2) {
        setTempSpecialties([...tempSpecialties, specialty]);
      }
    } else {
      // Remove specialty
      setTempSpecialties(tempSpecialties.filter((item) => item !== specialty));
    }
  };

  const handleSpecialtyClear = () => {
    setTempSpecialties([]);
  };

  const handleNotesUpdate = async (updatedNotes: string) => {
    try {
      setIsUpdatingNotes(true);

      // Update the patient's dashboardNotes field
      await updatePatient(patient.id.toString(), {
        dashboardNotes: updatedNotes,
      });

      // Show success toast
      setToast({
        title: "Notes updated",
        description: "Patient notes have been saved successfully.",
        variant: "default",
      });

      // Update the local patient object if needed
      // This would require a refetch or state update in your parent component
    } catch (error) {
      console.error("Failed to update notes:", error);
      setToast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  // Check if patient has notes
  const hasNotes =
    patient.dashboardNotes && patient.dashboardNotes.trim().length > 0;

  // Filtered specialties for search functionality
  const filteredSpecialties = useMemo(() => {
    return DoctorSpecialties.filter((specialty) =>
      specialty.toLowerCase().includes(specialtySearchQuery.toLowerCase()),
    );
  }, [specialtySearchQuery]);

  // Auto-scroll functionality for first specialty in the list
  const specialtyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSpecialtyDrawerOpen && filteredSpecialties.length > 0) {
      // Scroll to the first specialty in the filtered list
      setTimeout(() => {
        const firstSpecialtyCard = document.querySelector(
          `[data-radio-value="${filteredSpecialties[0]}"]`,
        ) as HTMLElement;
        if (firstSpecialtyCard) {
          firstSpecialtyCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 300); // Longer delay to ensure Drawer and content are fully rendered
    }
  }, [isSpecialtyDrawerOpen, filteredSpecialties]);

  return (
    <div
      className="relative transition-all duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-flow-col auto-cols-fr gap-1 pt-3 mt-3 border-t border-border overflow-x-auto scrollbar-hide">
        {isTriage && (
          <>
            {/* Status Button */}
            <Button
              variant="orangeOutline"
              size="sm"
              className={`min-w-[40px] p-1 ${isStatusDrawerOpen ? "bg-muted" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleStatusClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Merge className="mr-1 w-8 h-8 rotate-90 text-primary" />
            </Button>

            {/* Priority Button */}
            <Button
              variant="orangeOutline"
              size="sm"
              className={`min-w-[40px] p-1 ${isPriorityDrawerOpen ? "bg-muted" : ""} ${isPriorityDisabled ? "opacity-50" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handlePriorityClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isPriorityDisabled}
            >
              <ArrowUpNarrowWide
                className={`mr-1 w-8 h-8 rotate-90 ${isPriorityDisabled ? "text-muted-foreground" : "text-primary"}`}
              />
            </Button>

            {/* Notes Button with Badge */}
            <div className="relative min-w-[40px]">
              <Button
                variant="orangeOutline"
                size="sm"
                className={`w-full p-1 ${isNotesOpen ? "bg-muted" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleNotesClick();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <NotebookPen className="mr-1 w-8 h-8 text-primary" />
              </Button>
              {hasNotes && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                >
                  !
                </Badge>
              )}
            </div>

            {/* Messages Button */}
            <Button
              variant="orangeOutline"
              size="sm"
              className={`min-w-[40px] p-1 ${!patient.telegramChatId ? "opacity-50" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleChatClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!patient.telegramChatId}
            >
              <MessageSquare className={`mr-1 w-8 h-8 ${!patient.telegramChatId ? "text-muted-foreground" : "text-primary"}`} />
            </Button>

            {/* Specialty Button - Only show for triage users */}
            {isTriage && (
              <Button
                variant="orangeOutline"
                size="sm"
                className={`min-w-[40px] p-1 ${isSpecialtyDrawerOpen ? "bg-muted" : ""} ${isSpecialtyDisabled ? "opacity-50" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSpecialtyClick();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isSpecialtyDisabled}
              >
                <Stethoscope className="mr-1 w-8 h-8 text-primary" />
              </Button>
            )}

            {/* Join Team Button for Triage Users */}
            {isTriage && canJoinTeam && (
              <Button
                variant="orangeOutline"
                size="sm"
                className={`min-w-[40px] p-1 ${isTakeCaseDrawerOpen ? "bg-muted" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTakeCaseClick();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <UserPlus className="mr-1 w-8 h-8 text-primary" />
              </Button>
            )}
          </>
        )}

        {isDoctor && (
          <>
            {/* Status Button */}
            <Button
              variant="orangeOutline"
              size="sm"
              className={`min-w-[40px] p-1 ${isStatusDrawerOpen ? "bg-muted" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("🔴 Status button clicked!");
                handleStatusClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Merge className="mr-1 w-8 h-8" />
            </Button>

            {/* Priority Button */}
            <Button
              variant="orangeOutline"
              size="sm"
              className={`min-w-[40px] p-1 ${isPriorityDrawerOpen ? "bg-muted" : ""} ${isPriorityDisabled ? "opacity-50" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("🟡 Priority button clicked!");
                handlePriorityClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isPriorityDisabled}
            >
              <ArrowUpNarrowWide className="mr-1 w-8 h-8 rotate-90" />
            </Button>

            {/* Notes Button with Badge */}
            <div className="relative min-w-[40px]">
              <Button
                variant="orangeOutline"
                size="sm"
                className={`w-full p-1 ${isNotesOpen ? "bg-muted" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleNotesClick();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <NotebookPen className="mr-1 w-8 h-8" />
              </Button>
              {hasNotes && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                >
                  !
                </Badge>
              )}
            </div>

            {/* Join Team Button - Show for doctors with available roles */}
            {canJoinTeam && (
              <Button
                variant="orangeOutline"
                size="sm"
                className={`min-w-[40px] p-1 ${isTakeCaseDrawerOpen ? "bg-muted" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTakeCaseClick();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loadingStates[`takeCase-${patientIndex}`]}
              >
                {loadingStates[`takeCase-${patientIndex}`] ? (
                  <div className="flex justify-center items-center mr-1 w-8 h-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <UserPlus className="mr-1 w-8 h-8 text-primary" />
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Status Drawer */}
      <Drawer
        isOpen={isStatusDrawerOpen}
        onClose={() => {
          setIsStatusDrawerOpen(false);
          onDrawerClose?.();
        }}
        modal={true}
        dismissible={true}
      >
        <DrawerContent
          size="60%"
          title="Change Status"
          icon={<Merge className="text-primary rotate-90" />}
        >
          {/* Hospital Selector */}
          {hospitalOptions.length > 0 && (
            <div className="mb-4 pb-4 border-b border-border">
              <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1"><Hospital className="h-3 w-3" />Hospital</div>
              <RadioCard.Root
                value={patient.hospital || "not-assigned"}
                onValueChange={handleHospitalSelect}
                className="flex flex-wrap gap-1.5"
              >
                <RadioCard.Item
                  value="not-assigned"
                  className="flex-1 min-w-[80px]"
                >
                  <div className="text-center text-xs font-medium py-0.5">Not Assigned</div>
                </RadioCard.Item>
                {hospitalOptions.map((h) => (
                  <RadioCard.Item key={h} value={h} className="flex-1 min-w-[80px]">
                    <div className="text-center text-xs font-medium py-0.5">{h}</div>
                  </RadioCard.Item>
                ))}
              </RadioCard.Root>
            </div>
          )}

          {/* Status Options */}
          <RadioCard.Root
            value={patient.status || PatientStatusList.PRE_OP_NOT_CLEARED}
            onValueChange={handleStatusSelect}
            className="flex flex-col gap-2"
            data-radio-container="status"
          >
            {getFilteredStatusOptions(session).map((option, index) => (
              <RadioCard.Item
                key={option}
                value={option}
                className="text-foreground"
                data-radio-value={option}
                data-radio-index={index}
                disabled={loadingStates[patient.id] && pendingStatus !== option}
              >
                <div className="p-4 flex justify-between items-center">
                  <h3 className="font-medium">{option}</h3>
                  {loadingStates[patient.id] && pendingStatus === option && (
                    <CircleLoader size={20} color="#E36C2F" />
                  )}
                </div>
              </RadioCard.Item>
            ))}
          </RadioCard.Root>
        </DrawerContent>
      </Drawer>

      {/* Priority Drawer */}
      <Drawer
        isOpen={isPriorityDrawerOpen}
        onClose={() => {
          setIsPriorityDrawerOpen(false);
          onDrawerClose?.();
        }}
        modal={true}
        dismissible={true}
      >
        <DrawerContent
          size="50%"
          title="Change Priority"
          icon={<ArrowUpNarrowWide className="text-primary rotate-90" />}
        >
          <RadioCard.Root
            value={patient.priority || "Not Selected"}
            onValueChange={handlePrioritySelect}
            className="flex flex-col gap-2"
            data-radio-container="priority"
          >
            {getFilteredPriorityOptions(session).map((option, index) => (
              <RadioCard.Item
                key={option}
                value={option}
                className="text-foreground"
                data-radio-value={option}
                data-radio-index={index}
                disabled={loadingStates[patient.id] && pendingPriority !== option}
              >
                <div className="p-4 flex justify-between items-center">
                  <h3 className="font-medium">{option}</h3>
                  {loadingStates[patient.id] && pendingPriority === option && (
                    <CircleLoader size={20} color="#E36C2F" />
                  )}
                </div>
              </RadioCard.Item>
            ))}
          </RadioCard.Root>
        </DrawerContent>
      </Drawer>

      {/* Specialty Drawer */}
      <Drawer
        isOpen={isSpecialtyDrawerOpen}
        onClose={() => {
          setIsSpecialtyDrawerOpen(false);
          setSpecialtySearchQuery("");
          setTempSpecialties([]);
          onDrawerClose?.();
        }}
        modal={true}
        dismissible={true}
      >
        <DrawerContent
          size="80%"
          title="Select Specialties"
          icon={<Stethoscope className="text-primary" />}
        >
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-muted-foreground transform -translate-y-1/2" />
              <Input
                placeholder="Search specialties..."
                value={specialtySearchQuery}
                onChange={(e) => setSpecialtySearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Buttons - Always Visible */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSpecialtyClear}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                <span className="text-sm text-muted-foreground">
                  {tempSpecialties.length}/2 specialties selected
                </span>
              </div>
              <Button onClick={handleSpecialtyDone}>
                <Check className="mr-2 h-4 w-4" />
                Done
              </Button>
            </div>

            {/* Specialty Checkboxes - Scrollable */}
            <div ref={specialtyScrollRef} className="overflow-y-auto max-h-80">
              <div className="space-y-2">
                {filteredSpecialties.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No specialties found.
                  </div>
                ) : (
                  filteredSpecialties.map((specialty) => {
                    const isSelected = tempSpecialties.some(
                      (item) => item === specialty,
                    );
                    const isDisabled =
                      !isSelected && tempSpecialties.length >= 2;
                    return (
                      <div
                        key={specialty}
                        className={`flex items-center space-x-3 p-3 hover:bg-accent rounded-sm cursor-pointer ${
                          isDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={() =>
                          !isDisabled &&
                          handleSpecialtyToggle(specialty, !isSelected)
                        }
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium">{specialty}</span>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSpecialtyToggle(specialty, checked as boolean)
                          }
                          className="mt-0.5 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          disabled={isDisabled}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Notes Drawer */}
      <Drawer
        isOpen={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          onDrawerClose?.();
        }}
        modal={true}
        dismissible={true}
      >
        <DrawerContent
          size="50%"
          title="Patient Notes"
          icon={<NotebookPen className="text-primary" />}
        >
          <NotesCell
            notes={patient.dashboardNotes || ""}
            onUpdate={handleNotesUpdate}
            drawerColor="white"
            badgeColor="red-500"
            iconTextColor="red-500"
            iconBackgroundColor="white"
            inMobileDrawer={true}
          />
        </DrawerContent>
      </Drawer>

      {/* Chat Thread Modal */}
      <ChatThreadModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          onDrawerClose?.();
        }}
        patient={patient}
      />

      {/* Join Care Team Drawer */}
      <Drawer
        isOpen={isTakeCaseDrawerOpen}
        onClose={() => {
          setIsTakeCaseDrawerOpen(false);
          onDrawerClose?.();
        }}
        modal={true}
        dismissible={true}
      >
        <DrawerContent
          size="50%"
          title="Join Care Team"
          icon={<UserPlus className="text-primary" />}
        >
          <div className="p-4">
            {/* Show current lead surgeon if one exists */}
            {(() => {
              const leadSurgeon = patient.careTeam?.find(m => m.isLead && m.role === "surgeon");
              return leadSurgeon ? (
                <div className="p-3 mb-4 bg-muted rounded-lg">
                  <div className="flex gap-2 items-start">
                    <Stethoscope className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Current Lead Doctor:
                      </div>
                      <div className="text-sm text-foreground">
                        {`${leadSurgeon.firstName || ""} ${leadSurgeon.lastName || ""}`.trim() || "Unknown Doctor"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 mb-4 bg-muted rounded-lg">
                  <div className="flex gap-2 items-start">
                    <Merge className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        No Lead Doctor Assigned
                      </div>
                      <div className="text-sm text-foreground">
                        Select a role to join this patient&apos;s care team.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Select Your Role:
              </h3>
              <RadioCard.Root
                value=""
                onValueChange={(value) => {
                  if (value) {
                    onTakeCase(patientIndex, value);
                    setIsTakeCaseDrawerOpen(false);
                    onDrawerClose?.();
                  }
                }}
                className="flex flex-col gap-2"
              >
                {availableRoles.map((role) => (
                  <RadioCard.Item key={role} value={role} className="text-foreground">
                    <div className="p-4">
                      <h3 className="font-medium">{ROLE_LABELS[role]}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </RadioCard.Item>
                ))}
              </RadioCard.Root>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
