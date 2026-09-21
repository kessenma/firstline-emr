// apps/mobile/src/components/admin/shared/EmptyState.tsx
// Empty state component for admin sections

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  action,
  style,
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {Icon && (
        <View style={styles.iconContainer}>
          <Icon size={64} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}

      {action && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={action.onPress}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>{action.label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
    maxWidth: 400,
  },
  actionContainer: {
    marginTop: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
