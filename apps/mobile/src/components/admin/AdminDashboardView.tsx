// apps/mobile/src/components/admin/AdminDashboardView.tsx
// Main Admin Dashboard View for mobile app

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView, // Add ScrollView back for help modal
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Users,
  UserCheck,
  UserX,
  BriefcaseMedical,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Bell,
  Trash2,
  BotMessageSquare,
  UserPlus,
  Image as ImageIcon,
  Images,
  BarChart2,
  ChartNoAxesColumn,
  Database,
  Languages,
  MessageSquare,
  MapPin,
  HardDriveDownload,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { AdminAccordionItem, AdminDashboardHeader } from './index';
import { NewSignupsView } from './sections/newSignups';
import { ExistingUsersView } from './sections/existingUsers';
import { AdminManagementView } from './sections/adminManagement';
import { DeniedUsersView } from './sections/deniedUsers';
import { StatisticsView } from './sections/statistics';
import { ImageStorageView } from './sections/imageStorage';
import { PatientMediaView } from './sections/patientMedia';
import { CreateUserView } from './sections/createUser';
import { PasswordResetView } from './sections/passwordReset';
import { NotificationsView } from './sections/notifications';
import { MedOrdersView } from './sections/medicalOrders';
import { AnalyticsView } from './sections/analytics';
import { PatientIntakeView } from './sections/patientIntake';
import { ClearTestDataView } from './sections/clearTestData';
import { ProfileUpdateRequestsView } from './sections/profileUpdateRequests';
import { TranslationServiceView } from './sections/translationService';
import { PowerSyncServiceView } from './sections/powerSyncService';
import { UserFeedbackView } from './sections/userFeedback';
import { MissionsView } from './sections/missions';
import { BackupView } from './sections/backup';
import { VerifyAuthMigrationView } from './sections/verifyAuthMigration';
import { checkAdminApiHealth } from '../../utils/admin/apiDebug';

// Section configurations
interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
  component?: React.ComponentType<any>;
}

const ADMIN_SECTIONS: SectionConfig[] = [
  {
    id: 'createUser',
    title: 'Create New User',
    subtitle: 'Create Doctor or Triage User',
    icon: UserPlus,
  },
  {
    id: 'newSignups',
    title: 'New Signups',
    subtitle: 'Pending user approvals',
    icon: Users,
    badge: 0, // Will be dynamic
  },
  {
    id: 'existing',
    title: 'Existing Users',
    subtitle: 'Doctors and Triage',
    icon: UserCheck,
  },
  {
    id: 'denied',
    title: 'Denied Users',
    subtitle: 'Rejected signups',
    icon: UserX,
  },
  {
    id: 'profileUpdateRequests',
    title: 'Profile Update Requests',
    subtitle: 'Review profile change requests',
    icon: ShieldAlert,
  },
  {
    id: 'addAdmin',
    title: 'Admin Management',
    subtitle: 'Manage admin users',
    icon: ShieldCheck,
  },
  {
    id: 'pwReset',
    title: 'Password Reset',
    subtitle: 'Reset user passwords',
    icon: RotateCcw,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Send notifications to users',
    icon: Bell,
  },
  {
    id: 'missions',
    title: 'Missions Management',
    subtitle: 'Create and manage medical missions',
    icon: MapPin,
  },
  {
    id: 'medOrder',
    title: 'Medical Orders',
    subtitle: 'View and manage orders',
    icon: BriefcaseMedical,
  },
  {
    id: 'statistics',
    title: 'Statistics',
    subtitle: 'User and system statistics',
    icon: ChartNoAxesColumn,
  },
  {
    id: 'clearTestData',
    title: 'Clear Test Data',
    subtitle: 'Remove test data (dev only)',
    icon: Trash2,
  },
  {
    id: 'patientIntake',
    title: 'Telegram Bot Settings',
    subtitle: 'Patient intake configuration',
    icon: BotMessageSquare,
  },
  {
    id: 'imageStorage',
    title: 'Media Storage',
    subtitle: 'Browse stored media',
    icon: ImageIcon,
  },
  {
    id: 'patientMedia',
    title: 'Patient Media',
    subtitle: "Browse all patients' photos and documents",
    icon: Images,
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    subtitle: 'System analytics and metrics',
    icon: BarChart2,
  },
  {
    id: 'translationService',
    title: 'Translation Service',
    subtitle: 'Translation health and testing',
    icon: Languages,
  },
  {
    id: 'userFeedback',
    title: 'User Feedback',
    subtitle: 'Review user feedback and bug reports',
    icon: MessageSquare,
  },
  {
    id: 'powerSyncService',
    title: 'PowerSync Service',
    subtitle: 'Offline sync functionality',
    icon: Database,
  },
  {
    id: 'databaseBackup',
    title: 'Database Backups',
    subtitle: 'Create and manage backups',
    icon: HardDriveDownload,
  },
  {
    id: 'verifyAuthMigration',
    title: 'Verify Auth Migration',
    subtitle: 'Test passkeys, 2FA & Zitadel after a move',
    icon: ShieldCheck,
  },
];

interface AdminDashboardViewProps {
  initialOpenSection?: string | null;
}

export default function AdminDashboardView({
  initialOpenSection = null,
}: AdminDashboardViewProps) {
  const colors = useThemeColors();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(
    initialOpenSection,
  );
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [sectionLoadingStates, _setSectionLoadingStates] = useState<
    Record<string, boolean>
  >({});

  // Debounced search with 300ms delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter sections based on debounced search term
  const filteredSections = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return ADMIN_SECTIONS;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    return ADMIN_SECTIONS.filter(
      section =>
        section.title.toLowerCase().includes(searchLower) ||
        section.subtitle?.toLowerCase().includes(searchLower),
    );
  }, [debouncedSearchTerm]); // Use debounced term

  // Memoized callbacks
  const handleSectionToggle = useCallback((sectionId: string) => {
    setOpenSection(prev => (prev === sectionId ? null : sectionId));
  }, []);

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchTerm(text);
  }, []);

  const toggleHelpModal = useCallback(() => {
    setShowHelpModal(prev => !prev);
  }, []);

  // Check API health on mount
  React.useEffect(() => {
    const checkApi = async () => {
      const health = await checkAdminApiHealth();

      if (!health.isAccessible || !health.hasAuth) {
        Alert.alert(
          'API Connection Issue',
          health.error || 'Unable to connect to admin API',
          [
            {
              text: 'OK',
              onPress: () => console.log('API health check failed:', health),
            },
          ],
        );
      } else {
        console.log('[AdminDashboard] API health check passed');
      }
    };

    checkApi();
  }, []);

  // Render section content
  const renderSectionContent = useCallback(
    (section: SectionConfig) => {
      const isLoading = sectionLoadingStates[section.id];

      if (isLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading {section.title}...
            </Text>
          </View>
        );
      }

      // Render actual section components
      switch (section.id) {
        case 'createUser':
          return <CreateUserView />;

        case 'newSignups':
          return <NewSignupsView />;

        case 'existing':
          return <ExistingUsersView />;

        case 'denied':
          return <DeniedUsersView />;

        case 'profileUpdateRequests':
          return <ProfileUpdateRequestsView />;

        case 'addAdmin':
          return <AdminManagementView />;

        case 'pwReset':
          return <PasswordResetView />;

        case 'notifications':
          return <NotificationsView />;

        case 'missions':
          return <MissionsView />;

        case 'medOrder':
          return <MedOrdersView />;

        case 'statistics':
          return <StatisticsView />;

        case 'analytics':
          return <AnalyticsView />;

        case 'patientIntake':
          return <PatientIntakeView />;

        case 'imageStorage':
          return <ImageStorageView />;

        case 'patientMedia':
          return <PatientMediaView />;

        case 'clearTestData':
          return <ClearTestDataView />;

        case 'translationService':
          return <TranslationServiceView />;

        case 'userFeedback':
          return <UserFeedbackView />;

        case 'powerSyncService':
          return <PowerSyncServiceView />;

        case 'databaseBackup':
          return <BackupView />;

        case 'verifyAuthMigration':
          return <VerifyAuthMigrationView />;

        default:
          // Placeholder content for not-yet-implemented sections
          return (
            <View style={styles.placeholderContent}>
              <Text
                style={[
                  styles.placeholderText,
                  { color: colors.textSecondary },
                ]}
              >
                {section.title} component will be implemented here.
              </Text>
              <Text
                style={[
                  styles.placeholderSubtext,
                  { color: colors.textSecondary },
                ]}
              >
                Section ID: {section.id}
              </Text>
            </View>
          );
      }
    },
    [sectionLoadingStates, colors],
  );

  // Render item for FlatList
  const renderSectionItem = useCallback(
    ({ item: section }: { item: SectionConfig }) => (
      <AdminAccordionItem
        key={section.id}
        id={section.id}
        title={section.title}
        subtitle={section.subtitle}
        icon={section.icon}
        badge={section.badge}
        disabled={section.disabled}
        loading={sectionLoadingStates[section.id]}
        searchTerm={debouncedSearchTerm}
        isOpen={openSection === section.id}
        onToggle={() => handleSectionToggle(section.id)}
      >
        {renderSectionContent(section)}
      </AdminAccordionItem>
    ),
    [
      openSection,
      sectionLoadingStates,
      debouncedSearchTerm,
      handleSectionToggle,
      renderSectionContent,
    ],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: SectionConfig) => item.id, []);

  // List empty component
  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          No sections match your search.
        </Text>
        <Text
          style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}
        >
          Try searching for something else.
        </Text>
      </View>
    ),
    [colors],
  );

  // Render help modal
  const renderHelpModal = () => (
    <Modal
      visible={showHelpModal}
      transparent
      animationType="fade"
      onRequestClose={toggleHelpModal}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Admin Dashboard Help
            </Text>
            <TouchableOpacity
              onPress={toggleHelpModal}
              style={styles.closeButton}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalBody}>
            <Text style={[styles.helpText, { color: colors.text }]}>
              Welcome to the Admin Dashboard!
            </Text>

            <Text style={[styles.helpSectionTitle, { color: colors.text }]}>
              Getting Started
            </Text>
            <Text
              style={[styles.helpParagraph, { color: colors.textSecondary }]}
            >
              This dashboard allows you to manage various aspects of the Fajr
              MedFlow EMR system. Tap on any section below to expand it and
              access its features.
            </Text>

            <Text style={[styles.helpSectionTitle, { color: colors.text }]}>
              Search
            </Text>
            <Text
              style={[styles.helpParagraph, { color: colors.textSecondary }]}
            >
              Use the search bar at the top to quickly find specific sections.
              The search filters both section titles and descriptions.
            </Text>

            <Text style={[styles.helpSectionTitle, { color: colors.text }]}>
              Refresh
            </Text>
            <Text
              style={[styles.helpParagraph, { color: colors.textSecondary }]}
            >
              Tap the refresh button to reload data across all sections. You can
              also pull down on the screen to refresh.
            </Text>

            <Text style={[styles.helpSectionTitle, { color: colors.text }]}>
              Sections
            </Text>
            <Text
              style={[styles.helpParagraph, { color: colors.textSecondary }]}
            >
              • Create New User - Create doctor, triage, or evac accounts{'\n'}•
              New Signups - Review and approve pending user registrations{'\n'}•
              Existing Users - View and manage active users{'\n'}• Denied Users
              - Manage rejected signups{'\n'}• Admin Management - Add or remove
              admin privileges{'\n'}• Password Reset - Reset user passwords
              {'\n'}• Notifications - Send system notifications{'\n'}• Medical
              Orders - View medical order history{'\n'}• Statistics - View
              system statistics{'\n'}• Analytics - Access detailed analytics
              {'\n'}• Telegram Bot - Configure patient intake bot{'\n'}• Image
              Storage - Manage stored images{'\n'}• Clear Test Data - Remove
              test data (development only)
            </Text>

            <Text style={[styles.helpSectionTitle, { color: colors.text }]}>
              Need More Help?
            </Text>
            <Text
              style={[styles.helpParagraph, { color: colors.textSecondary }]}
            >
              Contact the development team for additional support or to report
              issues.
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={toggleHelpModal}
            >
              <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <AdminDashboardHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefreshAll}
        onHelp={toggleHelpModal}
        isRefreshing={isRefreshing}
      />

      <FlatList
        data={filteredSections}
        renderItem={renderSectionItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      {/* Help Modal */}
      {renderHelpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  placeholderContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    // backgroundColor set inline via colors.overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    // borderBottomColor set inline via colors.border
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.base,
  },
  helpText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  helpSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  helpParagraph: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  modalFooter: {
    padding: spacing.base,
    borderTopWidth: 1,
    // borderTopColor set inline via colors.border
  },
  modalButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
