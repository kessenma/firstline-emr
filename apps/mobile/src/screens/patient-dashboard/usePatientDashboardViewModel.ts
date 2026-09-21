// apps/mobile/src/screens/patient-dashboard/usePatientDashboardViewModel.ts
// View model hook for patient dashboard screen - FULL OFFLINE-FIRST POWERSYNC
// READS: From PowerSync (offline-first, real-time updates from local SQLite)
// WRITES: To PowerSync (local SQLite first, then synced to server when online)

import { useState, useCallback, useMemo } from 'react';
import { usePatientsWithMessages } from '../../hooks/usePatients';
import { useMissions } from '../../hooks/useMissions';
import { useFollowUpPatientIds } from '../../hooks/useFollowUpPatientIds';
import { useConflictPatientIds } from '../../hooks/useConflictPatientIds';
import { useAuth } from '../../contexts/AuthContext';
import { powerSyncService } from '../../services/powersync/PowerSyncService';
import { TABLES } from '../../db/powerSyncSchema';
import { generateUUID } from '../../utils/uuid';
import { TokenStorage } from '../../services/TokenStorage';
import type { PatientWithMessages, CareTeamRole } from '../../types/patient';
import type { MissionOption } from '../../hooks/useMissions';
import {
  type DashboardFilters,
  DEFAULT_DASHBOARD_FILTERS,
  getActiveFilterCount,
  applyDashboardFilters,
  reduceDashboardFilters,
  clearDashboardFilters,
} from './dashboardFilterTypes';

export interface UsePatientDashboardViewModelReturn {
  // Data
  patients: PatientWithMessages[];
  filteredPatients: PatientWithMessages[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Filter state
  filters: DashboardFilters;
  activeFilterCount: number;
  availableHospitals: string[];
  missions: MissionOption[];
  conflictCount: number;

  // Filter actions
  updateFilters: (partial: Partial<DashboardFilters>) => void;
  clearFilters: () => void;
  refreshPatients: () => Promise<void>;

  // Patient actions
  updatePatientStatus: (patientId: string, status: string) => Promise<void>;
  updatePatientHospital: (patientId: string, hospital: string | null) => Promise<void>;
  updatePatientPriority: (patientId: string, priority: string) => Promise<void>;
  updatePatientNotes: (patientId: string, notes: string) => Promise<void>;
  takeCaseOffline: (patientId: string, role?: CareTeamRole) => Promise<void>;
}

export function usePatientDashboardViewModel(): UsePatientDashboardViewModelReturn {
  const { user } = useAuth();
  const [filters, setFiltersState] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data sources for filter options and client-side filtering
  const { missions } = useMissions();
  const { followUpPatientIds } = useFollowUpPatientIds();
  const { conflictPatientIds, conflictCount } = useConflictPatientIds();

  // Derive hospital list from missions
  const availableHospitals = useMemo(() => {
    return Array.from(
      new Set(missions.flatMap(m => (m.hospitals || []).map(h => h.name))),
    );
  }, [missions]);

  // Build PowerSync query options from SQL-level filters
  const powerSyncOptions = useMemo(() => {
    // Map viewMode to status filter: 'discharged' → only discharged, 'active' → exclude discharged
    const statusFilter =
      filters.viewMode === 'discharged'
        ? 'Post-Op / Discharged'
        : filters.status || undefined;

    return {
      filters: {
        status: (filters.viewMode === 'active' && !filters.status
          ? undefined  // 'active' viewMode: show all non-discharged (handled client-side below)
          : statusFilter) as any,
        priority: filters.priority as any,
        specialty: filters.specialty,
        hospital: filters.hospital,
        missionIds: filters.missionIds,
      },
      limit: 200,
    };
  }, [
    filters.viewMode,
    filters.status,
    filters.priority,
    filters.specialty,
    filters.hospital,
    filters.missionIds,
  ]);

  // ========================================
  // READS: From PowerSync (offline-first)
  // ========================================
  const {
    patients: rawPatients,
    loading: powerSyncLoading,
    error: powerSyncError,
    refresh: powerSyncRefresh,
  } = usePatientsWithMessages(powerSyncOptions);

  // Client-side filters, via the predicate shared with web. The PowerSync query
  // above already narrows status/priority/specialty/hospital/missionIds, but
  // re-applying them here is idempotent, so nothing is marked as prefiltered.
  const filteredPatients = useMemo(
    () =>
      applyDashboardFilters(rawPatients, filters, {
        currentUserId: user?.id ? String(user.id) : undefined,
        currentUserEmail: user?.email,
        followUpPatientIds,
        conflictPatientIds,
      }),
    [rawPatients, filters, user, followUpPatientIds, conflictPatientIds],
  );

  // Active filter count
  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters],
  );

  // Mutual-exclusion rules live in the shared reducer so web behaves identically
  const updateFilters = useCallback((partial: Partial<DashboardFilters>) => {
    setFiltersState(prev => reduceDashboardFilters(prev, partial));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(clearDashboardFilters());
  }, []);

  // Refresh patients
  const refreshPatients = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await powerSyncRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [powerSyncRefresh]);

  // ========================================
  // WRITES: To PowerSync (offline-first)
  // ========================================

  const updatePatientStatus = useCallback(
    async (patientId: string, status: string) => {
      try {
        await powerSyncService.update(TABLES.PATIENTS, patientId, {
          status,
          updated_at: new Date().toISOString(),
        });
        await powerSyncRefresh();
      } catch (err) {
        console.error('[PatientDashboard] Error updating patient status:', err);
        throw err;
      }
    },
    [powerSyncRefresh],
  );

  const updatePatientPriority = useCallback(
    async (patientId: string, priority: string) => {
      try {
        await powerSyncService.update(TABLES.PATIENTS, patientId, {
          priority,
          updated_at: new Date().toISOString(),
        });
        await powerSyncRefresh();
      } catch (err) {
        console.error(
          '[PatientDashboard] Error updating patient priority:',
          err,
        );
        throw err;
      }
    },
    [powerSyncRefresh],
  );

  const updatePatientHospital = useCallback(
    async (patientId: string, hospital: string | null) => {
      try {
        await powerSyncService.update(TABLES.PATIENTS, patientId, {
          hospital,
          updated_at: new Date().toISOString(),
        });
        await powerSyncRefresh();
      } catch (err) {
        console.error('[PatientDashboard] Error updating patient hospital:', err);
        throw err;
      }
    },
    [powerSyncRefresh],
  );

  const updatePatientNotes = useCallback(
    async (patientId: string, notes: string) => {
      try {
        await powerSyncService.update(TABLES.PATIENTS, patientId, {
          dashboard_notes: notes,
          updated_at: new Date().toISOString(),
        });
        await powerSyncRefresh();
      } catch (err) {
        console.error('[PatientDashboard] Error updating patient notes:', err);
        throw err;
      }
    },
    [powerSyncRefresh],
  );

  const takeCaseOffline = useCallback(
    async (patientId: string, role: CareTeamRole = 'surgeon') => {
      try {
        const currentUser = TokenStorage.getUser();
        const currentUserId = String(currentUser?.id || '');
        if (!currentUserId) throw new Error('No current user ID');

        const now = new Date().toISOString();
        const isLead = role === 'surgeon';

        await powerSyncService.insert(TABLES.PATIENT_CARE_TEAM, {
          id: generateUUID(),
          patient_id: patientId,
          user_id: currentUserId,
          role,
          is_lead: isLead ? 1 : 0,
          assigned_at: now,
          assigned_by: currentUserId,
          removed_at: null,
          created_at: now,
          updated_at: now,
        });

        if (isLead) {
          const doctorJson = JSON.stringify({
            firstName: currentUser?.firstName || '',
            lastName: currentUser?.lastName || '',
            email: currentUser?.email || '',
          });
          await powerSyncService.update(TABLES.PATIENTS, patientId, {
            doctor: doctorJson,
            status: 'Peri-Op / In Surgery',
            updated_at: now,
          });
        }

        await powerSyncRefresh();
      } catch (err) {
        console.error('[PatientDashboard] Error taking case:', err);
        throw err;
      }
    },
    [powerSyncRefresh],
  );

  return {
    patients: rawPatients,
    filteredPatients,
    isLoading: powerSyncLoading,
    isRefreshing,
    error: powerSyncError?.message || null,

    filters,
    activeFilterCount,
    availableHospitals,
    missions,
    conflictCount,

    updateFilters,
    clearFilters,
    refreshPatients,

    updatePatientStatus,
    updatePatientHospital,
    updatePatientPriority,
    updatePatientNotes,
    takeCaseOffline,
  };
}
