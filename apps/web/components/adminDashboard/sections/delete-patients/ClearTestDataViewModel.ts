// apps/web/components/adminDashboard/sections/ClearTestDataViewModel.ts
import { useState, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";

export type PatientType = "regular" | "medevac";
export type SearchType = "recent" | "phone" | "name" | "id";

export interface PatientData {
  id: string;
  patientId?: string; // For MedEvac patients, this is the base patient ID
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
  phone?: {
    countryCode?: string;
    phoneNumber?: string;
  } | null;
  telegramChatId?: string | null;
  createdAt: string | Date;
  status?: string | null;
  type: PatientType;
}

export function useClearTestDataViewModel() {
  const { setToast } = useToast();

  // Search state
  const [searchType, setSearchType] = useState<SearchType>("recent");
  const [patientTypeFilter, setPatientTypeFilter] = useState<
    "all" | PatientType
  >("all");

  // Search inputs
  const [patientId, setPatientId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Results
  const [searchResults, setSearchResults] = useState<PatientData[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientData[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Don't load recent patients automatically - only when requested
  // This prevents unnecessary API calls when the accordion is closed

  const loadRecentPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/patients/search?type=recent&patientType=${patientTypeFilter}`,
        { method: "GET" },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load recent patients");
      }

      const data = await response.json();
      setRecentPatients(data.patients || []);
    } catch (error) {
      console.error("Error loading recent patients:", error);
      setToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load recent patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    // Validate inputs based on search type
    if (searchType === "id" && !patientId.trim()) {
      setToast({
        title: "Error",
        description: "Please enter a patient ID",
        variant: "destructive",
      });
      return;
    }

    if (searchType === "phone" && !phoneNumber.trim()) {
      setToast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (searchType === "name" && !firstName.trim() && !lastName.trim()) {
      setToast({
        title: "Error",
        description: "Please enter at least first name or last name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      let url = `/api/admin/patients/search?type=${searchType}&patientType=${patientTypeFilter}`;

      if (searchType === "id") {
        url += `&query=${encodeURIComponent(patientId.trim())}`;
      } else if (searchType === "phone") {
        url += `&query=${encodeURIComponent(phoneNumber.trim())}`;
      } else if (searchType === "name") {
        if (firstName.trim()) {
          url += `&firstName=${encodeURIComponent(firstName.trim())}`;
        }
        if (lastName.trim()) {
          url += `&lastName=${encodeURIComponent(lastName.trim())}`;
        }
      }

      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error("Failed to search for patients");
      }

      const data = await response.json();
      setSearchResults(data.patients || []);

      if (data.patients.length === 0) {
        setToast({
          title: "No results",
          description: "No patients found matching your search",
          variant: "default",
        });
      } else {
        setToast({
          title: "Success",
          description: `Found ${data.patients.length} patient(s)`,
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      setToast({
        title: "Error",
        description: "Failed to search for patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (patient: PatientData) => {
    const patientName =
      `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
      "Unknown";
    const patientTypeLabel = patient.type === "medevac" ? "MedEvac" : "Regular";

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${patientTypeLabel} patient "${patientName}"?\n\n` +
        `This will permanently delete:\n` +
        `• Patient record\n` +
        `• All associated data\n` +
        `• All media files (photos, videos, audio)\n` +
        `• Telegram thread (if exists)\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    setDeleting(patient.id);

    try {
      const response = await fetch(
        `/api/admin/patients/delete?id=${patient.id}&type=${patient.type}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete patient");
      }

      const result = await response.json();
      const mediaCount = result.deletedMediaCount || 0;
      const mediaText =
        mediaCount > 0
          ? ` (${mediaCount} media file${mediaCount > 1 ? "s" : ""} deleted)`
          : "";

      setToast({
        title: "Success",
        description: `Patient "${patientName}" deleted successfully${mediaText}`,
        variant: "success",
      });

      // Remove from both lists
      setSearchResults((prev) => prev.filter((p) => p.id !== patient.id));
      setRecentPatients((prev) => prev.filter((p) => p.id !== patient.id));

      // Clear search inputs
      setPatientId("");
      setPhoneNumber("");
      setFirstName("");
      setLastName("");
    } catch (error) {
      console.error("Error deleting patient:", error);
      setToast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete patient",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const clearSearchInputs = () => {
    setPatientId("");
    setPhoneNumber("");
    setFirstName("");
    setLastName("");
    setSearchResults([]);
  };

  const formatPhoneNumber = (phone: PatientData["phone"]): string => {
    if (!phone) return "N/A";
    if (typeof phone === "string") return phone;
    if (phone.phoneNumber) {
      return `${phone.countryCode || ""} ${phone.phoneNumber}`.trim();
    }
    return "N/A";
  };

  return {
    // Search state
    searchType,
    setSearchType,
    patientTypeFilter,
    setPatientTypeFilter,

    // Search inputs
    patientId,
    setPatientId,
    phoneNumber,
    setPhoneNumber,
    firstName,
    setFirstName,
    lastName,
    setLastName,

    // Results
    searchResults,
    recentPatients,

    // UI state
    loading,
    deleting,

    // Actions
    handleSearch,
    handleDelete,
    clearSearchInputs,
    loadRecentPatients,
    formatPhoneNumber,
  };
}
