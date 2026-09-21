// apps/mobile/src/components/patient-chart/SectionSummaryCard.tsx
// Compact summary card for the dashboard view. Shows icon, title, badge, and preview content.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface SectionSummaryCardProps {
  icon: React.ReactNode;
  title: string;
  badgeCount?: number;
  badgeLabel?: string;
  color: string;
  onPress: () => void;
  children?: React.ReactNode;
}

export const SectionSummaryCard: React.FC<SectionSummaryCardProps> = ({
  icon,
  title,
  badgeCount,
  badgeLabel,
  color,
  onPress,
  children,
}) => {
  const colors = useThemeColors();

  const showBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header row: icon + title + badge */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
          {icon}
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              {badgeLabel || String(badgeCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Preview content */}
      {children && <View style={styles.content}>{children}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    marginTop: spacing.sm,
    paddingLeft: 36 + spacing.sm, // align with title text
  },
});
