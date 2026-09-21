// apps/mobile/src/components/admin/sections/deniedUsers/DeniedUserCard.tsx
// Card component for displaying individual denied user information

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  UserCheck,
  Mail,
  Briefcase,
  Calendar,
  Globe,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { getRoleColor } from '@fajr/shared/theme';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { RoleIcon } from '../../../ui/RoleIcon';
import type { DeniedUser } from '../../../../viewModels/admin/useDeniedUsersViewModel';

interface DeniedUserCardProps {
  user: DeniedUser;
  isSelected: boolean;
  onToggleSelect: () => void;
  onReinstate: () => void;
  isProcessing?: boolean;
}

export function DeniedUserCard({
  user,
  isSelected,
  onToggleSelect,
  onReinstate,
  isProcessing = false,
}: DeniedUserCardProps) {
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
          borderColor: isSelected ? colors.primary : colors.border,
        },
        isSelected && styles.containerSelected,
      ]}
    >
      {/* Header with checkbox and user info */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onToggleSelect}
          style={styles.checkbox}
          disabled={isProcessing}
        >
          {isSelected ? (
            <CheckSquare size={24} color={colors.primary} />
          ) : (
            <Square size={24} color={colors.border} />
          )}
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            <View
              style={[
                styles.accountTypeBadge,
                {
                  backgroundColor: getRoleColor(user.accountType) + '20',
                },
              ]}
            >
              <RoleIcon accountType={user.accountType} size={12} />
              <Text
                style={[
                  styles.accountTypeText,
                  { color: getRoleColor(user.accountType) },
                ]}
              >
                {user.accountType}
              </Text>
            </View>
          </View>

          <View style={styles.emailRow}>
            <Mail size={14} color={colors.textSecondary} />
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user.email}
            </Text>
          </View>
        </View>
      </View>

      {/* User Details */}
      <View style={styles.details}>
        {/* Specialties (for doctors) */}
        {user.accountType === 'Doctor' &&
          user.doctorSpecialty &&
          user.doctorSpecialty.length > 0 && (
            <View style={styles.detailRow}>
              <Briefcase size={14} color={colors.textSecondary} />
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Specialties:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {user.doctorSpecialty.join(', ')}
              </Text>
            </View>
          )}

        {/* Countries */}
        {user.countries && user.countries.length > 0 && (
          <View style={styles.detailRow}>
            <Globe size={14} color={colors.textSecondary} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Countries:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {user.countries.join(', ')}
            </Text>
          </View>
        )}

        {/* Denial Date */}
        {user.denialDate && (
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Denied:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(user.denialDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.reinstateButton,
            { backgroundColor: colors.success },
            isProcessing && styles.reinstateButtonDisabled,
          ]}
          onPress={onReinstate}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <UserCheck size={16} color={colors.textInverse} />
          <Text style={[styles.reinstateButtonText, { color: colors.textInverse }]}>
            {isProcessing ? 'Reinstating...' : 'Reinstate'}
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
  containerSelected: {
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  checkbox: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  accountTypeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reinstateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set inline via colors.success
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  reinstateButtonDisabled: {
    opacity: 0.5,
  },
  reinstateButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
