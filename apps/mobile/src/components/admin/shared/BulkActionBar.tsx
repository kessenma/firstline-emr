// apps/mobile/src/components/admin/shared/BulkActionBar.tsx
// Bulk action bar for selecting and performing actions on multiple items

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../../../utils/theme';

interface BulkAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  actions: BulkAction[];
  onClear: () => void;
  style?: StyleProp<ViewStyle>;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  actions,
  onClear,
  style,
}) => {
  const colors = useThemeColors();

  if (selectedCount === 0) {
    return null;
  }

  const getButtonColor = (variant: BulkAction['variant'] = 'primary') => {
    switch (variant) {
      case 'danger':
        return colors.error;
      case 'secondary':
        return colors.textSecondary;
      case 'primary':
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
      },
      shadows.lg,
      style,
    ]}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <Text style={[styles.countText, { color: colors.text }]}>
          {selectedCount} selected
          {totalCount && ` of ${totalCount}`}
        </Text>
      </View>

      <View style={styles.actionsSection}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={action.onPress}
            disabled={action.disabled}
            style={[
              styles.actionButton,
              {
                backgroundColor: getButtonColor(action.variant),
                opacity: action.disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clearButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  countText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
