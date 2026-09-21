import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  Activity,
  Bell,
  ClipboardList,
  MessageSquare,
  Plus,
  Settings,
  UserCog,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { RoleIcon } from '../components/ui/RoleIcon';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceType } from '../hooks/useDeviceType';
import { DataSettingsOnboardingSheet } from '../components/DataSettingsOnboardingSheet';
import { hasCompletedDataOnboarding } from '../utils/dataOnboarding';

interface HomeScreenProps {
  onLogout?: () => void;
}

interface QuickAction {
  icon: any;
  title: string;
  /** Not rendered — read by screen readers as the tile's hint */
  description: string;
  screen: string;
  /** Nested navigator params, e.g. `{ screen: 'AdminDashboard' }` for the Admin tab */
  params?: Record<string, unknown>;
  color: string;
}

export default function HomeScreen({ onLogout: _onLogout }: HomeScreenProps) {
  const navigation = useNavigation();
  const { user, startDataSync } = useAuth();
  const { isTablet } = useDeviceType();
  const [showDataOnboarding, setShowDataOnboarding] = useState(false);

  // Show data settings onboarding once after first login
  useEffect(() => {
    if (user && !hasCompletedDataOnboarding()) {
      // Delay slightly so the home screen renders first
      const timer = setTimeout(() => setShowDataOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const colors = useThemeColors();

  // Early return if no user (shouldn't happen but good for safety)
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Quick actions based on user role (matching web app)
  const quickActions = ((): QuickAction[] => {
    const common: QuickAction[] = [
      {
        icon: MessageSquare,
        title: 'Messages',
        description: 'Check your messages and communicate with team',
        screen: 'Messages',
        color: colors.primary,
      },
      {
        icon: Bell,
        title: 'Notifications',
        description: 'View your recent notifications',
        screen: 'Notifications',
        color: colors.accent,
      },
      {
        icon: Settings,
        title: 'Settings',
        description: 'Manage your account settings',
        screen: 'Profile',
        color: colors.secondary,
      },
    ];

    const roleSpecific: QuickAction[] = [];

    if (user.accountType === 'Doctor' || user.accountType === 'Triage') {
      roleSpecific.push({
        icon: ClipboardList,
        title: 'Patient Dashboard',
        description: 'View and manage patient cases',
        screen: 'Dashboard',
        color: colors.primary,
      });
    }

    if (user.isAdmin) {
      roleSpecific.push({
        icon: UserCog,
        title: 'Admin Dashboard',
        description: 'Manage users and system settings',
        screen: 'Admin',
        params: { screen: 'AdminDashboard' },
        color: colors.secondary,
      });
    }

    return [...roleSpecific, ...common];
  })();

  // Percentage widths keep the grid correct regardless of the container's real
  // width — tablets render the tab bar on the left, so window width would lie.
  const cellWidth = isTablet ? '33.333%' : '50%';

  const handleActionPress = (action: QuickAction) => {
    // @ts-ignore - navigation types
    navigation.navigate(action.screen, action.params);
  };

  const getRoleMessage = () => {
    switch (user.accountType) {
      case 'Doctor':
        return 'Ready to care for your patients';
      case 'Triage':
        return 'Ready to manage incoming cases';
      default:
        return 'Ready to get started';
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Activity size={32} color={colors.primary} />
            <View style={styles.headerText}>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                Welcome back, {user.firstName}!
              </Text>
              <Text
                style={[
                  styles.welcomeSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {getRoleMessage()}
              </Text>
            </View>
          </View>
        </View>

        {/* Account meta — compact chips instead of a stacked info card */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.chip,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <RoleIcon accountType={user.accountType} size={14} />
            <Text style={[styles.chipText, { color: colors.text }]}>
              {user.accountType}
            </Text>
          </View>

          {user.isAdmin && (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <UserCog size={14} color={colors.secondary} />
              <Text style={[styles.chipText, { color: colors.text }]}>
                Administrator
              </Text>
            </View>
          )}

          {user.doctorSpecialty && user.doctorSpecialty.length > 0 && (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: colors.text }]}
                numberOfLines={1}
              >
                {user.doctorSpecialty.join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            {quickActions.map(action => (
              <View
                key={action.title}
                style={[styles.actionCell, { width: cellWidth }]}
              >
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleActionPress(action)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  accessibilityHint={action.description}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: action.color },
                    ]}
                  >
                    <action.icon size={26} color={colors.textInverse} />
                  </View>
                  <Text
                    style={[styles.actionTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {action.title}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[styles.footerText, { color: colors.textSecondary }]}
          >
            Logged in as {user.email}
          </Text>
          {user.countries && user.countries.length > 0 && (
            <Text
              style={[styles.footerText, { color: colors.textSecondary }]}
            >
              Regions: {user.countries.join(', ')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Create Patient FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => (navigation as any).navigate('CreatePatient')}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.textInverse} />
      </TouchableOpacity>

      {/* First-login data settings onboarding */}
      <DataSettingsOnboardingSheet
        visible={showDataOnboarding}
        onClose={() => setShowDataOnboarding(false)}
        onComplete={(payload) => {
          void startDataSync({
            queuedModelDownloads: payload.queuedModelDownloads,
            translationModelWifiOnly: payload.translationModelWifiOnly,
          });
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    // Clear the FAB so the footer stays readable
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  actionsSection: {
    // Cells carry their own 6pt gutter, so pull the grid back to a 20pt margin
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionCell: {
    padding: 6,
  },
  actionCard: {
    // Cells stretch to the tallest in their row; flex makes every card match it
    flex: 1,
    minHeight: 118,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
