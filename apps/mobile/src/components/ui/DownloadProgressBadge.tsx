// Tab bar badge showing aggregate download progress.
// Renders a CircularProgress ring around a Download icon,
// with an optional count badge when multiple downloads are active.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Download } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { CircularProgress } from './CircularProgress';
import { useThemeColors } from '../../contexts/ThemeContext';

interface DownloadProgressBadgeProps {
  /** Aggregate progress 0-1 */
  progress: number;
  /** Number of active downloads */
  count: number;
  /** Outer size in px (default 32) */
  size?: number;
  /** Callback when badge is tapped */
  onPress?: () => void;
  /** Primary color for progress ring */
  color?: string;
}

export function DownloadProgressBadge({
  progress,
  count,
  size = 32,
  onPress,
  color = '#007AFF',
}: DownloadProgressBadgeProps) {
  const colors = useThemeColors();

  // Fade + scale entrance
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  // Pulse when download is active
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withTiming(1, { duration: 250 });
  }, []);

  // Gentle pulse animation
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulseScale);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const iconSize = size * 0.45;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={8}>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        <CircularProgress
          progress={progress}
          size={size}
          strokeWidth={2.5}
          color={color}
          trackColor="rgba(0,122,255,0.15)"
        >
          <Download size={iconSize} color={color} strokeWidth={2.5} />
        </CircularProgress>

        {count > 1 && (
          <View style={[styles.countBadge, { backgroundColor: colors.error }]}>
            <Text style={[styles.countText, { color: colors.textInverse }]}>{count}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
