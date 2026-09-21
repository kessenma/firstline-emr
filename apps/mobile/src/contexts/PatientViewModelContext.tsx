// apps/mobile/src/contexts/PatientViewModelContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { PatientInfoViewModel } from "../viewModels/PatientInfoViewModel";
import { getApiUrl } from "../config";
import type { Patient, RxOrder } from "../types/patient";
import type { MedOrder } from "../types/medOrders";
import type { Note } from "../types/notes";

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
  email?: string;
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
  photos: { url: string; uploadedAt: Date }[];
  setPatientPhotos: React.Dispatch<
    React.SetStateAction<{ url: string; uploadedAt: Date }[]>
  >;
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

export const PatientDashboardProvider: React.FC<{
  children: ReactNode;
  patientId: string;
}> = ({ children, patientId }) => {
  const [activeTab, setActiveTab] = useState("patient-dashboard");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draftNotes, setDraftNotes] = useState<Note[]>([]);
  const [loadingPatientInfo, setLoadingPatientInfo] = useState(false);
  const [loadingNotes] = useState(false);
  const [patientViewModel, setPatientViewModel] =
    useState<PatientInfoViewModel | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rxOrders, setRxOrders] = useState<RxOrder[]>([]);
  const [medOrders, setMedOrders] = useState<MedOrder[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [patientPhotos, setPatientPhotos] = useState<
    { url: string; uploadedAt: Date }[]
  >([]);

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
      doctorEmail: patientData.doctor?.email,
      email: patientData.email,
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

  const fetchMedOrders = useCallback(async (): Promise<MedOrder[]> => {
    try {
      const response = await fetch(
        getApiUrl(`/patient/${patientId}/medications/med-order`),
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
    console.log('PatientViewModelContext - fetchPatientData called with patientId:', patientId);
    setLoadingPatientInfo(true);
    setLoadingMedications(true);
    try {
      const response = await fetch(getApiUrl(`/patient/${patientId}`));
      console.log('PatientViewModelContext - API response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('PatientViewModelContext - API response data:', data);

      // Format patient info
      formatPatientInfo(data.patient, patientId);
      console.log('PatientViewModelContext - Patient info formatted');

      // Format notes
      if (data.patient.notes) {
        formatPreviousNotes(data.patient.notes);
        console.log('PatientViewModelContext - Notes formatted:', data.patient.notes.length);
      } else {
        setNotes([]);
        console.log('PatientViewModelContext - No notes found');
      }

      if (data.patient.photos) {
        setPatientPhotos(data.patient.photos);
        console.log('PatientViewModelContext - Photos set:', data.patient.photos.length);
      } else {
        setPatientPhotos([]);
        console.log('PatientViewModelContext - No photos found');
      }

      // Handle Rx Orders
      const formattedRxOrders = (data.patient.rxOrders || []).map(
        (order: RxOrder | string) =>
          typeof order === "string"
            ? ({
                id: order,
                rxOrderId: "",
                doctorSpecialty: "General",
                prescribingDr: "Unknown",
                drEmail: "unknown@unknown.com",
                drId: "unknown",
                prescribedDate: new Date(),
                validTill: new Date(),
                city: "Unknown City",
                validated: false,
                prescriptions: [],
              } as unknown as RxOrder)
            : order,
      );
      setRxOrders(formattedRxOrders);
      console.log('PatientViewModelContext - RxOrders set:', formattedRxOrders.length);

      // Fetch Med Orders
      const detailedMedOrders = await fetchMedOrders();
      setMedOrders(detailedMedOrders);
      console.log('PatientViewModelContext - MedOrders set:', detailedMedOrders.length);
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoadingPatientInfo(false);
      setLoadingMedications(false);
    }
  }, [patientId, formatPatientInfo, formatPreviousNotes, fetchMedOrders]);

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
      }}
    >
      {children}
    </PatientViewModelContext.Provider>
  );
};

export default function Component() {
  return null;
}
