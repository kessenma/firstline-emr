// apps/mobile/src/components/patient-chart/PatientChartContext.tsx
// Context provider for patient chart data and operations - mobile version
// HYBRID POWERSYNC APPROACH:
// READS: Patient data from PowerSync (offline-first, real-time updates)
// WRITES: Via API (server handles, then syncs back through PowerSync)

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { PatientInfoViewModel } from '../../viewModels/PatientInfoViewModel';
import { usePatient } from '../../hooks/usePatients';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { TABLES } from '../../db/powerSyncSchema';
import type { RxOrder, CareTeamMember, CareTeamConflict } from '../../types/patient';
import type { MedOrder } from '../../types/medOrders';
import type { Note } from '../../types/notes';
import { useCareTeam } from '../../hooks/useCareTeamActions';
import { useCareTeamConflicts } from '../../hooks/useCareTeamConflicts';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import type { VideoCallSession, VideoCallStatus } from '@fajr/shared/video-call';

// Re-export types for convenience
export interface PatientInfo {
  id: string;
  patientName: string;
  firstName?: string;
  lastName: string;
  city: string;
  gender: string;
  dob: Date;
  country: string;
  language: string;
  phone: {
    countryCode: string;
    phoneNumber: string;
  };
  email?: string;
  patientID: string;
  telegramChatId?: string;
  doctorEmail?: string;
  priority?: string;
  status?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  allergies?: string;
  hospital?: string;
  missionId?: string;
  missionName?: string;
  dashboardNotes?: string;
}

export interface MediaItem {
  id?: string;
  url: string;
  uploadedAt: Date;
  caption?: string;
  type?: 'image' | 'video' | 'pdf';
}

export type { Note, RxOrder, MedOrder };

// Context interface
interface PatientChartContextType {
  // Patient Info
  patientInfo: PatientInfo | null;
  patientViewModel: PatientInfoViewModel | null;
  loadingPatientInfo: boolean;
  patientError: string | null;

  // Notes
  notes: Note[];
  draftNotes: Note[];
  loadingNotes: boolean;
  notesError: string | null;

  // Medications
  rxOrders: RxOrder[];
  medOrders: MedOrder[];
  loadingMedications: boolean;
  medicationsError: string | null;

  // Media
  photos: MediaItem[];
  loadingMedia: boolean;
  mediaError: string | null;

  // Video call log
  videoCalls: VideoCallSession[];
  loadingVideoCalls: boolean;

  // Care Team
  careTeam: CareTeamMember[];
  isCurrentUserOnTeam: boolean;
  isCurrentUserLead: boolean;
  careTeamConflicts: CareTeamConflict[];
  hasCareTeamConflict: boolean;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExpanded: boolean;
  toggleExpand: () => void;

  // Actions
  fetchPatientData: () => Promise<void>;
  refreshPatientInfo: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshMedications: () => Promise<void>;
  refreshMedia: () => Promise<void>;

  // CRUD Operations
  setPatientInfo: (info: PatientInfo | null) => void;
  addRxOrder: (order: RxOrder) => void;
  addMedOrder: (order: MedOrder) => void;
  setPatientPhotos: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}

// Create context
const PatientChartContext = createContext<PatientChartContextType | undefined>(
  undefined,
);

// Hook to use context
export const usePatientChart = () => {
  const context = useContext(PatientChartContext);
  if (!context) {
    throw new Error('usePatientChart must be used within PatientChartProvider');
  }
  return context;
};

// Alias for compatibility
export const usePatientDashboard = usePatientChart;

// Provider props
interface PatientChartProviderProps {
  children: ReactNode;
  patientId: string;
  initialTab?: string;
}

// Provider component
export const PatientChartProvider: React.FC<PatientChartProviderProps> = ({
  children,
  patientId,
  initialTab,
}) => {
  // State
  const [activeTab, setActiveTab] = useState(initialTab || 'patient-info');
  const [isExpanded, setIsExpanded] = useState(false);

  // ========================================
  // READS: Patient data from PowerSync (offline-first)
  // ========================================
  const {
    patient: powerSyncPatient,
    loading: powerSyncLoading,
    error: powerSyncError,
    refresh: powerSyncRefresh,
  } = usePatient(patientId);

  console.log('📊 [PatientChart] PowerSync patient loaded:', powerSyncPatient?.id);

  // Lookup mission name from PowerSync
  const missionQuery = usePowerSyncQuery<{ name: string }>(
    `SELECT name FROM ${TABLES.MISSIONS} WHERE id = ? LIMIT 1`,
    powerSyncPatient?.missionId ? [powerSyncPatient.missionId] : ['__none__'],
    { enabled: !!powerSyncPatient?.missionId },
  );
  const missionName = missionQuery.data?.[0]?.name || undefined;

  // Transform PowerSync data to PatientInfo format
  const patientInfo = useMemo((): PatientInfo | null => {
    if (!powerSyncPatient) return null;

    return {
      id: powerSyncPatient.id,
      patientName: getAnonymizedName(powerSyncPatient.firstName, powerSyncPatient.lastName),
      firstName: powerSyncPatient.firstName || '',
      lastName: powerSyncPatient.lastName || '',
      city: powerSyncPatient.city || '',
      country: powerSyncPatient.country || '',
      language: powerSyncPatient.language || '',
      gender: powerSyncPatient.gender || '',
      dob: powerSyncPatient.dob ? new Date(powerSyncPatient.dob) : new Date(),
      phone: {
        countryCode: powerSyncPatient.phone?.countryCode || '',
        phoneNumber: powerSyncPatient.phone?.phoneNumber || '',
      },
      email: powerSyncPatient.email || '',
      patientID: powerSyncPatient.id,
      telegramChatId: powerSyncPatient.telegramChatId || '',
      doctorEmail: powerSyncPatient.doctor?.email || '',
      priority: powerSyncPatient.priority || '',
      status: powerSyncPatient.status || '',
      chiefComplaint: powerSyncPatient.chiefComplaint || '',
      diagnosis: powerSyncPatient.diagnosis || '',
      allergies: powerSyncPatient.allergies || '',
      hospital: powerSyncPatient.hospital || '',
      missionId: powerSyncPatient.missionId || undefined,
      missionName,
      dashboardNotes: powerSyncPatient.dashboardNotes || undefined,
    };
  }, [powerSyncPatient, missionName]);

  // Create PatientViewModel from PowerSync data — pass all available fields
  const patientViewModel = useMemo((): PatientInfoViewModel | null => {
    if (!powerSyncPatient) return null;
    return new PatientInfoViewModel(powerSyncPatient);
  }, [powerSyncPatient]);

  const loadingPatientInfo = powerSyncLoading;
  const patientError = powerSyncError?.message || null;

  // For setPatientInfo - data comes from PowerSync, kept for backward compatibility
  const setPatientInfoLocal = useCallback((_info: PatientInfo | null) => {
    console.log('⚠️ [PatientChart] setPatientInfo called - data should come from PowerSync');
  }, []);

  // ========================================
  // READS: Notes from PowerSync (offline-first)
  // ========================================
  const notesQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.NOTES} WHERE patient_id = ? ORDER BY date DESC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId, refetchInterval: 15000 },
  );

  const mapRowToNote = useCallback((row: any, isDraft: boolean): Note => {
    let content = row.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse note content:', e);
        content = null;
      }
    }
    return {
      id: row.id,
      patientId: row.patient_id,
      email: row.email || '',
      noteType: row.note_type,
      date: row.date,
      authorName: row.author_name,
      authorId: row.author_id,
      attendingPhysicianId: row.attending_physician_id || null,
      attendingPhysicianName: row.attending_physician_name || null,
      content,
      draft: isDraft,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }, []);

  const notes = useMemo((): Note[] => {
    if (!notesQuery.data) return [];
    return notesQuery.data
      .filter((row: any) => row.draft === 0 || row.draft === false)
      .map((row: any) => mapRowToNote(row, false));
  }, [notesQuery.data, mapRowToNote]);

  const draftNotes = useMemo((): Note[] => {
    if (!notesQuery.data) return [];
    return notesQuery.data
      .filter((row: any) => row.draft === 1 || row.draft === true)
      .map((row: any) => mapRowToNote(row, true));
  }, [notesQuery.data, mapRowToNote]);

  const loadingNotes = notesQuery.isLoading;
  const notesError = notesQuery.error?.message || null;

  // ========================================
  // READS: Photos from PowerSync (offline-first)
  // ========================================
  const photosQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.PATIENT_MEDIA} WHERE patient_id = ? ORDER BY uploaded_at DESC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId, refetchInterval: 30000 },
  );

  const [localPhotos, setLocalPhotos] = useState<MediaItem[]>([]);

  const photos = useMemo((): MediaItem[] => {
    if (localPhotos.length > 0) return localPhotos;
    if (!photosQuery.data) return [];
    return photosQuery.data.map((row: any): MediaItem => ({
      url: row.url,
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : new Date(),
      type: row.content_type === 'application/pdf' ? 'pdf' : 'image',
    }));
  }, [photosQuery.data, localPhotos]);

  const loadingMedia = photosQuery.isLoading;
  const mediaError = photosQuery.error?.message || null;

  // ========================================
  // READS: Video call log from PowerSync (offline-first)
  // ========================================
  // Written server-side by LiveKit webhooks; the client only ever reads it.
  // invite_token is not synced — see apps/powersync-server/config/sync-rules.yaml.
  const videoCallsQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.VIDEO_CALL_SESSIONS} WHERE patient_id = ? ORDER BY created_at DESC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId, refetchInterval: 30000 },
  );

  const videoCalls = useMemo((): VideoCallSession[] => {
    if (!videoCallsQuery.data) return [];
    return videoCallsQuery.data.map(
      (row: any): VideoCallSession => ({
        id: row.id,
        patientId: row.patient_id,
        roomName: row.room_name,
        startedById: row.started_by_id ?? null,
        // Resolved for display in CallHistoryRow via the users table; the log
        // itself only stores the id.
        startedByName: null,
        status: (row.status as VideoCallStatus) || 'pending',
        createdAt: row.created_at,
        startedAt: row.started_at ?? null,
        patientJoinedAt: row.patient_joined_at ?? null,
        endedAt: row.ended_at ?? null,
        durationSeconds:
          row.duration_seconds != null ? Number(row.duration_seconds) : null,
        endedReason: row.ended_reason ?? null,
        callNotes: row.call_notes ?? null,
      }),
    );
  }, [videoCallsQuery.data]);

  const loadingVideoCalls = videoCallsQuery.isLoading;

  // ========================================
  // READS: Rx Orders from PowerSync (offline-first)
  // ========================================
  const rxQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.RX_ORDERS} WHERE patient_id = ? ORDER BY prescribed_date DESC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId, refetchInterval: 30000 },
  );

  const rxOrders = useMemo((): RxOrder[] => {
    if (!rxQuery.data) return [];
    return rxQuery.data.map((row: any): RxOrder => {
      let prescriptions: any[] = [];
      try {
        if (row.prescriptions && typeof row.prescriptions === 'string') {
          prescriptions = JSON.parse(row.prescriptions);
        }
      } catch {}
      return {
        id: row.id,
        rxOrderId: row.rx_order_id,
        patientId: row.patient_id,
        doctorSpecialty: row.doctor_specialty,
        prescribingDr: row.prescribing_dr,
        drEmail: row.dr_email,
        drId: row.dr_id,
        prescribedDate: row.prescribed_date ? new Date(row.prescribed_date) : undefined,
        validTill: row.valid_till ? new Date(row.valid_till) : undefined,
        city: row.city,
        submitted: row.submitted === 1,
        prescriptions,
        // Carried through so the share sheet can send the same link web sends
        patientRxUrl: row.patient_rx_url ?? null,
        pharmacyQrUrl: row.pharmacy_qr_url ?? null,
        pharmacyQrCode: row.pharmacy_qr_code ?? null,
        // Delivery + access state, written server-side and synced back. The
        // send button reads these to grey itself out and to show whether the
        // patient actually opened the link.
        patientLinkSentAt: row.patient_link_sent_at ?? null,
        patientLinkSentBy: row.patient_link_sent_by ?? null,
        patientLinkOpenedAt: row.patient_link_opened_at ?? null,
        patientLinkOpenCount: row.patient_link_open_count ?? 0,
        patientLinkFailedCount: row.patient_link_failed_count ?? 0,
        patientLinkLastFailedAt: row.patient_link_last_failed_at ?? null,
        patientLinkLockState: row.patient_link_lock_state ?? 'ok',
        pharmacyLinkOpenedAt: row.pharmacy_link_opened_at ?? null,
        rxStatus: row.rx_status ?? null,
        // Cancellation state. Drives the banner and hides the send action.
        cancelledAt: row.cancelled_at ?? null,
        cancelledByRole: row.cancelled_by_role ?? null,
        cancelledByUserId: row.cancelled_by_user_id ?? null,
        cancellationReason: row.cancellation_reason ?? null,
        cancellationReasonCode: row.cancellation_reason_code ?? null,
      };
    });
  }, [rxQuery.data]);

  // ========================================
  // READS: Med Orders from PowerSync (offline-first)
  // ========================================
  const medQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.MED_ORDERS} WHERE patient_id = ? ORDER BY order_date DESC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId, refetchInterval: 30000 },
  );

  const medOrders = useMemo((): MedOrder[] => {
    if (!medQuery.data) return [];
    return medQuery.data.map((row: any): MedOrder => {
      let medications: any[] = [];
      try {
        if (row.medications && typeof row.medications === 'string') {
          medications = JSON.parse(row.medications);
        }
      } catch {}
      return {
        id: row.id,
        prescribingDr: row.prescribing_dr || '',
        orderDate: row.order_date || '',
        medications,
      };
    });
  }, [medQuery.data]);

  const loadingMedications = rxQuery.isLoading || medQuery.isLoading;
  const medicationsError = rxQuery.error?.message || medQuery.error?.message || null;

  // ========================================
  // READS: Care Team from PowerSync (offline-first)
  // ========================================
  const {
    careTeam,
    isCurrentUserOnTeam,
    isCurrentUserLead,
  } = useCareTeam(patientId);

  const {
    conflicts: careTeamConflicts,
    hasConflict: hasCareTeamConflict,
  } = useCareTeamConflicts(patientId);

  // Toggle expand
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Refresh functions — PowerSync queries auto-update, but expose refetch for manual refresh
  const fetchPatientData = useCallback(async () => {
    await Promise.all([
      powerSyncRefresh(),
      notesQuery.refetch(),
      photosQuery.refetch(),
      rxQuery.refetch(),
      medQuery.refetch(),
    ]);
  }, [powerSyncRefresh, notesQuery, photosQuery, rxQuery, medQuery]);

  const refreshPatientInfo = useCallback(async () => {
    await powerSyncRefresh();
  }, [powerSyncRefresh]);

  const refreshNotes = useCallback(async () => {
    await notesQuery.refetch();
  }, [notesQuery]);

  const refreshMedications = useCallback(async () => {
    await Promise.all([rxQuery.refetch(), medQuery.refetch()]);
  }, [rxQuery, medQuery]);

  const refreshMedia = useCallback(async () => {
    await photosQuery.refetch();
  }, [photosQuery]);

  // Add operations — optimistic local additions until PowerSync syncs back
  const addRxOrder = useCallback((_newRxOrder: RxOrder) => {
    // Will appear from PowerSync after server processes the write
    console.log('[PatientChart] RxOrder added, waiting for PowerSync sync');
  }, []);

  const addMedOrder = useCallback((_newMedOrder: MedOrder) => {
    console.log('[PatientChart] MedOrder added, waiting for PowerSync sync');
  }, []);

  const value: PatientChartContextType = {
    // Patient Info
    patientInfo,
    patientViewModel,
    loadingPatientInfo,
    patientError,

    // Notes
    notes,
    draftNotes,
    loadingNotes,
    notesError,

    // Medications
    rxOrders,
    medOrders,
    loadingMedications,
    medicationsError,

    // Media
    photos,
    loadingMedia,
    mediaError,

    // Video call log
    videoCalls,
    loadingVideoCalls,

    // Care Team
    careTeam,
    isCurrentUserOnTeam,
    isCurrentUserLead,
    careTeamConflicts,
    hasCareTeamConflict,

    // UI State
    activeTab,
    setActiveTab,
    isExpanded,
    toggleExpand,

    // Actions
    fetchPatientData,
    refreshPatientInfo,
    refreshNotes,
    refreshMedications,
    refreshMedia,

    // CRUD Operations
    setPatientInfo: setPatientInfoLocal,
    addRxOrder,
    addMedOrder,
    setPatientPhotos: setLocalPhotos,
  };

  return (
    <PatientChartContext.Provider value={value}>
      {children}
    </PatientChartContext.Provider>
  );
};

// Alias for compatibility with existing code
export const PatientDashboardProvider = PatientChartProvider;

export default PatientChartContext;
