// apps/mobile/src/components/admin/shared/UserCard.tsx
// Reusable user card component for displaying user information

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { User, Mail, MapPin, Calendar, CheckCircle } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../../utils/theme';

interface UserCardProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountType?: string;
    city?: string;
    countries?: string[] | null;
    doctorSpecialty?: string[] | null;
    approvalDate?: string | Date;
    authorized?: boolean;
  };
  onPress?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
  actions?: React.ReactNode[];
  style?: StyleProp<ViewStyle>;
}

function UserCard({
  user,
  onPress,
  selected = false,
  onSelect,
  showCheckbox = false,
  actions,
  style,
}: UserCardProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    if (showCheckbox && onSelect) {
      onSelect(!selected);
    } else if (onPress) {
      onPress();
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress && !showCheckbox}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
        shadows.sm,
        style,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showCheckbox && (
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: selected ? colors.primary : 'transparent',
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              {selected && <CheckCircle size={20} color={colors.textInverse} />}
            </View>
          )}

          <View
            style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}
          >
            <User size={24} color={colors.primary} />
          </View>

          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>
            {user.accountType && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {user.accountType}
                </Text>
              </View>
            )}
          </View>
        </View>

        {user.authorized !== undefined && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: user.authorized
                  ? colors.success + '20'
                  : colors.error + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: user.authorized ? colors.success : colors.error },
              ]}
            >
              {user.authorized ? 'Authorized' : 'Pending'}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Mail size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        {user.city && (
          <View style={styles.detailRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {user.city}
              {user.countries &&
                user.countries.length > 0 &&
                `, ${user.countries[0]}`}
            </Text>
          </View>
        )}

        {user.doctorSpecialty && user.doctorSpecialty.length > 0 && (
          <View style={styles.specialtyContainer}>
            {user.doctorSpecialty.slice(0, 3).map((specialty, index) => (
              <View
                key={index}
                style={[
                  styles.specialtyBadge,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text style={[styles.specialtyText, { color: colors.text }]}>
                  {specialty}
                </Text>
              </View>
            ))}
            {user.doctorSpecialty.length > 3 && (
              <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                +{user.doctorSpecialty.length - 3} more
              </Text>
            )}
          </View>
        )}

        {user.approvalDate && (
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              Approved {formatDate(user.approvalDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {actions && (
        <View
          style={[styles.actionsContainer, { borderTopColor: colors.border }]}
        >
          {actions}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(UserCard, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.selected === nextProps.selected &&
    (prevProps.actions as any)?.length === (nextProps.actions as any)?.length
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  specialtyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
  },
  moreText: {
    fontSize: typography.fontSize.xs,
    alignSelf: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
