// apps/mobile/src/components/dashboard-filters/FilterPillGrid.tsx
// Single-select filter grid. Renders a label and a 2-column grid of ToggleCard buttons.
// Tapping the active option deselects it; tapping an inactive option selects it.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import { ToggleCard } from './ToggleCard';

interface FilterPillGridProps {
  label: string;
  options: readonly string[];
  value: string | undefined; // undefined means "all" (no filter active)
  onChange: (value: string | undefined) => void;
}

export function FilterPillGrid({
  label,
  options,
  value,
  onChange,
}: FilterPillGridProps) {
  const colors = useThemeColors();

  const handlePress = (option: string) => {
    if (value === option) {
      onChange(undefined);
    } else {
      onChange(option);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>

      <View style={styles.grid}>
        {options.map((option) => (
          <View key={option} style={styles.gridItem}>
            <ToggleCard
              label={option}
              isActive={value === option}
              onPress={() => handlePress(option)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
});
