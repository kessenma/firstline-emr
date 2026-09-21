// apps/mobile/src/components/ui/Skeleton.tsx
// Skeleton loading component for React Native

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className: _className,
  style,
  width,
  height,
  borderRadius,
  children,
}) => {
  const colors = useThemeColors();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [opacityAnim]);

  const skeletonStyle: ViewStyle = {
    backgroundColor: colors.surfaceSecondary,
    opacity: opacityAnim,
    width: (width as any) || '100%',
    height: (height as any) || 16,
    borderRadius: borderRadius || 6,
    ...style,
  };

  return (
    <Animated.View style={skeletonStyle}>
      {children}
    </Animated.View>
  );
};

const SkeletonText: React.FC<Omit<SkeletonProps, 'height'>> = (props) => (
  <Skeleton height={16} {...props} />
);

const SkeletonCircle: React.FC<Omit<SkeletonProps, 'height' | 'width' | 'borderRadius'>> = (props) => (
  <Skeleton
    width={40}
    height={40}
    borderRadius={20}
    {...props}
  />
);

const SkeletonRectangle: React.FC<Omit<SkeletonProps, 'borderRadius'>> = (props) => (
  <Skeleton borderRadius={8} {...props} />
);

export { SkeletonText, SkeletonCircle, SkeletonRectangle };
