// apps/mobile/src/navigation/AdminStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import PowerSyncTestScreen from '../screens/admin/PowerSyncTestScreen';

export type AdminStackParamList = {
  AdminDashboard: { initialSection?: string } | undefined;
  PowerSyncTest: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

interface AdminStackNavigatorProps {
  // No props needed - user comes from AuthContext
}

/**
 * AdminStackNavigator
 *
 * Stack navigator for admin-related screens.
 * Includes role-based access control and custom header styling.
 *
 * Features:
 * - Admin role verification
 * - Custom header with admin badge
 * - Deep linking support
 * - Consistent theming
 */
export function AdminStackNavigator({}: AdminStackNavigatorProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

  // Access denied screen for non-admin users
  if (!isAdmin) {
    return (
      <View
        style={[
          styles.accessDeniedContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Shield size={64} color={colors.error} strokeWidth={1.5} />
        <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>
          Access Denied
        </Text>
        <Text
          style={[styles.accessDeniedMessage, { color: colors.textSecondary }]}
        >
          You don't have permission to access the admin dashboard.
        </Text>
        <Text style={[styles.accessDeniedHelp, { color: colors.textTertiary }]}>
          Contact an administrator if you believe this is an error.
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={({ navigation }) => ({
          title: 'Admin Dashboard',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View
              style={[
                styles.adminBadge,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Shield size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.adminBadgeText, { color: colors.primary }]}>
                ADMIN
              </Text>
            </View>
          ),
        })}
      />

      {/* PowerSync Test Screen */}
      <Stack.Screen
        name="PowerSyncTest"
        component={PowerSyncTestScreen}
        options={{
          title: 'PowerSync Test',
          headerRight: () => (
            <View
              style={[
                styles.adminBadge,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Shield size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.adminBadgeText, { color: colors.primary }]}>
                ADMIN
              </Text>
            </View>
          ),
        }}
      />

      {/* Add more admin screens here as they're created */}
      {/* Example:
      <Stack.Screen
        name="AdminUserDetail"
        component={AdminUserDetailScreen}
        options={{
          title: 'User Details',
        }}
      />
      */}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  accessDeniedMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  accessDeniedHelp: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
