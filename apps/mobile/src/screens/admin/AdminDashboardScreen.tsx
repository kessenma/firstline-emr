// apps/mobile/src/screens/admin/AdminDashboardScreen.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Database } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import AdminDashboardView from '../../components/admin/AdminDashboardView';
import type { AdminStackParamList } from '../../navigation/AdminStackNavigator';

/**
 * AdminDashboardScreen
 *
 * Entry point for the admin dashboard in the mobile app.
 * Contains the AdminDashboardView component with all admin sections.
 *
 * Features:
 * - Admin authentication check (via AdminContext)
 * - Dashboard container with all admin sections
 * - Search, refresh, and help functionality
 */
export default function AdminDashboardScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminStackParamList, 'AdminDashboard'>>();
  const initialSection = route.params?.initialSection ?? null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Development: PowerSync Test Button */}
      {__DEV__ && (
        <TouchableOpacity
          style={[styles.devButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('PowerSyncTest' as never)}
        >
          <Database size={16} color={colors.textInverse} />
          <Text style={[styles.devButtonText, { color: colors.textInverse }]}>PowerSync Test</Text>
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <AdminDashboardView initialOpenSection={initialSection} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 12,
    borderRadius: 8,
    gap: 8,
  },
  devButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
