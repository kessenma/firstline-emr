// apps/mobile/src/components/ui/Badge.tsx
// Badge component matching web API for React Native

import React, { forwardRef } from 'react';
import {
  View,
  Text,
  ViewProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export interface BadgeProps extends Omit<ViewProps, 'children'> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge = forwardRef<View, BadgeProps>(
  (
    {
      variant = 'default',
      children,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    const colors = useThemeColors();

    const getVariantStyles = (): {
      container: ViewStyle;
      text: TextStyle;
    } => {
      switch (variant) {
        case 'default':
          return {
            container: {
              backgroundColor: colors.primary,
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
        case 'secondary':
          return {
            container: {
              backgroundColor: colors.secondary,
              borderColor: 'transparent',
            },
            text: {
              color: colors.text,
            },
          };
        case 'destructive':
          return {
            container: {
              backgroundColor: colors.error,
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
        case 'outline':
          return {
            container: {
              backgroundColor: 'transparent',
              borderColor: colors.border,
              borderWidth: 1,
            },
            text: {
              color: colors.text,
            },
          };
        case 'success':
          return {
            container: {
              backgroundColor: colors.success || '#22c55e',
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
        case 'warning':
          return {
            container: {
              backgroundColor: colors.warning || '#f59e0b',
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
        case 'info':
          return {
            container: {
              backgroundColor: colors.info || '#3b82f6',
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
        default:
          return {
            container: {
              backgroundColor: colors.primary,
              borderColor: 'transparent',
            },
            text: {
              color: '#FFFFFF',
            },
          };
      }
    };

    const variantStyles = getVariantStyles();

    const containerStyles = [
      styles.container,
      variantStyles.container,
      style,
    ];

    const textStyles = [
      styles.text,
      variantStyles.text,
      textStyle,
    ];

    return (
      <View ref={ref} style={containerStyles} {...props}>
        <Text style={textStyles}>{children}</Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
