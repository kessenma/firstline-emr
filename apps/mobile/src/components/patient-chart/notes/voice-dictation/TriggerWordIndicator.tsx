// Small inline indicator shown below a field when a trigger word was detected and stripped.
// Shows the trigger word with strikethrough + "exit word detected" label + dismiss button.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';

interface TriggerWordIndicatorProps {
  triggerWord: string;
  onDismiss: () => void;
}

export const TriggerWordIndicator: React.FC<TriggerWordIndicatorProps> = ({
  triggerWord,
  onDismiss,
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.triggerWord, { color: colors.textSecondary }]}>
        {triggerWord}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        exit word detected
      </Text>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={12} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  triggerWord: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: 'line-through',
  },
  label: {
    fontSize: typography.fontSize.xs,
  },
  dismissButton: {
    marginLeft: 'auto',
    padding: 2,
  },
});
