// apps/web/components/notifications/UnassignedSpecialtyPatientModal.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  User,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import TelegramMessagesDoctorView from "@/components/patient-chart/telegram-messages/TelegramMessagesDoctorView";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { getAnonymizedName } from "@fajr/shared/patient-utils";
import ReadOnlyField from "@/components/form/ReadOnlyField";
import type { Patient } from "@/db/schema/patients";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PatientViewModelContext } from "@/components/patient-chart/PatientViewModelContext";
import type { PatientInfo } from "@/components/patient-chart/PatientViewModelContext";
import type { RxOrder } from "@/db/schema/patients";
import type { MedOrder } from "@/db/schema/medOrders";
import type { Note } from "@/db/schema/notes";
import { SpecialtyCell } from "@/components/patient-dashboard/cells/SpecialtyCell";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";

interface UnassignedSpecialtyPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
}

interface PatientData extends Patient {
  unreadMessages?: number;
}

// Cache for patient data to avoid refetching when reopening modal
const patientDataCache = new Map<
  string,
  { data: PatientData; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Minimal provider for modal usage - uses the imported PatientViewModelContext
const ModalPatientDashboardProvider: React.FC<{
  children: React.ReactNode;
  patientData: PatientData;
}> = ({ children, patientData }) => {
  const patientInfo: PatientInfo = {
    patientName: getAnonymizedName(patientData.firstName, patientData.lastName),
    city: patientData.city || "",
    country: patientData.country || "",
    language: patientData.language || "",
    gender: patientData.genderPreference || "",
    dob: patientData.dob ? new Date(patientData.dob) : new Date(),
    phone: {
      countryCode: patientData.phone?.countryCode || "",
      phoneNumber: patientData.phone?.phoneNumber || "",
    },
    patientID: patientData.id,
    telegramChatId: patientData.telegramChatId || "",
    doctorEmail: patientData.careTeam?.find((m: any) => m.isLead && m.role === "surgeon")?.email,
  };

  const contextValue = {
    activeTab: "patient-dashboard",
    setActiveTab: () => {},
    patientInfo,
    setPatientInfo: () => {},
    notes: [],
    draftNotes: [],
    loadingPatientInfo: false,
    loadingNotes: false,
    fetchPatientData: async () => {},
    patientViewModel: null,
    isExpanded: false,
    toggleExpand: () => {},
    refreshPatientNotes: async () => {},
    rxOrders: [],
    medOrders: [],
    loadingMedications: false,
    refreshMedications: async () => {},
    addRxOrder: () => {},
    addMedOrder: () => {},
    photos: [],
    setPatientPhotos: () => {},
    dashboardNotes: patientData.dashboardNotes || null,
  };

  return (
    <PatientViewModelContext.Provider value={contextValue}>
      {children}
    </PatientViewModelContext.Provider>
  );
};

const PatientModalContent: React.FC<{ patientId: string }> = ({
  patientId,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    patientChart: boolean;
    messages: boolean;
  }>({
    patientChart: false,
    messages: false,
  });
  const [isUpdatingSpecialty, setIsUpdatingSpecialty] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cached = patientDataCache.get(patientId);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          console.log("[Modal] Using cached patient data");
          setPatientData(cached.data);
          setIsLoading(false);
          return;
        }

        console.log(`[Modal] Fetching patient data for ID: ${patientId}`);

        const response = await fetch(`/api/patient/${patientId}`, {
          credentials: "include",
        });

        console.log(`[Modal] API Response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[Modal] API Error:`, errorData);
          throw new Error(
            errorData.error ||
              `Failed to fetch patient data (${response.status})`,
          );
        }

        const data = await response.json();
        const patient = data.patient || data;

        // Cache the patient data
        patientDataCache.set(patientId, { data: patient, timestamp: now });

        setPatientData(patient);
      } catch (err) {
        console.error("[Modal] Error fetching patient:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load patient data";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const handlePatientDashboardClick = () => {
    router.push("/dashboard");
  };

  const handlePatientDetailClick = () => {
    router.push(`/patient/${patientId}`);
  };

  const toggleSection = (section: "patientChart" | "messages") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle specialty change
  const handleSpecialtyChange = useCallback(
    (newSpecialties: DoctorSpecialtyList[]) => {
      if (!patientData) return;

      setIsUpdatingSpecialty(true);

      // Optimistically update the UI
      setPatientData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          specialties: newSpecialties,
        };
      });

      // Update cache
      if (patientId) {
        const cached = patientDataCache.get(patientId);
        if (cached) {
          patientDataCache.set(patientId, {
            data: { ...cached.data, specialties: newSpecialties },
            timestamp: cached.timestamp,
          });
        }
      }

      setIsUpdatingSpecialty(false);
    },
    [patientData, patientId],
  );

  // Memoized computed values
  const formatPhoneNumber = useMemo(() => {
    if (!patientData?.phone) return "N/A";
    if (typeof patientData.phone === "string") return patientData.phone;
    return (
      `${patientData.phone.countryCode || ""} ${patientData.phone.phoneNumber || ""}`.trim() ||
      "N/A"
    );
  }, [patientData?.phone]);

  const formatDate = useMemo(() => {
    if (!patientData?.dob) return "N/A";
    try {
      return format(new Date(patientData.dob), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  }, [patientData?.dob]);

  const formatTriagedBy = useMemo(() => {
    if (!patientData?.triagedBy) return "Not assigned";
    if (typeof patientData.triagedBy === "object") {
      return (
        `${patientData.triagedBy.firstName || ""} ${patientData.triagedBy.lastName || ""}`.trim() ||
        "Not assigned"
      );
    }
    return String(patientData.triagedBy);
  }, [patientData?.triagedBy]);

  const formatDoctor = useMemo(() => {
    const lead = patientData?.careTeam?.find((m: any) => m.isLead && m.role === "surgeon");
    if (!lead) return "Not assigned";
    return `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Not assigned";
  }, [patientData?.careTeam]);

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

  const hasTelegramId = useMemo(() => {
    return !!(
      patientData?.telegramChatId &&
      patientData.telegramChatId !== "" &&
      patientData.telegramChatId !== "null" &&
      patientData.telegramChatId !== "undefined"
    );
  }, [patientData?.telegramChatId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Action buttons skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
          <Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-48" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header skeleton */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-6 sm:h-8 w-full max-w-[200px] sm:max-w-[300px]" />
                <Skeleton className="h-3 sm:h-4 w-full max-w-[150px] sm:max-w-[250px]" />
              </div>
              <div className="space-y-1 sm:space-y-2 shrink-0">
                <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
                <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>

          {/* Contact info skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <div className="h-12 w-12 text-destructive mb-4 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-full w-full"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">
          {error || "Patient not found"}
        </p>
        <Button onClick={handlePatientDashboardClick} variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Action buttons at the top */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30 shrink-0">
        <Button
          onClick={handlePatientDashboardClick}
          variant="outline"
          className="gap-2 text-sm sm:text-base"
          size="sm"
        >
          <User className="h-4 w-4" />
          Patient Dashboard
        </Button>
        <Button
          onClick={handlePatientDetailClick}
          variant="default"
          className="gap-2 text-sm sm:text-base"
          size="sm"
        >
          <ExternalLink className="h-4 w-4" />
          Full Patient View
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Specialty Assignment Section */}
        {patientData.hasSpecialtyWithoutDoctors === false ? (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                        Resolved
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        This patient&apos;s specialty has been reassigned to{" "}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                          {patientData.specialties &&
                          patientData.specialties.length > 0
                            ? patientData.specialties.join(", ")
                            : "None"}
                        </span>
                        . You can still change it below if needed.
                      </p>
                    </div>
                    <div className="pt-2">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Change Specialty
                      </label>
                      <SpecialtyCell
                        specialty={
                          patientData.specialties &&
                          patientData.specialties.length > 0
                            ? (patientData.specialties[0] as DoctorSpecialtyList)
                            : "Not Selected"
                        }
                        patientId={patientData.id}
                        status={patientData.status || "Pre-Op / Not Cleared"}
                        priority={patientData.priority || "Not Selected"}
                        onChange={handleSpecialtyChange}
                        isLoading={isUpdatingSpecialty}
                        disabled={false}
                        isTriageUser={session?.user?.accountType === "Triage"}
                        patientName={`${patientData.firstName || ""} ${patientData.lastName || ""}`.trim()}
                        patientCountry={patientData.country || "Unknown"}
                        patientLanguage={patientData.language || "English"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                        Assign Specialty
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Patient assigned to{" "}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-foreground text-background">
                          {patientData.specialties &&
                          patientData.specialties.length > 0
                            ? patientData.specialties.join(", ")
                            : "a specialty"}
                        </span>{" "}
                        with no available doctors. Please reassign or wait for
                        doctor availability.
                      </p>
                    </div>
                    <div className="pt-2">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Select Specialty
                      </label>
                      <SpecialtyCell
                        specialty={
                          patientData.specialties &&
                          patientData.specialties.length > 0
                            ? (patientData.specialties[0] as DoctorSpecialtyList)
                            : "Not Selected"
                        }
                        patientId={patientData.id}
                        status={patientData.status || "Pre-Op / Not Cleared"}
                        priority={patientData.priority || "Not Selected"}
                        onChange={handleSpecialtyChange}
                        isLoading={isUpdatingSpecialty}
                        disabled={false}
                        isTriageUser={session?.user?.accountType === "Triage"}
                        patientName={`${patientData.firstName || ""} ${patientData.lastName || ""}`.trim()}
                        patientCountry={patientData.country || "Unknown"}
                        patientLanguage={patientData.language || "English"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Header - Collapsible */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => toggleSection("patientChart")}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="flex-1 text-left min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    {patientData.firstName} {patientData.lastName}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                    Patient ID: {patientData.id}
                  </p>
                </div>
                <div className="flex flex-col gap-1 sm:gap-2 items-end shrink-0">
                  <span
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-full",
                      getStatusColor(patientData.status || "Pre-Op / Not Cleared"),
                    )}
                  >
                    {patientData.status || "Pre-Op / Not Cleared"}
                  </span>
                  {patientData.priority &&
                    patientData.priority !== "Not Selected" && (
                      <span
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-full",
                          getPriorityColor(patientData.priority),
                        )}
                      >
                        {patientData.priority}
                      </span>
                    )}
                </div>
              </div>
              {expandedSections.patientChart ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground ml-2 shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-2 shrink-0" />
              )}
            </button>
            {expandedSections.patientChart && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border">
                {/* Chief Complaint */}
                {patientData.chiefComplaint && (
                  <div className="bg-primary/5 rounded-lg p-3 sm:p-4 mb-4 mt-4">
                    <p className="text-sm font-semibold text-primary mb-1">
                      Chief Complaint:
                    </p>
                    <p className="text-foreground">
                      {patientData.chiefComplaint}
                    </p>
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4">
                  <ReadOnlyField
                    fieldName="email"
                    fieldLabel="Email"
                    value={patientData.email || "Not provided"}
                  />
                  <ReadOnlyField
                    fieldName="phone"
                    fieldLabel="Phone"
                    value={formatPhoneNumber}
                  />
                  <ReadOnlyField
                    fieldName="location"
                    fieldLabel="Location"
                    value={
                      `${patientData.city || ""}, ${patientData.country || ""}`.trim() ||
                      "Not provided"
                    }
                  />
                  <ReadOnlyField
                    fieldName="language"
                    fieldLabel="Language"
                    value={patientData.language || "Not specified"}
                  />
                  <ReadOnlyField
                    fieldName="dob"
                    fieldLabel="Date of Birth"
                    value={formatDate}
                  />
                  <ReadOnlyField
                    fieldName="gender"
                    fieldLabel="Gender Preference"
                    value={patientData.genderPreference || "Not specified"}
                  />
                </div>

                {/* Medical Team Information */}
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-foreground mb-3">
                    Medical Team
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <ReadOnlyField
                      fieldName="triagedBy"
                      fieldLabel="Triaged By"
                      value={formatTriagedBy}
                    />
                    <ReadOnlyField
                      fieldName="doctor"
                      fieldLabel="Assigned Doctor"
                      value={formatDoctor}
                    />
                    <ReadOnlyField
                      fieldName="specialties"
                      fieldLabel="Assigned Specialties"
                      value={
                        patientData.specialties &&
                        patientData.specialties.length > 0
                          ? patientData.specialties.join(", ")
                          : "Not selected"
                      }
                    />
                    <ReadOnlyField
                      fieldName="hospital"
                      fieldLabel="Hospital"
                      value={patientData.hospital || "Not specified"}
                    />
                  </div>
                </div>

                {/* Medical Information */}
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-foreground mb-3">
                    Medical Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <ReadOnlyField
                      fieldName="diagnosis"
                      fieldLabel="Diagnosis"
                      value={patientData.diagnosis || "Not provided"}
                    />
                    <ReadOnlyField
                      fieldName="diagnosisCat"
                      fieldLabel="Diagnosis Category"
                      value={patientData.diagnosisCat || "Not categorized"}
                    />
                    <ReadOnlyField
                      fieldName="baselineAmbu"
                      fieldLabel="Baseline Ambulatory Status"
                      value={patientData.baselineAmbu || "Not specified"}
                    />
                    {patientData.allergies && (
                      <ReadOnlyField
                        fieldName="allergies"
                        fieldLabel="Allergies"
                        value={patientData.allergies}
                      />
                    )}
                  </div>
                </div>

                {/* Dashboard Notes */}
                {patientData.dashboardNotes && (
                  <div className="mt-6">
                    <ReadOnlyField
                      fieldName="dashboardNotes"
                      fieldLabel="Dashboard Notes"
                      value={patientData.dashboardNotes}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages - Collapsible */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => hasTelegramId && toggleSection("messages")}
              className={cn(
                "w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-colors",
                hasTelegramId
                  ? "hover:bg-muted/50 cursor-pointer"
                  : "cursor-not-allowed opacity-60",
              )}
              disabled={!hasTelegramId}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Messages
                </h3>
                {!hasTelegramId && (
                  <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2">
                    (No Telegram ID)
                  </span>
                )}
              </div>
              {hasTelegramId &&
                (expandedSections.messages ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ))}
            </button>
            {expandedSections.messages && hasTelegramId && (
              <div className="border-t border-border">
                <div className="h-[400px] sm:h-[600px]">
                  <ModalPatientDashboardProvider patientData={patientData}>
                    <TelegramMessagesDoctorView
                      telegramChatId={patientData.telegramChatId!}
                      doctorEmail={session?.user?.email || ""}
                      languageUsed={patientData.language || "en"}
                    />
                  </ModalPatientDashboardProvider>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const UnassignedSpecialtyPatientModal: React.FC<
  UnassignedSpecialtyPatientModalProps
> = ({ isOpen, onClose, patientId }) => {
  // Memoize the content to avoid unnecessary re-renders
  const modalContent = useMemo(() => {
    if (!patientId) return null;
    return <PatientModalContent patientId={patientId} />;
  }, [patientId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unassigned Specialty Patient"
      description="Review and reassign patient specialty"
      size="xl"
      scrollable={true}
      noPadding={true}
    >
      {modalContent}
    </Modal>
  );
};

export default UnassignedSpecialtyPatientModal;
