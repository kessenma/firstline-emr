// apps/mobile/src/components/admin/sections/adminManagement/AdminCard.tsx
// Card component for displaying individual admin information

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { UserMinus, Shield, Calendar } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import type { AdminUser } from '../../../../types/admin';

interface AdminCardProps {
  admin: AdminUser;
  onRemove: () => void;
  isRemoving?: boolean;
}

export function AdminCard({ admin, onRemove, isRemoving = false }: AdminCardProps) {
  const colors = useThemeColors();

  // Format date
  const formatDate = (date?: string | Date): string => {
    if (!date) return 'N/A';

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header with Shield Icon */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Shield size={20} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]}>
            {admin.firstName} {admin.lastName}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {admin.email}
          </Text>
        </View>
      </View>

      {/* Admin Details */}
      <View style={styles.details}>
        {admin.adminStartDate && (
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Admin Since:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(admin.adminStartDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.removeButton,
            { backgroundColor: colors.error },
            isRemoving && styles.removeButtonDisabled,
          ]}
          onPress={onRemove}
          disabled={isRemoving}
          activeOpacity={0.7}
        >
          <UserMinus size={16} color={colors.textInverse} />
          <Text style={[styles.removeButtonText, { color: colors.textInverse }]}>
            {isRemoving ? 'Removing...' : 'Remove Admin'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.fontSize.sm,
  },
  details: {
    marginBottom: spacing.md,
    paddingLeft: spacing.xl + spacing.md, // Align with header text
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set inline via colors.error
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
