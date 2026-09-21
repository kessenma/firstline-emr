// apps/mobile/src/components/ui/LoadingScreen.tsx
// Full-screen loading overlay with logo, spinner, and smooth fade in/out.
// Uses useColorScheme() directly so it works outside of ThemeProvider.
// Renders as an absolute overlay — fades out when `visible` becomes false,
// then calls `onHidden` so the parent can unmount it.

import React, { useEffect, useState } from 'react';
import {
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  useColorScheme,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { brandColors } from '../../utils/colors';

interface LoadingScreenProps {
  /** Whether the loading screen should be showing */
  visible: boolean;
  /** Status message displayed under the spinner */
  message?: string;
  /** Called after the fade-out animation completes so the parent can unmount */
  onHidden?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible,
  message = 'Loading...',
  onHidden,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Track whether we should render at all (stays true during fade-out)
  const [mounted, setMounted] = useState(true);

  const containerOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);

  // Fade-in on mount
  useEffect(() => {
    containerOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    logoScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.back(1.2)),
    });
    textOpacity.value = withDelay(
      250,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }),
    );
  }, []);

  // Fade-out when visible becomes false
  useEffect(() => {
    if (!visible) {
      containerOpacity.value = withTiming(
        0,
        { duration: 350, easing: Easing.in(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
            if (onHidden) {
              runOnJS(onHidden)();
            }
          }
        },
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (!mounted) return null;

  const bg = isDark ? '#0A0A0A' : brandColors.white;
  const textColor = isDark ? brandColors.white : brandColors.black;
  const subtextColor = isDark ? '#A3A3A3' : '#666666';
  const spinnerColor = isDark ? '#A3A3A3' : '#476CC9';

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg }, containerStyle]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../../assets/fajr-triage-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <ActivityIndicator size="large" color={spinnerColor} style={styles.spinner} />

      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={[styles.title, { color: textColor }]}>Fajr EMR</Text>
        <Text style={[styles.subtitle, { color: subtextColor }]}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  spinner: {
    marginVertical: 16,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
});
