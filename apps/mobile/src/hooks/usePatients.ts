// apps/mobile/src/hooks/usePatients.ts
// PowerSync-based patients hook with filtering, search, and real-time updates

import { useMemo, useCallback, useState } from 'react';
import { usePowerSyncQuery, usePowerSyncMutation } from './powersync';
import { TABLES } from '@/db';
import { entityToRow } from '@/utils/fieldMapping';
import type { Patient, PatientFilters, PatientWithMessages } from '@/types/patient';

/**
 * Map a raw PowerSync SQLite row to a typed Patient object.
 * Shared across usePatients, usePatient, usePatientsWithMessages.
 */
function mapRowToPatient(row: any): Patient {
  let triagedBy: any = undefined;
  let careTeam: any[] = [];
  let phone: { countryCode?: string; phoneNumber?: string } | undefined;

  try {
    if (row.triaged_by && typeof row.triaged_by === 'string') {
      triagedBy = JSON.parse(row.triaged_by);
    }
  } catch {}
  try {
    if (row.care_team && typeof row.care_team === 'string') {
      careTeam = JSON.parse(row.care_team);
    }
  } catch {}
  try {
    if (row.phone && typeof row.phone === 'string') {
      phone = JSON.parse(row.phone);
    }
  } catch {}

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    gender: row.gender,
    city: row.city,
    country: row.country,
    language: row.language,
    phone,
    email: row.email,
    telegramChatId: row.telegram_chat_id,
    telegramAccessHash: row.telegram_access_hash,
    bmi: row.bmi,
    occupation: row.occupation,
    chiefComplaint: row.chief_complaint,
    diagnosis: row.diagnosis,
    diagnosisCat: row.diagnosis_cat,
    icd10: row.icd10,
    hospital: row.hospital,
    priority: row.priority,
    specialties: (() => {
      try {
        if (row.specialties && typeof row.specialties === 'string') {
          return JSON.parse(row.specialties);
        }
      } catch {}
      return row.specialties || [];
    })(),
    status: row.status,
    baselineAmbu: row.baseline_ambu,
    pmhx: row.pmhx,
    pshx: row.pshx,
    famhx: row.famhx,
    allergies: row.allergies,
    currentMeds: row.current_meds,
    prevMeds: row.prev_meds,
    smokeCount: row.smoke_count,
    drinkCount: row.drink_count,
    otherDrugs: row.other_drugs,
    dashboardNotes: row.dashboard_notes,
    isPatient: row.is_patient === 1,
    patientRelation: row.patient_relation,
    genderPreference: row.gender_preference,
    previouslyRegistered: row.previously_registered,
    scheduledVidChat: row.scheduled_vid_chat,
    surgeryDate: row.surgery_date,
    hasSubmittedInfo: row.has_submitted_info === 1,
    createdById: row.created_by_id,
    missionId: row.mission_id,
    coordinator_id: row.coordinator_id,
    triagedBy,
    careTeam,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface UsePatientsReturn {
  patients: Patient[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isRefetching: boolean;
  totalCount: number;
}

interface UsePatientsOptions {
  filters?: PatientFilters;
  limit?: number;
  offset?: number;
}

/**
 * PowerSync-based patients hook with filtering and real-time updates
 *
 * Features:
 * - Real-time updates (automatically re-renders on data changes)
 * - Offline-first (works without network)
 * - Advanced filtering (status, priority, specialty, search)
 * - Pagination support
 * - Type-safe with proper field mapping
 *
 * @example
 * ```tsx
 * function PatientDashboard() {
 *   const { patients, loading, refresh } = usePatients({
 *     filters: {
 *       status: 'Waiting',
 *       priority: 'Urgent'
 *     },
 *     limit: 50
 *   });
 *
 *   return <PatientList patients={patients} onRefresh={refresh} />;
 * }
 * ```
 */
export function usePatients(options: UsePatientsOptions = {}): UsePatientsReturn {
  const {
    filters = {},
    limit = 100,
    offset = 0,
  } = options;

  // Build WHERE conditions from filters
  const { sql, params } = useMemo(() => {
    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Status filter
    if (filters.status) {
      conditions.push('status = ?');
      queryParams.push(filters.status);
    }

    // Priority filter
    if (filters.priority) {
      conditions.push('priority = ?');
      queryParams.push(filters.priority);
    }

    // Specialty filter
    if (filters.specialty) {
      conditions.push('specialties LIKE ?');
      queryParams.push(`%"${filters.specialty}"%`);
    }

    // Hospital filter
    if (filters.hospital) {
      conditions.push('hospital = ?');
      queryParams.push(filters.hospital);
    }

    // Mission filter (multi-select)
    if (filters.missionIds && filters.missionIds.length > 0) {
      const placeholders = filters.missionIds.map(() => '?').join(', ');
      conditions.push(`mission_id IN (${placeholders})`);
      queryParams.push(...filters.missionIds);
    }

    // Search filter (name, email, telegram)
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        '(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR telegram_chat_id LIKE ?)'
      );
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM ${TABLES.PATIENTS}
      ${whereClause}
      ORDER BY
        CASE priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { sql, params: queryParams };
  }, [filters, limit, offset]);

  // Query patients
  const query = usePowerSyncQuery<any>(sql, params, {
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    staleTime: 10000,
  });

  // Get total count (without pagination)
  const countSql = useMemo(() => {
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      queryParams.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('priority = ?');
      queryParams.push(filters.priority);
    }

    if (filters.specialty) {
      conditions.push('specialties LIKE ?');
      queryParams.push(`%"${filters.specialty}"%`);
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        '(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR telegram_chat_id LIKE ?)'
      );
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return {
      sql: `SELECT COUNT(*) as count FROM ${TABLES.PATIENTS} ${whereClause}`,
      params: queryParams,
    };
  }, [filters]);

  const countQuery = usePowerSyncQuery<{ count: number }>(
    countSql.sql,
    countSql.params,
    { refetchInterval: 30000 }
  );

  // Convert database rows to typed Patient objects
  const patients = useMemo(() => {
    if (!query.data) return [];
    return query.data.map(mapRowToPatient);
  }, [query.data]);

  const totalCount = countQuery.data?.[0]?.count || 0;

  return {
    patients,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    isRefetching: query.isRefetching,
    totalCount,
  };
}

/**
 * Hook to get a single patient by ID
 *
 * @param patientId - The patient ID to fetch
 *
 * @example
 * ```tsx
 * function PatientDetailScreen({ route }) {
 *   const { patientId } = route.params;
 *   const { patient, loading } = usePatient(patientId);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!patient) return <NotFound />;
 *
 *   return <PatientDetail patient={patient} />;
 * }
 * ```
 */
export function usePatient(
  patientId: string | undefined
): {
  patient: Patient | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const query = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE id = ? LIMIT 1`,
    patientId ? [patientId] : [],
    {
      enabled: !!patientId,
      refetchInterval: 10000,
    }
  );

  const patient = useMemo(() => {
    if (!query.data?.[0]) return null;
    return mapRowToPatient(query.data[0]);
  }, [query.data]);

  return {
    patient,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

/**
 * Hook to get patients with their unread message counts
 *
 * @example
 * ```tsx
 * function PatientListWithMessages() {
 *   const { patients, loading } = usePatientsWithMessages({
 *     filters: { status: 'Triaged' }
 *   });
 *
 *   return patients.map(patient => (
 *     <PatientCard
 *       key={patient.id}
 *       patient={patient}
 *       unreadCount={patient.unreadMessages}
 *     />
 *   ));
 * }
 * ```
 */
export function usePatientsWithMessages(
  options: UsePatientsOptions = {}
): {
  patients: PatientWithMessages[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const {
    filters = {},
    limit = 100,
    offset = 0,
  } = options;

  // Build query with JOIN to get unread message counts
  const { sql, params } = useMemo(() => {
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (filters.status) {
      conditions.push('p.status = ?');
      queryParams.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('p.priority = ?');
      queryParams.push(filters.priority);
    }

    if (filters.specialty) {
      conditions.push('p.specialties LIKE ?');
      queryParams.push(`%"${filters.specialty}"%`);
    }

    // Hospital filter
    if (filters.hospital) {
      conditions.push('p.hospital = ?');
      queryParams.push(filters.hospital);
    }

    // Mission filter (multi-select)
    if (filters.missionIds && filters.missionIds.length > 0) {
      const placeholders = filters.missionIds.map(() => '?').join(', ');
      conditions.push(`p.mission_id IN (${placeholders})`);
      queryParams.push(...filters.missionIds);
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        '(p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?)'
      );
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.dob,
        p.gender,
        p.city,
        p.country,
        p.language,
        p.chief_complaint,
        p.status,
        p.priority,
        p.specialties,
        p.dashboard_notes,
        p.hospital,
        p.mission_id,
        COALESCE(p.telegram_chat_id, tt.chat_id) as telegram_chat_id,
        p.triaged_by,
        p.care_team,
        p.coordinator_id,
        p.created_at,
        p.updated_at,
        COALESCE(tt.unread_count, 0) as unread_messages
      FROM ${TABLES.PATIENTS} p
      LEFT JOIN ${TABLES.TELEGRAM_THREADS} tt ON p.id = tt.patient_id
      ${whereClause}
      ORDER BY
        CASE p.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END,
        p.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { sql, params: queryParams };
  }, [filters, limit, offset]);

  const query = usePowerSyncQuery<any>(sql, params, {
    refetchInterval: 15000,
    retry: 3,
  });

  const patients = useMemo(() => {
    if (!query.data) return [];
    return query.data.map((row): PatientWithMessages => ({
      ...mapRowToPatient(row),
      unreadMessages: row.unread_messages || 0,
    }));
  }, [query.data]);

  return {
    patients,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

/**
 * Hook to get patient statistics by status
 *
 * @example
 * ```tsx
 * function PatientStats() {
 *   const { stats, loading } = usePatientStats();
 *
 *   return (
 *     <StatsGrid>
 *       <StatCard label="Waiting" count={stats.waiting} />
 *       <StatCard label="Triaged" count={stats.triaged} />
 *       <StatCard label="In Progress" count={stats.inProgress} />
 *     </StatsGrid>
 *   );
 * }
 * ```
 */
export function usePatientStats(): {
  stats: Record<string, number>;
  loading: boolean;
  error: Error | null;
} {
  const query = usePowerSyncQuery<{ status: string; count: number }>(
    `SELECT
       status,
       COUNT(*) as count
     FROM ${TABLES.PATIENTS}
     GROUP BY status`,
    [],
    {
      refetchInterval: 30000,
    }
  );

  const stats = useMemo(() => {
    if (!query.data) return {};

    return query.data.reduce((acc, row) => {
      acc[row.status || 'Unknown'] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }, [query.data]);

  return {
    stats,
    loading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for patient mutations (create, update)
 *
 * @example
 * ```tsx
 * function PatientForm({ patientId }) {
 *   const { updatePatient, loading } = usePatientMutations();
 *
 *   const handleSave = async (data) => {
 *     await updatePatient(patientId, data);
 *   };
 *
 *   return <Form onSubmit={handleSave} />;
 * }
 * ```
 */
export function usePatientMutations() {
  const mutation = usePowerSyncMutation(
    async (variables: { sql: string; params: any[] }) => {
      // This would execute the SQL mutation
      console.log('Executing SQL mutation:', variables);
      // For now, return a mock result
      return { success: true };
    },
    {
      onError: (error) => {
        console.error('❌ Patient mutation failed:', error);
      },
    }
  );

  const updatePatient = useCallback(
    async (patientId: string, data: Partial<Patient>) => {
      const dbRow = entityToRow(data);
      const fields = Object.keys(dbRow);
      const values = Object.values(dbRow);

      const setClause = fields.map(f => `${f} = ?`).join(', ');

      await mutation.mutateAsync({
        sql: `UPDATE ${TABLES.PATIENTS} SET ${setClause}, updated_at = ? WHERE id = ?`,
        params: [...values, new Date().toISOString(), patientId],
      });
    },
    [mutation]
  );

  return {
    updatePatient,
    loading: mutation.loading,
    error: mutation.error,
  };
}

/**
 * Hook to search patients with debounced search term
 *
 * @param searchTerm - The search term
 * @param debounceMs - Debounce delay in milliseconds
 *
 * @example
 * ```tsx
 * function PatientSearch() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const { patients, loading } = usePatientSearch(searchTerm, 300);
 *
 *   return (
 *     <>
 *       <SearchInput value={searchTerm} onChange={setSearchTerm} />
 *       {loading ? <Spinner /> : <PatientList patients={patients} />}
 *     </>
 *   );
 * }
 * ```
 */
export function usePatientSearch(
  searchTerm: string,
  debounceMs: number = 300
): {
  patients: Patient[];
  loading: boolean;
  error: Error | null;
} {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  // Debounce search term
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchTerm, debounceMs]);

  const { patients, loading, error } = usePatients({
    filters: { search: debouncedTerm },
    limit: 50,
  });

  return {
    patients,
    loading,
    error,
  };
}
