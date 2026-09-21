// apps/mobile/src/components/form/ReadOnlyField.tsx
// ReadOnlyField component for React Native

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface ReadOnlyFieldProps {
  fieldName: string;
  fieldLabel: string;
  value: string;
  className?: string;
  style?: any;
}

export default function ReadOnlyField({
  fieldName: _fieldName,
  fieldLabel,
  value,
  className: _className,
  style
}: ReadOnlyFieldProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {fieldLabel}:
        </Text>
        <View style={[styles.valueContainer, {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border
        }]}>
          <Text style={[styles.value, { color: colors.text }]}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    minWidth: 120,
    marginRight: spacing.sm,
  },
  valueContainer: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  value: {
    fontSize: typography.fontSize.sm,
  },
});
