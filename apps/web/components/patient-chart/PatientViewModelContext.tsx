// apps/web/components/patient-chart/PatientViewModelContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { useParams } from "next/navigation";
import { PatientInfoViewModel } from "./patient-info/PatientInfoViewModel";
import type { Patient } from "@/db/schema/patients";
import type { ListNotesResponse, NoteBase as Note } from "@fajr/shared/patient";
import type {
  ListRxOrdersResponse,
  MedOrder,
  RxOrder,
} from "@fajr/shared/medications";

export interface PatientInfo {
  patientName: string;
  city: string;
  gender: string;
  dob: Date;
  country: string;
  language: string;
  phone: {
    countryCode: string;
    phoneNumber: string;
  };
  patientID: string;
  telegramChatId?: string;
  doctorEmail?: string;
  missionId?: string;
  leadSurgeon?: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

/**
 * One row of `patient_media`, as served by GET /api/patient/{id}.
 *
 * `id` is the database id, not a render key — it is what addresses a photo for
 * deletion, so anything constructing one of these optimistically must supply
 * the real id the server returned.
 */
export interface PatientPhoto {
  id: string;
  url: string;
  uploadedAt: Date;
  contentType?: string | null;
  /** "upload" | "video_call"; null on rows predating the column. */
  source?: string | null;
}

interface PatientContext {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  patientInfo: PatientInfo | null;
  setPatientInfo: (patientInfo: PatientInfo | null) => void;
  notes: Note[];
  draftNotes: Note[];
  loadingPatientInfo: boolean;
  loadingNotes: boolean;
  fetchPatientData: () => Promise<void>;
  patientViewModel: PatientInfoViewModel | null;
  isExpanded: boolean;
  toggleExpand: () => void;
  refreshPatientNotes: () => Promise<void>;
  rxOrders: RxOrder[];
  medOrders: MedOrder[];
  loadingMedications: boolean;
  refreshMedications: () => Promise<void>;
  addRxOrder: (newRxOrder: RxOrder) => void;
  addMedOrder: (newMedOrder: MedOrder) => void;
  photos: PatientPhoto[];
  setPatientPhotos: React.Dispatch<React.SetStateAction<PatientPhoto[]>>;
  dashboardNotes: string | null;
}

export const isRxOrder = (item: RxOrder | MedOrder): item is RxOrder => {
  return (item as RxOrder).prescriptions !== undefined;
};

export const PatientViewModelContext = createContext<
  PatientContext | undefined
>(undefined);

export const usePatientDashboard = () => {
  const context = useContext(PatientViewModelContext);
  if (!context) {
    throw new Error(
      "usePatientDashboard must be used within PatientDashboardProvider",
    );
  }
  return context;
};

export const PatientDashboardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { id: patientId } = useParams() as { id: string };
  const [activeTab, setActiveTab] = useState("patient-dashboard");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draftNotes, setDraftNotes] = useState<Note[]>([]);
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [patientViewModel, setPatientViewModel] =
    useState<PatientInfoViewModel | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rxOrders, setRxOrders] = useState<RxOrder[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrder[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [patientPhotos, setPatientPhotos] = useState<PatientPhoto[]>([]);
  const [dashboardNotes, setDashboardNotes] = useState<string | null>(null);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  const formatPatientInfo = useCallback((patientData: Patient, id: string) => {
    const patientInfo: PatientInfo = {
      patientName: `${patientData.firstName} ${patientData.lastName}`,
      city: patientData.city || "",
      country: patientData.country || "",
      language: patientData.language || "",
      gender: patientData.genderPreference || "",
      dob: patientData.dob ? new Date(patientData.dob) : new Date(),
      phone: {
        countryCode: patientData.phone?.countryCode || "",
        phoneNumber: patientData.phone?.phoneNumber || "",
      },
      patientID: id,
      telegramChatId: patientData.telegramChatId || "",
      doctorEmail: patientData.careTeam?.find(m => m.isLead && m.role === "surgeon")?.email,
      missionId: patientData.missionId || undefined,
      leadSurgeon: (() => {
        const lead = patientData.careTeam?.find(m => m.isLead && m.role === "surgeon");
        return lead ? { userId: lead.userId, firstName: lead.firstName, lastName: lead.lastName, email: lead.email } : null;
      })(),
    };

    setPatientInfo(patientInfo); // Update patientInfo in context
    setPatientViewModel(new PatientInfoViewModel(patientData));
  }, []);

  const memoizedPatientInfo = useMemo(() => patientInfo, [patientInfo]);

  const formatPreviousNotes = useCallback(
    (notesData: Note[]) => {
      if (Array.isArray(notesData)) {
        const formattedNotes = notesData.map((note) => {
          const plainNote = note;
          return {
            ...plainNote,
            title: plainNote.noteType,
            patientName: memoizedPatientInfo?.patientName || "",
          } as Note;
        });
        setNotes(formattedNotes.filter((note) => note.draft === false));
        setDraftNotes(formattedNotes.filter((note) => note.draft === true));
      } else {
        setNotes([]);
        setDraftNotes([]);
      }
    },
    [memoizedPatientInfo?.patientName],
  );

  // Notes live in their own table, so the patient GET's column projection never
  // returned them — `data.patient.notes` was always undefined and the chart's
  // Notes section rendered empty. Same failure the medications list had.
  const fetchNotes = useCallback(async (): Promise<Note[]> => {
    try {
      const response = await fetch(
        `/api/patient/${patientId}/notes/doctor-notes`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error("Error fetching notes data");

      const data: ListNotesResponse = await response.json();
      return data.notes ?? [];
    } catch (error) {
      console.error("Error fetching notes:", error);
      return [];
    }
  }, [patientId]);

  // RX orders have their own endpoint. `GET /api/patient/{id}` returns an
  // explicit column projection of the patients table and has never included
  // them, so reading `data.patient.rxOrders` silently yielded an empty list.
  const fetchRxOrders = useCallback(async (): Promise<RxOrder[]> => {
    try {
      const response = await fetch(
        `/api/patient/${patientId}/medications/rx-order`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error("Error fetching rx orders data");

      const data: ListRxOrdersResponse = await response.json();
      return data.rxOrders ?? [];
    } catch (error) {
      console.error("Error fetching rx orders:", error);
      return [];
    }
  }, [patientId]);

  const fetchMedOrders = useCallback(async (): Promise<MedOrder[]> => {
    try {
      const response = await fetch(
        `/api/patient/${patientId}/medications/med-order`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error("Error fetching med orders data");

      const data = await response.json();
      console.log("Fetched med orders from API:", data);
      return data as MedOrder[];
    } catch (error) {
      console.error("Error fetching med orders:", error);
      return [];
    }
  }, [patientId]);

  const fetchPatientData = useCallback(async () => {
    setLoadingPatientInfo(true);
    setLoadingNotes(true);
    setLoadingMedications(true);
    try {
      const response = await fetch(`/api/patient/${patientId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Format patient info
      formatPatientInfo(data.patient, patientId);
      setDashboardNotes(data.patient.dashboardNotes || null);

      if (data.patient.photos) {
        setPatientPhotos(data.patient.photos);
      } else {
        setPatientPhotos([]);
      }

      // Notes and medication orders each live in their own table and so have
      // their own endpoints — none of them come back on the patient GET.
      const [patientNotes, detailedRxOrders, detailedMedOrders] =
        await Promise.all([fetchNotes(), fetchRxOrders(), fetchMedOrders()]);
      formatPreviousNotes(patientNotes);
      setRxOrders(detailedRxOrders);
      setMedOrders(detailedMedOrders);
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoadingPatientInfo(false);
      setLoadingNotes(false);
      setLoadingMedications(false);
    }
  }, [
    patientId,
    formatPatientInfo,
    formatPreviousNotes,
    fetchNotes,
    fetchRxOrders,
    fetchMedOrders,
  ]);

  const refreshMedications = useCallback(async () => {
    setLoadingMedications(true);
    try {
      await fetchPatientData();
    } catch (error) {
      console.error("Error refreshing medications:", error);
    } finally {
      setLoadingMedications(false);
    }
  }, [fetchPatientData]);

  const addRxOrder = useCallback((newRxOrder: RxOrder) => {
    setRxOrders((prevOrders) => [newRxOrder, ...prevOrders]);
  }, []);

  const addMedOrder = useCallback((newMedOrder: MedOrder) => {
    setMedOrders((prevOrders) => [newMedOrder, ...prevOrders]); // Add the new med order to the top
  }, []);

  return (
    <PatientViewModelContext.Provider
      value={{
        activeTab,
        setActiveTab,
        patientInfo,
        setPatientInfo,
        notes,
        draftNotes,
        loadingPatientInfo,
        loadingNotes,
        fetchPatientData,
        patientViewModel,
        isExpanded,
        toggleExpand,
        refreshPatientNotes: fetchPatientData,
        rxOrders,
        medOrders,
        loadingMedications,
        refreshMedications,
        addRxOrder,
        addMedOrder,
        photos: patientPhotos,
        setPatientPhotos,
        dashboardNotes,
      }}
    >
      {children}
    </PatientViewModelContext.Provider>
  );
};

export default function Component() {
  return null;
}
