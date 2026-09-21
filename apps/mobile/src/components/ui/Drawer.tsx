// apps/mobile/src/components/ui/Drawer.tsx
// Drawer component for React Native

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
  PanResponder,
  PanResponderInstance,
} from 'react-native';
import { X, ChevronDown } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography, shadows } from '../../utils/theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom';

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  direction?: DrawerDirection;
  size?: number | string;
  title?: string;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  dismissible?: boolean;
  style?: ViewStyle;
}

export const Drawer: React.FC<DrawerProps> = ({
  children,
  isOpen,
  onClose,
  direction = 'bottom',
  size = 0.7,
  title,
  icon,
  showCloseButton = true,
  dismissible = true,
  style,
}) => {
  const colors = useThemeColors();
  const translateAnim = useRef(new Animated.Value(getInitialPosition())).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  function getInitialPosition(): number {
    switch (direction) {
      case 'top':
        return -screenHeight;
      case 'bottom':
        return screenHeight;
      case 'left':
        return -screenWidth;
      case 'right':
        return screenWidth;
      default:
        return screenHeight;
    }
  }

  function getFinalPosition(): number {
    let positionValue = 0;

    if (typeof size === 'string' && size.endsWith('%')) {
      const percentage = parseFloat(size) / 100;
      switch (direction) {
        case 'top':
        case 'bottom':
          positionValue = screenHeight * (1 - percentage);
          break;
        case 'left':
        case 'right':
          positionValue = screenWidth * (1 - percentage);
          break;
      }
    } else if (typeof size === 'number') {
      positionValue = typeof size === 'number' ? size : screenHeight * 0.3;
    }

    return direction === 'bottom' || direction === 'right' ? positionValue : -positionValue;
  }

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateAnim, {
          toValue: getFinalPosition(),
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateAnim, {
          toValue: getInitialPosition(),
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, direction, size]);

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Allow swipe to dismiss based on direction
        const { dy, dx } = gestureState;
        switch (direction) {
          case 'top':
            return dy > 20;
          case 'bottom':
            return dy < -20;
          case 'left':
            return dx > 20;
          case 'right':
            return dx < -20;
          default:
            return false;
        }
      },
      onPanResponderRelease: () => {
        if (dismissible) {
          onClose();
        }
      },
    })
  );

  const getDrawerStyle = (): Animated.WithAnimatedObject<ViewStyle> => {
    const baseStyle: ViewStyle = {
      position: 'absolute',
      backgroundColor: colors.surface,
      ...shadows.lg,
    };

    switch (direction) {
      case 'top':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          right: 0,
          height: typeof size === 'number' ? size : screenHeight * 0.7,
          transform: [{ translateY: translateAnim }],
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: 0,
          left: 0,
          right: 0,
          height: typeof size === 'number' ? size : screenHeight * 0.7,
          transform: [{ translateY: translateAnim }],
        };
      case 'left':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          width: typeof size === 'number' ? size : screenWidth * 0.8,
          height: screenHeight,
          transform: [{ translateX: translateAnim }],
        };
      case 'right':
        return {
          ...baseStyle,
          top: 0,
          right: 0,
          width: typeof size === 'number' ? size : screenWidth * 0.8,
          height: screenHeight,
          transform: [{ translateX: translateAnim }],
        };
      default:
        return baseStyle;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={dismissible ? onClose : undefined}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.5)' },
          { opacity: opacityAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={dismissible ? onClose : undefined}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Drawer Content */}
      <Animated.View
        style={[getDrawerStyle(), style]}
        {...panResponder.current.panHandlers}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <View style={styles.header}>
            {title && (
              <View style={styles.titleContainer}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              </View>
            )}
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Handle for bottom drawer */}
        {direction === 'bottom' && (
          <View style={styles.handle}>
            <ChevronDown size={24} color={colors.textSecondary} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouchable: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
});
