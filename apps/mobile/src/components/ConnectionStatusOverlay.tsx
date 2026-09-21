// apps/mobile/src/components/ConnectionStatusOverlay.tsx
// Subtle gradient overlay at the top of the screen indicating PowerSync connection state.
// Uses theme palette colors: green (connected), red (offline), orange (connecting).
// Gradient fades from a very faint tint of color → fully transparent.
// Non-interactive (pointerEvents: 'none'), purely visual.

import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSyncConnection } from '../hooks/powersync';
import { usePowerSyncReady } from '../hooks/powersync';
import { useIsDarkMode } from '../contexts/ThemeContext';
import { palette } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVERLAY_HEIGHT = 160;

// Use palette colors with very low opacity so it's a subtle wash, not obnoxious.
// Multi-stop gradient creates an ease-out curve: holds color near the top, then
// melts smoothly into full transparency — no harsh cutoff when content scrolls behind.
const STATE_COLORS = {
  connected: palette.green[600],    // theme success color
  offline: palette.red[400],        // theme error (softer than 500)
  connecting: palette.orange[400],  // theme warning (softer than 500)
} as const;

// Starting opacity at the very top edge of the screen.
const STATE_OPACITY = {
  connected: '0.55',
  offline: '0.55',
  connecting: '0.55',
} as const;

type ConnectionState = keyof typeof STATE_COLORS;

export const ConnectionStatusOverlay: React.FC = () => {
  const isReady = usePowerSyncReady();
  const { isConnected, isConnecting } = useSyncConnection();
  const isDark = useIsDarkMode();

  let state: ConnectionState = 'offline';
  if (isConnected) state = 'connected';
  else if (isConnecting) state = 'connecting';

  // Animate opacity for smooth transitions
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isReady) {
      overlayOpacity.value = withTiming(0, { duration: 300 });
      return;
    }
    overlayOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isReady, state, overlayOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!isReady) return null;

  const color = STATE_COLORS[state];
  // Lower opacity in dark mode so the gradient wash is subtler against dark backgrounds
  const startOpacity = String(Number(STATE_OPACITY[state]) * (isDark ? 0.35 : 1));

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={OVERLAY_HEIGHT}>
        <Defs>
          <LinearGradient id="connectionGrad" x1="0" y1="0" x2="0" y2="1">
            {/* Long ease-out curve with many stops for a buttery-smooth fade */}
            <Stop offset="0"    stopColor={color} stopOpacity={startOpacity} />
            <Stop offset="0.08" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.90)} />
            <Stop offset="0.18" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.72)} />
            <Stop offset="0.30" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.50)} />
            <Stop offset="0.42" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.32)} />
            <Stop offset="0.55" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.18)} />
            <Stop offset="0.68" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.08)} />
            <Stop offset="0.80" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.03)} />
            <Stop offset="0.90" stopColor={color} stopOpacity={String(Number(startOpacity) * 0.01)} />
            <Stop offset="1"    stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={SCREEN_WIDTH}
          height={OVERLAY_HEIGHT}
          fill="url(#connectionGrad)"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: OVERLAY_HEIGHT,
    zIndex: 9999,
  },
});
