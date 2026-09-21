import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { palette } from '../../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BlobConfig {
  id: string;
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  rangeX: number;
  rangeY: number;
  duration: number;
  delay: number;
  opacity: number;
}

const AnimatedBlob = ({ config }: { config: BlobConfig }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.rangeX, {
            duration: config.duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-config.rangeX * 0.7, {
            duration: config.duration * 0.8,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      config.delay + 500,
      withRepeat(
        withSequence(
          withTiming(-config.rangeY, {
            duration: config.duration * 1.1,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(config.rangeY * 0.6, {
            duration: config.duration * 0.9,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.initialX - config.size / 2,
          top: config.initialY - config.size / 2,
          width: config.size,
          height: config.size,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    >
      <Svg width={config.size} height={config.size}>
        <Defs>
          <RadialGradient id={`grad-${config.id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={config.color} stopOpacity="1" />
            <Stop offset="0.5" stopColor={config.color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={config.color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={config.size}
          height={config.size}
          fill={`url(#grad-${config.id})`}
        />
      </Svg>
    </Animated.View>
  );
};

// Blob configurations using Fajr brand colors
const BLOB_CONFIGS: BlobConfig[] = [
  {
    id: 'blob1',
    color: palette.navy[600],
    size: SCREEN_WIDTH * 1.4,
    initialX: SCREEN_WIDTH * 0.3,
    initialY: SCREEN_HEIGHT * 0.15,
    rangeX: 40,
    rangeY: 30,
    duration: 4000,
    delay: 0,
    opacity: 0.8,
  },
  {
    id: 'blob2',
    color: palette.teal[500],
    size: SCREEN_WIDTH * 1.0,
    initialX: SCREEN_WIDTH * 0.7,
    initialY: SCREEN_HEIGHT * 0.25,
    rangeX: 50,
    rangeY: 40,
    duration: 5000,
    delay: 400,
    opacity: 0.5,
  },
  {
    id: 'blob3',
    color: palette.blue[400],
    size: SCREEN_WIDTH * 1.2,
    initialX: SCREEN_WIDTH * 0.5,
    initialY: SCREEN_HEIGHT * 0.55,
    rangeX: 35,
    rangeY: 45,
    duration: 4500,
    delay: 200,
    opacity: 0.45,
  },
  {
    id: 'blob4',
    color: palette.teal[700],
    size: SCREEN_WIDTH * 0.8,
    initialX: SCREEN_WIDTH * 0.2,
    initialY: SCREEN_HEIGHT * 0.7,
    rangeX: 45,
    rangeY: 35,
    duration: 3500,
    delay: 800,
    opacity: 0.4,
  },
  {
    id: 'blob5',
    color: palette.navy[400],
    size: SCREEN_WIDTH * 0.9,
    initialX: SCREEN_WIDTH * 0.8,
    initialY: SCREEN_HEIGHT * 0.8,
    rangeX: 30,
    rangeY: 50,
    duration: 5500,
    delay: 600,
    opacity: 0.5,
  },
];

interface AnimatedGradientBackgroundProps {
  children?: React.ReactNode;
}

export const AnimatedGradientBackground = ({
  children,
}: AnimatedGradientBackgroundProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.baseBackground} />
      <View style={styles.blobLayer} pointerEvents="none">
        {BLOB_CONFIGS.map((config) => (
          <AnimatedBlob key={config.id} config={config} />
        ))}
      </View>
      <View style={styles.contentLayer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.navy[950],
  },
  blobLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  contentLayer: {
    flex: 1,
  },
});
