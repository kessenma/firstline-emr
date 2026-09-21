// apps/mobile/src/components/patient-chart/PatientChartView.tsx
// Main view component for patient chart with tabbed or dashboard interface

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  FileText,
  Pill,
  Image,
  MessageSquare,
  Video,
  ChevronLeft,
  AlertTriangle,
  Users,
} from 'lucide-react-native';
import { roleColors } from '@fajr/shared/theme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePatientChart } from './PatientChartContext';
import { NotesView } from './notes/NotesView';
import { TelegramMessagingContainer } from './messaging';
import { MediaGalleryView } from './media-gallery';
import { PatientInfoView } from './patient-info/PatientInfoView';
import { PatientChartDashboardView } from './PatientChartDashboardView';
import { CareTeamSheet } from './CareTeamSheet';
import { SendPatientSheet } from './SendPatientSheet';
import { PatientChartBottomBar } from './PatientChartBottomBar';
import { MedicationsView } from './medications';
import {
  VideoCallContainer,
  VideoCallSessionProvider,
  VideoCallSheet,
} from './video-call';
import { TranscriptionJobStatus } from './video-call/components/TranscriptionJobStatus';
import { Skeleton } from '../ui/Skeleton';
import { usePatientChartViewPreference } from '../../hooks/usePatientChartViewPreference';

/** Skeleton mirroring the SectionSummaryCard layout (icon circle + title line + preview line). */
const DashboardCardSkeleton: React.FC<{ colors: ReturnType<typeof useThemeColors> }> = ({ colors }) => (
  <View style={[skeletonStyles.dashboardCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <View style={skeletonStyles.dashboardCardHeader}>
      <Skeleton width={36} height={36} borderRadius={8} />
      <Skeleton width={100} height={16} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
    <View style={{ marginTop: 8, paddingLeft: 44 }}>
      <Skeleton width="80%" height={13} borderRadius={4} />
    </View>
  </View>
);

const PatientChartSkeleton: React.FC<{ mode: 'tabs' | 'dashboard' }> = ({ mode }) => {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header skeleton — shared across both modes */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerButton}>
          <Skeleton width={24} height={24} borderRadius={4} />
        </View>
        <View style={styles.headerCenter}>
          <Skeleton width={160} height={18} borderRadius={4} />
          <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.headerButton} />
      </View>

      {mode === 'dashboard' ? (
        /* Dashboard mode: stacked summary cards */
        <View style={skeletonStyles.contentArea}>
          <DashboardCardSkeleton colors={colors} />
          <DashboardCardSkeleton colors={colors} />
          <DashboardCardSkeleton colors={colors} />
          <DashboardCardSkeleton colors={colors} />
          <DashboardCardSkeleton colors={colors} />
        </View>
      ) : (
        <>
          {/* Tabs mode: tab bar + content */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={skeletonStyles.tabRow}>
              {[80, 72, 64, 80, 90, 72].map((w, i) => (
                <Skeleton key={i} width={w} height={32} borderRadius={6} style={{ marginHorizontal: 4 }} />
              ))}
            </View>
          </View>
          <View style={skeletonStyles.contentArea}>
            <View style={[skeletonStyles.card, { backgroundColor: colors.surface }]}>
              <Skeleton width="60%" height={16} borderRadius={4} />
              <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
              <Skeleton width="75%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
            <View style={[skeletonStyles.card, { backgroundColor: colors.surface }]}>
              <Skeleton width="40%" height={16} borderRadius={4} />
              <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
              <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
            <View style={[skeletonStyles.card, { backgroundColor: colors.surface }]}>
              <Skeleton width="50%" height={16} borderRadius={4} />
              <Skeleton width="95%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
              <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

interface PatientChartViewProps {
  onBack: () => void;
  onGoToChatAfterSend?: (threadId: string) => void;
  showHeaderActions?: boolean;
}

export const PatientChartView: React.FC<PatientChartViewProps> = ({
  onBack,
  onGoToChatAfterSend,
  showHeaderActions = true,
}) => {
  const colors = useThemeColors();
  const { user } = useAuth();
  const activeColor = user?.accountType === 'Triage'
    ? roleColors.triage.primary
    : roleColors.doctor.primary;
  const { chartView, setChartView } = usePatientChartViewPreference();
  const {
    patientInfo,
    loadingPatientInfo,
    patientError,
    activeTab,
    setActiveTab,
    fetchPatientData,
    careTeam,
    isCurrentUserLead,
    hasCareTeamConflict,
    refreshMedia,
  } = usePatientChart();

  const insets = useSafeAreaInsets();
  // Reserve space for the absolute-positioned bottom bar so content isn't obscured
  const bottomBarHeight = showHeaderActions
    ? 4 + 2 + 36 + Math.max(insets.bottom, 12)
    : 0;

  const [refreshing, setRefreshing] = React.useState(false);
  const [showCareTeamSheet, setShowCareTeamSheet] = React.useState(false);
  const [showSendSheet, setShowSendSheet] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPatientData();
    setRefreshing(false);
  };

  const tabs = [
    { id: 'patient-info', label: 'Info', icon: User },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'medications', label: 'Meds', icon: Pill },
    { id: 'images', label: 'Media', icon: Image },
    { id: 'messaging', label: 'Messages', icon: MessageSquare },
    { id: 'video', label: 'Video', icon: Video },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'patient-info':
        return <PatientInfoView />;

      case 'notes':
        return <NotesView />;

      case 'medications':
        return <MedicationsView />;

      case 'images':
        return <MediaGalleryView />;

      case 'messaging':
        return <TelegramMessagingContainer />;

      case 'video':
        return <VideoCallContainer />;

      default:
        return null;
    }
  };

  if (loadingPatientInfo && !patientInfo) {
    return <PatientChartSkeleton mode={chartView} />;
  }

  if (patientError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{patientError}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={handleRefresh}>
            <Text style={[styles.retryButtonText, { color: colors.surface }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // Owns the LiveKit Room for the whole chart. Mounted here — above every
    // sheet — so minimizing the call, or opening another section, can't tear it
    // down. Call is chart-scoped: leaving unmounts this and ends the call.
    <VideoCallSessionProvider
      patientId={patientInfo?.id || ''}
      patientName={patientInfo?.patientName || 'Patient'}
      // Needed to write the call-transcript note: notes denormalize the
      // patient's email, and the provider stays free of chart imports.
      patientEmail={patientInfo?.email}
      patientLanguage={patientInfo?.language}
      // Pull the chart's media query forward rather than pushing an optimistic
      // entry: the context's local-photo list *replaces* the synced one when
      // non-empty, so appending here would hide every other chart photo. The
      // in-call filmstrip already gives the clinician immediate feedback, so
      // all this needs to do is stop the Media tab lagging by up to 30s.
      onPhotosChanged={() => void refreshMedia()}
    >
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {patientInfo?.patientName || 'Patient Chart'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            ID: {patientInfo?.patientID || 'Loading...'}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Transcription progress for this patient. Uses the same banner slot as
          the care-team notice — above the tab bar, below the header — so it
          shows in both chart modes without touching either layout. */}
      {patientInfo?.id && (
        <View style={styles.transcriptionBanner}>
          <TranscriptionJobStatus patientId={patientInfo.id} />
        </View>
      )}

      {/* Care Team Conflict Banner */}
      {hasCareTeamConflict && (
        <View style={[styles.conflictBanner, { backgroundColor: colors.warning + '20', borderBottomColor: colors.warning }]}>
          <AlertTriangle size={18} color={colors.warningDark} />
          <View style={styles.conflictBannerText}>
            <Text style={[styles.conflictBannerTitle, { color: colors.warningDark }]}>
              Multiple doctors claimed lead for this patient
            </Text>
            <Text style={[styles.conflictBannerSub, { color: colors.warningDark }]}>
              An admin will resolve this conflict.
              {isCurrentUserLead ? ' You can yield lead below.' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Care Team Summary */}
      {careTeam.length > 0 && (
        <View style={[styles.careTeamBar, { backgroundColor: colors.primary + '15', borderBottomColor: colors.primary + '30' }]}>
          <Users size={16} color={colors.primary} />
          <Text style={[styles.careTeamBarText, { color: colors.primary }]}>
            {careTeam.length} team member{careTeam.length !== 1 ? 's' : ''}
          </Text>
          {careTeam.filter(m => m.isLead).map(m => (
            <View key={m.id} style={[styles.careTeamLeadBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.careTeamLeadText, { color: colors.surface }]}>
                Lead: {m.userName || m.userEmail || 'Unknown'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* View Content: Dashboard or Tabs */}
      {chartView === 'dashboard' ? (
        <PatientChartDashboardView contentInsetBottom={bottomBarHeight} />
      ) : (
        <>
          {/* Tab Navigation */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarContent}
            >
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tab,
                      isActive && {
                        borderBottomColor: activeColor,
                        borderBottomWidth: 3,
                      },
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Icon size={20} color={isActive ? activeColor : colors.textTertiary} />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: colors.textTertiary },
                        isActive && { color: activeColor, fontWeight: '600' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Tab Content */}
          {activeTab === 'messaging' || activeTab === 'notes' || activeTab === 'images' || activeTab === 'patient-info' || activeTab === 'medications' ? (
            <View style={[styles.content, { paddingBottom: bottomBarHeight }]}>{renderTabContent()}</View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomBarHeight }]}
            >
              {renderTabContent()}
            </ScrollView>
          )}
        </>
      )}

      <SendPatientSheet
        visible={showSendSheet}
        onClose={() => setShowSendSheet(false)}
        patient={patientInfo ? {
          id: patientInfo.id,
          patientName: patientInfo.patientName,
          firstName: patientInfo.firstName,
          lastName: patientInfo.lastName,
          status: patientInfo.status,
          priority: patientInfo.priority,
          hospital: patientInfo.hospital,
          chiefComplaint: patientInfo.chiefComplaint,
          diagnosis: patientInfo.diagnosis,
          // Scopes the "Doctors" recipient tab to this patient's mission.
          missionId: patientInfo.missionId,
        } : null}
        onGoToChatAfterSend={onGoToChatAfterSend}
        onFallbackBack={onBack}
      />

      <CareTeamSheet
        visible={showCareTeamSheet}
        onClose={() => setShowCareTeamSheet(false)}
        patientId={patientInfo?.id || ''}
      />

      {showHeaderActions && (
        <PatientChartBottomBar
          chartView={chartView}
          onToggleView={() => void setChartView(chartView === 'tabs' ? 'dashboard' : 'tabs')}
          onCareTeamPress={() => setShowCareTeamSheet(true)}
          careTeamCount={careTeam.length}
          hasCareTeamConflict={hasCareTeamConflict}
          onSendPress={() => setShowSendSheet(true)}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
          disabled={!patientInfo?.id}
          onBack={onBack}
        />
      )}

      {/* Live call, in its own sheet so opening another section can't unmount
          it. Minimizes to the header pill with a live thumbnail. */}
      <VideoCallSheet />
    </SafeAreaView>
    </VideoCallSessionProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  tabContent: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  transcriptionBanner: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  conflictBannerText: {
    flex: 1,
  },
  conflictBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  conflictBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  careTeamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  careTeamBarText: {
    fontSize: 13,
    fontWeight: '500',
  },
  careTeamLeadBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  careTeamLeadText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

const skeletonStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  contentArea: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dashboardCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
