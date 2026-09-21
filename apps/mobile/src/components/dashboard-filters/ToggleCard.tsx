// apps/mobile/src/components/dashboard-filters/ToggleCard.tsx
// Reusable toggle card button for filter selections.
// Active state: filled primary background with checkmark. Inactive: bordered surface.

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface ToggleCardProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export function ToggleCard({ label, isActive, onPress }: ToggleCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderWidth: isActive ? 0 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: isActive ? colors.textInverse : colors.text,
          },
        ]}
      >
        {label}
      </Text>

      {isActive && (
        <View style={styles.checkmarkContainer}>
          <Check size={12} color={colors.textInverse} strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
});
