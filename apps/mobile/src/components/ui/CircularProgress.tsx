// SVG-based circular progress indicator.
// Uses react-native-svg Circle with strokeDashoffset for the progress arc,
// animated smoothly via Reanimated.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  /** Progress value 0-1 */
  progress: number;
  /** Outer diameter in px */
  size?: number;
  /** Stroke width of the progress ring */
  strokeWidth?: number;
  /** Color of the progress arc */
  color?: string;
  /** Color of the background track */
  trackColor?: string;
  /** Content rendered inside the ring (e.g. an icon) */
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 28,
  strokeWidth = 2.5,
  color = '#007AFF',
  trackColor = 'rgba(0,0,0,0.08)',
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProgress = useDerivedValue(() => {
    return withTiming(progress, { duration: 300 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // Rotate -90deg so arc starts from top
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
