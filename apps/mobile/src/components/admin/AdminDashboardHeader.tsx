// apps/mobile/src/components/admin/AdminDashboardHeader.tsx
// Header component for Admin Dashboard with search, refresh, and help

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Search,
  RefreshCw,
  HelpCircle,
} from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface AdminDashboardHeaderProps {
  searchTerm: string;
  onSearchChange: (text: string) => void;
  onRefresh: () => void;
  onHelp: () => void;
  isRefreshing?: boolean;
}

export default function AdminDashboardHeader({
  searchTerm,
  onSearchChange,
  onRefresh,
  onHelp,
  isRefreshing = false,
}: AdminDashboardHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          Admin Dashboard
        </Text>
      </View>

      {/* Search and Actions Row */}
      <View style={styles.actionsRow}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text },
            ]}
            placeholder="Search sections..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={onRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RefreshCw size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        {/* Help Button */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={onHelp}
          activeOpacity={0.7}
        >
          <HelpCircle size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.base,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    // borderBottomColor set inline via colors.border
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize.xxl * 1.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    // borderColor set inline via colors.border
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: 0,
    height: '100%',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // borderColor set inline via colors.border
  },
});
