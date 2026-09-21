// apps/mobile/src/components/patient-chart/media-gallery/ExpandableFAB.tsx
// Expandable floating action button: Plus icon expands to Camera, Gallery, Document options

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { Plus, Camera, Images, File } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';

interface ExpandableFABProps {
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
  disabled?: boolean;
}

const TIMING_CONFIG = { duration: 200, easing: Easing.out(Easing.quad) };
const OPTION_GAP = 48;

// Animated style for one option row, offset by its index. A named hook called at
// the top level of the component — not a helper wrapping useAnimatedStyle, which
// reads as a hook in a non-component function.
const useRowStyle = (progress: SharedValue<number>, index: number) => {
  const offsetY = (index + 1) * OPTION_GAP;
  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -offsetY]) },
    ],
  }));
};
const FAB_SIZE = 52;

export const ExpandableFAB: React.FC<ExpandableFABProps> = ({
  onCamera,
  onGallery,
  onDocument,
  disabled = false,
}) => {
  const colors = useThemeColors();
  const progress = useSharedValue(0);

  const isOpen = () => progress.value > 0.5;

  const toggle = useCallback(() => {
    progress.value = withTiming(isOpen() ? 0 : 1, TIMING_CONFIG);
  }, [progress]);

  const close = useCallback(() => {
    progress.value = withTiming(0, TIMING_CONFIG);
  }, [progress]);

  const handleOption = useCallback(
    (action: () => void) => {
      close();
      action();
    },
    [close],
  );

  // Main FAB rotation
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  // Invisible tap-away area (no visible overlay)
  const tapAwayStyle = useAnimatedStyle(() => ({
    pointerEvents: progress.value > 0.1 ? 'auto' as const : 'none' as const,
  }));

  // Each option row slides up and fades in
  const row1Style = useRowStyle(progress, 0);
  const row2Style = useRowStyle(progress, 1);
  const row3Style = useRowStyle(progress, 2);

  const options = [
    { label: 'Camera', icon: Camera, onPress: onCamera, style: row1Style },
    { label: 'Gallery', icon: Images, onPress: onGallery, style: row2Style },
    { label: 'Document', icon: File, onPress: onDocument, style: row3Style },
  ];

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Invisible tap-away to close (no backdrop) */}
      <Animated.View style={[styles.tapAway, tapAwayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Option labels + main FAB */}
      <View style={styles.anchor} pointerEvents="box-none">
        {options.map(({ label, icon: Icon, onPress, style }) => (
          <Animated.View key={label} style={[styles.optionRow, style]} pointerEvents="box-none">
            <Pressable
              style={[styles.optionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleOption(onPress)}
            >
              <Icon size={16} color={colors.text} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}

        {/* Main FAB */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.text }]}
          onPress={disabled ? undefined : toggle}
          disabled={disabled}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Animated.View style={fabAnimStyle}>
              <Plus size={24} color={colors.background} />
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  tapAway: {
    ...StyleSheet.absoluteFillObject,
  },
  anchor: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    alignItems: 'flex-end',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  optionRow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 140,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 0,
  },
});
