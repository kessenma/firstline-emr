// apps/mobile/src/components/admin/sections/newSignups/NewSignupCard.tsx
// Card component for displaying individual new signup user information

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { getRoleColor } from '@fajr/shared/theme';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { RoleIcon } from '../../../ui/RoleIcon';
import type { NewSignupUser } from '../../../../viewModels/admin/useNewSignupsViewModel';

interface NewSignupCardProps {
  user: NewSignupUser;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onDeny: () => void;
  style?: ViewStyle;
}

export function NewSignupCard({
  user,
  isSelected,
  onToggleSelect,
  onApprove,
  onDeny,
  style,
}: NewSignupCardProps) {
  const colors = useThemeColors();

  const fullName = `${user.firstName} ${user.lastName}`;
  const countries = Array.isArray(user.countries)
    ? user.countries.join(', ')
    : user.countries || 'N/A';
  const specialty = Array.isArray(user.doctorSpecialty)
    ? user.doctorSpecialty.join(', ')
    : user.doctorSpecialty || 'N/A';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
        isSelected && styles.selectedContainer,
        style,
      ]}
      onPress={onToggleSelect}
      activeOpacity={0.7}
    >
      {/* Selection Indicator */}
      <View
        style={[
          styles.selectionIndicator,
          {
            backgroundColor: isSelected ? colors.primary : 'transparent',
            borderColor: colors.border,
          },
        ]}
      >
        {isSelected && (
          <CheckCircle2 size={16} color={colors.textInverse} strokeWidth={3} />
        )}
      </View>

      {/* User Info */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <User size={18} color={colors.primary} />
            <Text style={[styles.name, { color: colors.text }]}>
              {fullName}
            </Text>
          </View>
          <View
            style={[
              styles.accountTypeBadge,
              { backgroundColor: getRoleColor(user.accountType) + '20' },
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

        {/* Email */}
        <View style={styles.infoRow}>
          <Mail size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        {/* Country */}
        {countries !== 'N/A' && (
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {countries}
            </Text>
          </View>
        )}

        {/* Doctor Specialty (only for doctors) */}
        {user.accountType === 'Doctor' && specialty !== 'N/A' && (
          <View style={styles.infoRow}>
            <Briefcase size={14} color={colors.textSecondary} />
            <Text
              style={[styles.infoText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {specialty}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.approveButton,
              { backgroundColor: colors.success },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={16} color={colors.textInverse} />
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.denyButton,
              { backgroundColor: colors.error },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onDeny();
            }}
            activeOpacity={0.8}
          >
            <XCircle size={16} color={colors.textInverse} />
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>Deny</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Memoize with custom comparison
export default memo(NewSignupCard, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.isSelected === nextProps.isSelected
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  selectedContainer: {
    borderWidth: 2,
  },
  selectionIndicator: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  content: {
    flex: 1,
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
    flex: 1,
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  accountTypeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButton: {
    // backgroundColor set inline
  },
  denyButton: {
    // backgroundColor set inline
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
