// apps/mobile/src/screens/patient-dashboard/PatientDashboardScreenView.tsx
// View component for patient dashboard screen - handles UI rendering

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Search, X, AlertCircle, RotateCcw, SlidersHorizontal, CloudDownload, CloudUpload, Globe, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { MobilePatientDashboardTable } from '../../components/MobilePatientDashboardTable';
import { PatientMobileActions, type ActionSheet } from '../../components/PatientMobileActions';
import { TabletPatientTable } from '../../components/tablet/TabletPatientTable';
import { FilterSheet } from '../../components/dashboard-filters';
import { usePatientDashboardViewModel } from './usePatientDashboardViewModel';
import { useDeviceType } from '../../hooks/useDeviceType';
import {
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../utils/theme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { palette } from '../../utils/colors';
import type { PatientWithMessages } from '../../types/patient';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncStatus } from '../../hooks/powersync';
import { useChartAccess } from '../../hooks/useChartAccess';
import { RequestChartAccessSheet } from '../../components/patient-chart/RequestChartAccessSheet';
import { DashboardHelpSheet } from './DashboardHelpSheet';

export const PatientDashboardScreenView: React.FC = () => {
  const colors = useThemeColors();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { isTablet } = useDeviceType();
  const viewModel = usePatientDashboardViewModel();
  const { isConnecting, isDownloading, isUploading } = useSyncStatus({ pollInterval: 3000, enableDetailedLogging: false });
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithMessages | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [initialSheet, setInitialSheet] = useState<ActionSheet | null>(null);
  const [helpSheetVisible, setHelpSheetVisible] = useState(false);
  const [blockedAccess, setBlockedAccess] = useState<{
    patient: PatientWithMessages;
    message: string | null;
  } | null>(null);
  const checkChartAccess = useChartAccess();

  const isSyncing = isDownloading || isUploading;

  const {
    patients,
    filteredPatients,
    isLoading,
    error,
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
  } = viewModel;

  // Opening a chart is gated by specialty and care-team membership — the same
  // shared rule the web app uses. Mobile previously had no check at all.
  const openChart = (patient: PatientWithMessages, initialTab?: string) => {
    setActivePatientId(patient.id);
    // @ts-ignore - navigation types
    navigation.navigate('PatientChart', {
      patientId: patient.id,
      ...(initialTab ? { initialTab } : {}),
    });
    setTimeout(() => setActivePatientId(null), 1000);
  };

  const guardChart = (patient: PatientWithMessages, initialTab?: string) => {
    const access = checkChartAccess(patient);
    if (!access.allowed) {
      setBlockedAccess({ patient, message: access.message });
      return;
    }
    openChart(patient, initialTab);
  };

  const handlePatientPress = async (patient: PatientWithMessages) => {
    guardChart(patient);
  };

  // Tablet cell tap handler — name navigates to chart, action columns open sheets
  const handleCellPress = (patient: PatientWithMessages, columnKey: string) => {
    const sheetMap: Record<string, ActionSheet> = {
      status: 'status',
      hospital_name: 'status', // hospital is inside the status sheet
      priority: 'priority',
      specialty: 'specialty',
      triage_note: 'notes',
    };
    const sheet = sheetMap[columnKey];
    if (sheet) {
      setSelectedPatient(patient);
      setInitialSheet(sheet);
      setShowActions(true);
    } else {
      // name + all other columns navigate to chart
      handlePatientPress(patient);
    }
  };

  const handleOpenChat = (patient: PatientWithMessages) => {
    if (!patient.telegramChatId) return;
    // Deep-links straight into the chart, so it needs the same gate.
    guardChart(patient, 'messaging');
  };

  const handleSearchChange = (text: string) => {
    updateFilters({ search: text });
  };

  const getPageTitle = () => {
    if (filters.showFollowUps) return 'Patient Follow-Ups';
    if (filters.showUnassignedSpecialty) return 'Unassigned Specialty';
    if (filters.viewMode === 'discharged') return 'Discharged Patients';
    if (filters.viewMode === 'all') return 'All Patients';
    return 'Patient Dashboard';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{getPageTitle()}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {user?.accountType || 'Medical'} Portal
              </Text>
            </View>
            <View style={styles.headerButtons}>
              {/* Filter button with badge */}
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterSheetVisible(true)}
              >
                <SlidersHorizontal size={20} color={palette.orange[700]} />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={[styles.filterBadgeText, { color: colors.textInverse }]}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* How this dashboard works */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => setHelpSheetVisible(true)}
                accessibilityLabel="How this dashboard works"
              >
                <Info size={20} color={palette.orange[700]} />
              </TouchableOpacity>
              {/* Refresh button */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshPatients}
                disabled={isLoading}
              >
                <RotateCcw
                  size={20}
                  color={
                    isLoading
                      ? colors.textTertiary
                      : palette.orange[700]
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statNumber}>{filteredPatients.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {filteredPatients.length !== patients.length
                  ? `of ${patients.length}`
                  : 'Patients'}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statNumber}>
                {
                  filteredPatients.filter(
                    p => p.status === 'Peri-Op / In Surgery',
                  ).length
                }
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Surgery</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statNumber}>
                {
                  filteredPatients.filter(
                    p => p.priority === 'Urgent' || p.priority === 'Emergency',
                  ).length
                }
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Urgent</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Search size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search patients..."
              placeholderTextColor={colors.textTertiary}
              value={filters.search}
              onChangeText={handleSearchChange}
            />
            {filters.search.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                style={styles.searchClear}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sync Banner */}
        {(isSyncing || isConnecting) && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color={palette.orange[700]} />
            {isDownloading ? (
              <><CloudDownload size={14} color={palette.orange[700]} /><Text style={styles.syncBannerText}>Downloading data...</Text></>
            ) : isUploading ? (
              <><CloudUpload size={14} color={palette.orange[700]} /><Text style={styles.syncBannerText}>Uploading changes...</Text></>
            ) : (
              <Text style={styles.syncBannerText}>Connecting...</Text>
            )}
          </View>
        )}

        {/* Content */}
        {error ? (
          <View style={styles.errorContainer}>
            <AlertCircle
              size={48}
              color={colors.error}
              style={styles.errorIcon}
            />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshPatients}
            >
              <View style={styles.retryButtonContent}>
                <RotateCcw size={16} color={colors.textInverse} />
                <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : !isLoading && patients.length === 0 ? (
          // Truly no patients synced — guide toward mission enrollment.
          // Filtered-to-zero keeps the tables' own "check your filters" empty states.
          <View style={styles.emptyMissionContainer}>
            <View style={[styles.emptyMissionIcon, { backgroundColor: colors.primary + '12' }]}>
              <Globe size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyMissionTitle, { color: colors.text }]}>
              No patients in your dashboard
            </Text>
            <Text style={[styles.emptyMissionText, { color: colors.textSecondary }]}>
              Join a mission with active patients, or confirm with your admin
              that your mission has active patients in it.
            </Text>
            <TouchableOpacity
              style={[styles.emptyMissionButton, { backgroundColor: colors.primary }]}
              onPress={() => (navigation as any).navigate('Profile')}
            >
              <Globe size={16} color={colors.textInverse} />
              <Text style={[styles.emptyMissionButtonText, { color: colors.textInverse }]}>
                View Missions in Profile
              </Text>
            </TouchableOpacity>
          </View>
        ) : isTablet ? (
          <TabletPatientTable
            data={filteredPatients}
            onCellPress={handleCellPress}
            activePatientId={activePatientId}
            isLoading={isLoading}
          />
        ) : (
          <MobilePatientDashboardTable
            data={filteredPatients}
            onRowClick={handlePatientPress}
            activePatientId={activePatientId}
            isLoading={isLoading}
            renderActions={patient => (
              <PatientMobileActions
                patient={patient}
                onStatusChange={updatePatientStatus}
                onHospitalChange={updatePatientHospital}
                onPriorityChange={updatePatientPriority}
                onNotesChange={updatePatientNotes}
                onOpenPatient={handlePatientPress}
                onOpenChat={handleOpenChat}
                onTakeCase={(patientId, role) =>
                  takeCaseOffline(patientId, role)
                }
              />
            )}
          />
        )}

        {/* Tablet actions — no visible wrapper needed; BottomSheet modals are portaled */}
        {isTablet && showActions && selectedPatient && (
          <PatientMobileActions
            patient={selectedPatient}
            initialSheet={initialSheet}
            hideButtons
            onSheetClose={() => { setShowActions(false); setInitialSheet(null); }}
            onStatusChange={async (id, status) => {
              await updatePatientStatus(id, status);
              setShowActions(false); setInitialSheet(null);
            }}
            onHospitalChange={async (id, hospital) => {
              await updatePatientHospital(id, hospital);
              setShowActions(false); setInitialSheet(null);
            }}
            onPriorityChange={async (id, priority) => {
              await updatePatientPriority(id, priority);
              setShowActions(false); setInitialSheet(null);
            }}
            onNotesChange={async (id, notes) => {
              await updatePatientNotes(id, notes);
              setShowActions(false); setInitialSheet(null);
            }}
            onOpenPatient={(patient) => {
              setShowActions(false); setInitialSheet(null);
              handlePatientPress(patient);
            }}
            onOpenChat={(patient) => {
              setShowActions(false); setInitialSheet(null);
              handleOpenChat(patient);
            }}
            onTakeCase={async (patientId, role) => {
              await takeCaseOffline(patientId, role);
              setShowActions(false); setInitialSheet(null);
            }}
          />
        )}

        {/* Filter Sheet */}
        <FilterSheet
          visible={filterSheetVisible}
          onClose={() => setFilterSheetVisible(false)}
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          accountType={user?.accountType}
          missions={missions}
          availableHospitals={availableHospitals}
          allPatients={patients}
          conflictCount={conflictCount}
        />

        <DashboardHelpSheet
          visible={helpSheetVisible}
          onClose={() => setHelpSheetVisible(false)}
          accountType={user?.accountType}
          view={
            filters.showFollowUps
              ? 'follow-ups'
              : filters.showUnassignedSpecialty
                ? 'unassigned-specialty'
                : 'dashboard'
          }
        />

        {/* Chart access gate. Stays mounted and toggles `visible` — see the
            BottomSheet note in patient-chart/CLAUDE.md. */}
        <RequestChartAccessSheet
          visible={!!blockedAccess}
          onClose={() => setBlockedAccess(null)}
          patientId={blockedAccess?.patient.id || ''}
          message={blockedAccess?.message}
          onGranted={() => {
            // Read the patient before clearing — this closure captured
            // blockedAccess from the render that opened the sheet.
            const patient = blockedAccess?.patient;
            setBlockedAccess(null);
            if (patient) openChart(patient);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: palette.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.easternBlue[600],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: palette.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    ...shadows.sm,
  },
  statNumber: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: palette.easternBlue[600],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.fontSize.base,
  },
  searchClear: {
    padding: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.massive,
  },
  errorIcon: {
    marginBottom: spacing.base,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryButton: {
    backgroundColor: palette.easternBlue[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  retryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyMissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.massive,
  },
  emptyMissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  emptyMissionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyMissionText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyMissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  emptyMissionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: palette.orange[50],
    borderBottomWidth: 1,
    borderBottomColor: palette.orange[200],
  },
  syncBannerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: palette.orange[700],
  },
});

export default PatientDashboardScreenView;
