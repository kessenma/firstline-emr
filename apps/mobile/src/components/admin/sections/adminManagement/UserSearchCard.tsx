// apps/mobile/src/components/admin/sections/adminManagement/UserSearchCard.tsx
// Card component for displaying user search results with add admin action

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { UserPlus, User, Mail, CheckCircle2 } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';

interface UserSearchCardProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  onAddAdmin: () => void;
  isAdding?: boolean;
  isAlreadyAdmin?: boolean;
}

export function UserSearchCard({
  user,
  onAddAdmin,
  isAdding = false,
  isAlreadyAdmin = false,
}: UserSearchCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isAlreadyAdmin ? colors.primary : colors.border,
        },
        isAlreadyAdmin && styles.containerAlreadyAdmin,
      ]}
    >
      {/* User Info */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <User size={20} color={colors.primary} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>
            {user.firstName} {user.lastName}
          </Text>
          <View style={styles.emailRow}>
            <Mail size={12} color={colors.textSecondary} />
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user.email}
            </Text>
          </View>
        </View>

        {/* Action Button or Already Admin Badge */}
        {isAlreadyAdmin ? (
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <CheckCircle2 size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              Admin
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: colors.primary },
              isAdding && styles.addButtonDisabled,
            ]}
            onPress={onAddAdmin}
            disabled={isAdding}
            activeOpacity={0.7}
          >
            <UserPlus size={16} color={colors.textInverse} />
            {isAdding && (
              <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Adding...</Text>
            )}
          </TouchableOpacity>
        )}
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
  containerAlreadyAdmin: {
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  email: {
    fontSize: typography.fontSize.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});
