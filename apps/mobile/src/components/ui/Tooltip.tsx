// apps/mobile/src/components/ui/Tooltip.tsx
// Tooltip component for React Native

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../utils/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TooltipProps {
  children: React.ReactNode;
  tooltipText?: string;
  content?: React.ReactNode;
  showTooltip?: boolean;
  className?: string;
  style?: ViewStyle;
  tooltipStyle?: ViewStyle;
  textStyle?: TextStyle;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  tooltipText,
  content,
  showTooltip = false,
  className: _className,
  style,
  tooltipStyle,
  textStyle,
  position = 'top',
  maxWidth = 200,
}) => {
  const colors = useThemeColors();
  const [isVisible, setIsVisible] = useState(showTooltip);
  const [tooltipLayout, setTooltipLayout] = useState({ width: 0, height: 0 });
  const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // `showTooltip` is a controlled prop, and every caller in the app uses it as
  // one. Without this it was only ever read as `useState`'s initial value, so
  // the prop did nothing after mount and the tooltip never appeared — silently,
  // since a tooltip that fails to show looks exactly like one nobody triggered.
  useEffect(() => {
    setIsVisible(showTooltip);
  }, [showTooltip]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, fadeAnim, scaleAnim]);

  const handlePress = () => {
    setIsVisible(!isVisible);
  };

  const handleTooltipLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setTooltipLayout({ width, height });
  };

  const handleContainerLayout = (event: any) => {
    event.target.measure((x: number, y: number, width: number, height: number) => {
      setContainerLayout({ x, y, width, height });
    });
  };

  const getTooltipPosition = () => {
    const { x, y, width, height } = containerLayout;
    const { width: tooltipWidth, height: tooltipHeight } = tooltipLayout;
    let left = 0;
    let top = 0;

    switch (position) {
      case 'top':
        left = x + width / 2 - tooltipWidth / 2;
        top = y - tooltipHeight - spacing.sm;
        break;
      case 'bottom':
        left = x + width / 2 - tooltipWidth / 2;
        top = y + height + spacing.sm;
        break;
      case 'left':
        left = x - tooltipWidth - spacing.sm;
        top = y + height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        left = x + width + spacing.sm;
        top = y + height / 2 - tooltipHeight / 2;
        break;
    }

    // Ensure tooltip stays within screen bounds
    left = Math.max(spacing.md, Math.min(left, screenWidth - tooltipWidth - spacing.md));
    top = Math.max(spacing.md, Math.min(top, screenHeight - tooltipHeight - spacing.md));

    return { left, top };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={handlePress}
        onLayout={handleContainerLayout}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>

      {isVisible && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxWidth,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            },
            tooltipStyle,
          ]}
          onLayout={handleTooltipLayout}
        >
          {content ?? tooltipText ? (
            <Text
              style={[
                styles.tooltipText,
                { color: colors.text },
                textStyle,
              ]}
            >
              {content ?? tooltipText}
            </Text>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
    ...shadows.lg,
  },
  tooltipText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
});
