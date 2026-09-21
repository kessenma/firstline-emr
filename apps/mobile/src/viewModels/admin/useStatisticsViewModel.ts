// apps/mobile/src/viewModels/admin/useStatisticsViewModel.ts
// ViewModel for Statistics section - handles fetching and processing statistics data
// HYBRID APPROACH: Reactive PowerSync reads for user counts/specialties (offline-first),
// API for activity metrics, full API fallback when PowerSync is unavailable

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { usePowerSync, usePowerSyncQuery } from '../../hooks/powersync';
import { adminApi } from '../../utils/admin/adminApi';
import type {
  StatisticsData,
  UserCountStatistics,
  SpecialtyBreakdownItem,
  ActivityMetrics,
  DateRange,
} from '../../types/admin';

interface UseStatisticsViewModelResult {
  // Data
  statistics: StatisticsData | null;
  userCounts: UserCountStatistics | null;
  specialtyBreakdown: SpecialtyBreakdownItem[];
  activityMetrics: ActivityMetrics | null;
  lastUpdated: Date | null;

  // Specialty data for charts (matching web version)
  doctorSpecialties: SpecialtyBreakdownItem[];
  patientSpecialties: SpecialtyBreakdownItem[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isExporting: boolean;

  // Error state
  error: string | null;

  // Date range
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;

  // Actions
  fetchStatistics: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  exportData: () => Promise<void>;
  clearError: () => void;

  // Computed values
  totalUsersCount: number;
  topSpecialties: SpecialtyBreakdownItem[];
  hasData: boolean;
}

// Single reactive UNION ALL query for all user counts (same pattern as
// useSyncDataSummary). db.watch() re-runs it whenever users/admins change.
const USER_COUNTS_SQL = `
  SELECT 'totalUsers' as k, COUNT(*) as cnt FROM users WHERE authorized = 1
  UNION ALL SELECT 'newSignups', COUNT(*) FROM users WHERE authorized = 0 AND (denial_date IS NULL OR denial_date = "")
  UNION ALL SELECT 'deniedUsers', COUNT(*) FROM users WHERE authorized = 0 AND denial_date IS NOT NULL AND denial_date != ""
  UNION ALL SELECT 'doctorCount', COUNT(*) FROM users WHERE authorized = 1 AND account_type = 'Doctor'
  UNION ALL SELECT 'triageCount', COUNT(*) FROM users WHERE authorized = 1 AND account_type = 'Triage'
  UNION ALL SELECT 'adminUsers', COUNT(*) FROM admins
`;

const DOCTOR_SPECIALTY_SQL =
  "SELECT doctor_specialty FROM users WHERE authorized = 1 AND doctor_specialty IS NOT NULL AND doctor_specialty != '' AND doctor_specialty != '[]'";

const PATIENT_SPECIALTY_SQL =
  "SELECT specialties FROM patients WHERE specialties IS NOT NULL AND specialties != '' AND specialties != '[]'";

const DEFAULT_ACTIVITY_METRICS: ActivityMetrics = {
  medicalOrdersCount: 0,
  notificationsCount: 0,
  lastWeekSignups: 0,
  lastMonthSignups: 0,
};

export function useStatisticsViewModel(): UseStatisticsViewModelResult {
  const { isInitialized } = usePowerSync();

  // State
  // Full statistics from the API — only used when PowerSync is unavailable
  const [apiStatistics, setApiStatistics] = useState<StatisticsData | null>(null);
  // Activity metrics always come from the API (non-blocking, zero defaults)
  const [apiActivityMetrics, setApiActivityMetrics] = useState<ActivityMetrics>(
    DEFAULT_ACTIVITY_METRICS,
  );
  // Patient specialties from the API — only used if the PowerSync query fails
  const [apiPatientSpecialties, setApiPatientSpecialties] = useState<SpecialtyBreakdownItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range state (default to last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  // ─── Reactive PowerSync reads ─────────────────────────────────────────────

  const countsQuery = usePowerSyncQuery<{ k: string; cnt: number }>(
    USER_COUNTS_SQL,
    [],
    { enabled: isInitialized },
  );

  const doctorSpecialtyQuery = usePowerSyncQuery<{ doctor_specialty: string }>(
    DOCTOR_SPECIALTY_SQL,
    [],
    { enabled: isInitialized },
  );

  const patientSpecialtyQuery = usePowerSyncQuery<{ specialties: string }>(
    PATIENT_SPECIALTY_SQL,
    [],
    { enabled: isInitialized },
  );

  // Aggregate the UNION ALL count rows into a UserCountStatistics object
  const powerSyncUserCounts: UserCountStatistics | null = useMemo(() => {
    const rows = countsQuery.data;
    if (!rows) return null;

    const byKey: Record<string, number> = {};
    for (const row of rows) {
      byKey[row.k] = row.cnt;
    }

    const totalUsers = byKey.totalUsers || 0;
    return {
      totalUsers,
      newSignups: byKey.newSignups || 0,
      existingUsers: totalUsers, // Same as totalUsers for authorized users
      deniedUsers: byKey.deniedUsers || 0,
      adminUsers: byKey.adminUsers || 0,
      doctorCount: byKey.doctorCount || 0,
      triageCount: byKey.triageCount || 0,
    };
  }, [countsQuery.data]);

  // Parse and aggregate doctor specialties into {specialty, count}[]
  const doctorSpecialtyBreakdown: SpecialtyBreakdownItem[] = useMemo(() => {
    const rows = doctorSpecialtyQuery.data || [];

    const specialtyCounts: Record<string, number> = {};
    rows.forEach(row => {
      try {
        const specialties = JSON.parse(row.doctor_specialty);
        if (Array.isArray(specialties)) {
          specialties.forEach((specialty: string) => {
            specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
          });
        }
      } catch {
        // If not valid JSON, treat as single specialty
        if (row.doctor_specialty) {
          specialtyCounts[row.doctor_specialty] = (specialtyCounts[row.doctor_specialty] || 0) + 1;
        }
      }
    });

    return Object.entries(specialtyCounts)
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);
  }, [doctorSpecialtyQuery.data]);

  // Parse and aggregate patient specialties into {specialty, count}[]
  const patientSpecialties: SpecialtyBreakdownItem[] = useMemo(() => {
    const rows = patientSpecialtyQuery.data;
    if (!rows) return apiPatientSpecialties;

    const patientSpecialtyCounts: Record<string, number> = {};
    rows.forEach(row => {
      try {
        const specialties = typeof row.specialties === 'string'
          ? JSON.parse(row.specialties)
          : row.specialties;
        if (Array.isArray(specialties)) {
          specialties.forEach((specialty: string) => {
            patientSpecialtyCounts[specialty] = (patientSpecialtyCounts[specialty] || 0) + 1;
          });
        }
      } catch {
        // If not valid JSON, treat as single specialty
        if (row.specialties && typeof row.specialties === 'string') {
          patientSpecialtyCounts[row.specialties] = (patientSpecialtyCounts[row.specialties] || 0) + 1;
        }
      }
    });

    return Object.entries(patientSpecialtyCounts)
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);
  }, [patientSpecialtyQuery.data, apiPatientSpecialties]);

  // Build final statistics object — PowerSync when available, API fallback otherwise
  const statistics: StatisticsData | null = useMemo(() => {
    if (powerSyncUserCounts) {
      return {
        userCounts: powerSyncUserCounts,
        specialtyBreakdown: doctorSpecialtyBreakdown,
        activityMetrics: apiActivityMetrics,
        lastUpdated: new Date().toISOString(),
      };
    }
    return apiStatistics;
  }, [powerSyncUserCounts, doctorSpecialtyBreakdown, apiActivityMetrics, apiStatistics]);

  // ─── API fallbacks ────────────────────────────────────────────────────────

  // If the reactive counts query fails, fall back to the pure API
  useEffect(() => {
    const watchError = countsQuery.error;
    if (!watchError) return;

    console.error('[Statistics] Error:', watchError);
    setError(watchError.message);

    let cancelled = false;
    (async () => {
      try {
        console.log('[Statistics] Attempting API fallback...');
        const data = await adminApi.getStatistics();
        if (cancelled) return;
        setApiStatistics(data);
        setError(null);
      } catch (apiErr) {
        console.error('[Statistics] API fallback also failed:', apiErr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countsQuery.error]);

  // If the reactive patient specialty query fails, fall back to the API
  useEffect(() => {
    const watchError = patientSpecialtyQuery.error;
    if (!watchError) return;

    console.warn('[Statistics] Could not fetch patient specialties from PowerSync:', watchError);

    let cancelled = false;
    (async () => {
      try {
        const patientApiData = await adminApi.getPatientSpecialtyBreakdown();
        if (cancelled) return;
        setApiPatientSpecialties(
          [...patientApiData.specialtyBreakdown].sort((a, b) => b.count - a.count),
        );
      } catch (apiError) {
        console.warn('[Statistics] API fallback for patient specialties also failed:', apiError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientSpecialtyQuery.error]);

  // Fetch API-backed data (activity metrics, or full statistics fallback when
  // PowerSync is not initialized). PowerSync reads are reactive and need no fetch.
  const fetchStatistics = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);

      if (!isInitialized) {
        console.warn('[Statistics] PowerSync not ready, falling back to API');
        const data = await adminApi.getStatistics();
        setApiStatistics(data);
        return;
      }

      // Try to get activity metrics from API (non-blocking)
      try {
        console.log('[Statistics] Fetching activity metrics from API...');
        const apiData = await adminApi.getStatistics();
        if (apiData?.activityMetrics) {
          setApiActivityMetrics(apiData.activityMetrics);
          console.log('[Statistics] Activity metrics from API:', apiData.activityMetrics);
        }
      } catch (apiError) {
        console.warn('[Statistics] Could not fetch activity metrics from API:', apiError);
        // Continue with default/zero values
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(errorMessage);
      console.error('[Statistics] Error:', err);
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  }, [isInitialized]);

  // Refresh statistics (pull-to-refresh)
  const refreshStatistics = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStatistics();
  }, [fetchStatistics]);

  // Export statistics data
  const exportData = useCallback(async () => {
    if (!statistics) {
      Alert.alert('No Data', 'No statistics data available to export.');
      return;
    }

    try {
      setIsExporting(true);

      // Format data for export
      const exportText = formatStatisticsForExport(statistics, patientSpecialties);

      // Share the data
      await Share.share({
        message: exportText,
        title: 'Statistics Export',
      });
    } catch (err) {
      console.error('Error exporting statistics:', err);
      Alert.alert('Export Failed', 'Failed to export statistics data.');
    } finally {
      setIsExporting(false);
    }
  }, [statistics, patientSpecialties]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed: User counts
  const userCounts = statistics?.userCounts || null;

  // Computed: Specialty breakdown (doctor specialties for backward compatibility)
  const specialtyBreakdown = statistics?.specialtyBreakdown || [];

  // Computed: Doctor specialties (same as specialtyBreakdown, sorted by count)
  const doctorSpecialties = [...specialtyBreakdown].sort((a, b) => b.count - a.count);

  // Computed: Activity metrics
  const activityMetrics = statistics?.activityMetrics || null;

  // Computed: Last updated
  const lastUpdated = statistics?.lastUpdated
    ? new Date(statistics.lastUpdated)
    : null;

  // Computed: Total users count
  const totalUsersCount = userCounts?.totalUsers || 0;

  // Computed: Top 5 specialties
  const topSpecialties = specialtyBreakdown
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Computed: Has data
  const hasData = statistics !== null;

  // Computed: Loading (API fetch or initial reactive query load)
  const isLoading =
    isFetching ||
    (isInitialized &&
      (countsQuery.isLoading || doctorSpecialtyQuery.isLoading || patientSpecialtyQuery.isLoading));

  // Fetch API-backed data on mount, and again once PowerSync initializes
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    // Data
    statistics,
    userCounts,
    specialtyBreakdown,
    activityMetrics,
    lastUpdated,

    // Specialty data for charts (matching web version)
    doctorSpecialties,
    patientSpecialties,

    // Loading states
    isLoading,
    isRefreshing,
    isExporting,

    // Error state
    error,

    // Date range
    dateRange,
    setDateRange,

    // Actions
    fetchStatistics,
    refreshStatistics,
    exportData,
    clearError,

    // Computed values
    totalUsersCount,
    topSpecialties,
    hasData,
  };
}

// Helper function to format statistics for export
function formatStatisticsForExport(
  statistics: StatisticsData,
  patientSpecialties: SpecialtyBreakdownItem[] = []
): string {
  const { userCounts, specialtyBreakdown, activityMetrics, lastUpdated } =
    statistics;

  let text = '=== Fajr Mission EMR STATISTICS ===\n\n';
  text += `Generated: ${new Date(lastUpdated).toLocaleString()}\n\n`;

  // User Counts Section
  text += '--- USER COUNTS ---\n';
  text += `Total Users: ${userCounts.totalUsers}\n`;
  text += `New Signups: ${userCounts.newSignups}\n`;
  text += `Existing Users: ${userCounts.existingUsers}\n`;
  text += `Denied Users: ${userCounts.deniedUsers}\n`;
  text += `Admin Users: ${userCounts.adminUsers}\n`;
  text += `Doctors: ${userCounts.doctorCount}\n`;
  text += `Triage Staff: ${userCounts.triageCount}\n\n`;

  // Doctor Specialty Breakdown Section
  text += '--- DOCTOR SPECIALTY BREAKDOWN ---\n';
  const sortedDoctorSpecialties = [...specialtyBreakdown]
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (sortedDoctorSpecialties.length > 0) {
    sortedDoctorSpecialties.forEach(item => {
      text += `${item.specialty}: ${item.count}\n`;
    });
  } else {
    text += 'No doctor specialty data available\n';
  }
  text += '\n';

  // Patient Specialty Breakdown Section
  text += '--- PATIENT SPECIALTY BREAKDOWN ---\n';
  const sortedPatientSpecialties = [...patientSpecialties]
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (sortedPatientSpecialties.length > 0) {
    sortedPatientSpecialties.forEach(item => {
      text += `${item.specialty}: ${item.count}\n`;
    });
  } else {
    text += 'No patient specialty data available\n';
  }
  text += '\n';

  // Activity Metrics Section
  text += '--- ACTIVITY METRICS ---\n';
  text += `Medical Orders: ${activityMetrics.medicalOrdersCount}\n`;
  text += `Notifications: ${activityMetrics.notificationsCount}\n`;
  text += `Last Week Signups: ${activityMetrics.lastWeekSignups}\n`;
  text += `Last Month Signups: ${activityMetrics.lastMonthSignups}\n\n`;

  text += '=== END OF REPORT ===\n';

  return text;
}
