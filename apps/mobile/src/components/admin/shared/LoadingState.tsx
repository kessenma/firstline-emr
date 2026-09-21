// apps/mobile/src/components/admin/shared/LoadingState.tsx
// Loading state component for admin sections

import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../utils/theme';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'large',
  style,
  fullScreen = false,
}) => {
  const colors = useThemeColors();

  return (
    <View style={[
      fullScreen ? styles.fullScreenContainer : styles.container,
      style,
    ]}>
      <ActivityIndicator size={size} color={colors.primary} />
      
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

// Add SkeletonLoader component
export function SkeletonLoader() {
  const colors = useThemeColors();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map(i => (
        <Animated.View
          key={i}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.border, opacity },
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonAvatar, { backgroundColor: colors.surface }]} />
            <View style={styles.skeletonInfo}>
              <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '70%' }]} />
              <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '50%', marginTop: spacing.xs }]} />
            </View>
          </View>
          <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '90%', marginTop: spacing.md }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '60%', marginTop: spacing.xs }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    minHeight: 200,
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  message: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  skeletonContainer: {
    padding: spacing.base,
  },
  skeletonCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: borderRadius.sm,
  },
});
