// apps/mobile/src/components/ui/Button.tsx
// Reusable Button component for React Native

import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { SendHorizonal } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, sizes } from '../../utils/theme';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'teal'
  | 'tealOutline'
  | 'blue'
  | 'blueOutline'
  | 'red'
  | 'redOutline'
  | 'green'
  | 'greenOutline'
  | 'purple'
  | 'purpleOutline'
  | 'pink'
  | 'pinkOutline'
  | 'submit';

type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  asChild?: boolean;
  onPress?: () => void;
}

const getButtonStyles = (variant: ButtonVariant, colors: any, disabled: boolean) => {
  const baseStyle = {
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  };

  const disabledStyle = disabled ? { opacity: 0.5 } : {};

  switch (variant) {
    case 'default':
      return {
        ...baseStyle,
        backgroundColor: '#2A3867', // Navy
        ...disabledStyle,
      };
    case 'destructive':
      return {
        ...baseStyle,
        backgroundColor: '#DA4248', // Medical Red
        ...disabledStyle,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        ...disabledStyle,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: colors.secondary,
        ...disabledStyle,
      };
    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        ...disabledStyle,
      };
    case 'link':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        ...disabledStyle,
      };
    case 'teal':
      return {
        ...baseStyle,
        backgroundColor: '#359D98', // Global Teal
        ...disabledStyle,
      };
    case 'tealOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#359D98',
        ...disabledStyle,
      };
    case 'blue':
      return {
        ...baseStyle,
        backgroundColor: '#4F8EC9', // Scientific Blue
        ...disabledStyle,
      };
    case 'blueOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#4F8EC9',
        ...disabledStyle,
      };
    case 'red':
      return {
        ...baseStyle,
        backgroundColor: '#DA4248', // Medical Red
        ...disabledStyle,
      };
    case 'redOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#DA4248',
        ...disabledStyle,
      };
    case 'green':
      return {
        ...baseStyle,
        backgroundColor: '#6F9385', // Humanity Green
        ...disabledStyle,
      };
    case 'greenOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#6F9385',
        ...disabledStyle,
      };
    case 'purple':
      return {
        ...baseStyle,
        backgroundColor: '#A877BA', // Shop Purple
        ...disabledStyle,
      };
    case 'purpleOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#A877BA',
        ...disabledStyle,
      };
    case 'pink':
      return {
        ...baseStyle,
        backgroundColor: '#CA6B91', // MNF Pink
        ...disabledStyle,
      };
    case 'pinkOutline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#CA6B91',
        ...disabledStyle,
      };
    case 'submit':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
        ...disabledStyle,
      };
    default:
      return baseStyle;
  }
};

const getTextStyles = (variant: ButtonVariant, _colors: any) => {
  const baseTextStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  };

  switch (variant) {
    case 'default':
    case 'teal':
    case 'blue':
    case 'red':
    case 'green':
    case 'purple':
    case 'pink':
      return {
        ...baseTextStyle,
        color: '#FFF9F4', // White text on colored backgrounds
      };
    case 'destructive':
      return {
        ...baseTextStyle,
        color: '#FFF9F4', // White text on red
      };
    case 'outline':
    case 'secondary':
    case 'ghost':
    case 'tealOutline':
    case 'blueOutline':
    case 'redOutline':
    case 'greenOutline':
    case 'purpleOutline':
    case 'pinkOutline':
    case 'submit':
      return {
        ...baseTextStyle,
        color: '#2A3867', // Navy text on outlines
      };
    case 'link':
      return {
        ...baseTextStyle,
        color: '#2A3867',
        textDecorationLine: 'underline' as const,
      };
    default:
      return baseTextStyle;
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return sizes.button.sm;
    case 'lg':
      return sizes.button.lg;
    case 'icon':
      return { width: sizes.button.md.height, height: sizes.button.md.height };
    default:
      return sizes.button.md;
  }
};

export const Button = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({
    children,
    variant = 'default',
    size = 'default',
    style,
    textStyle,
    disabled = false,
    asChild: _asChild = false,
    onPress,
    ...props
  }, ref) => {
    const colors = useThemeColors();

    const buttonStyle = [
      getButtonStyles(variant, colors, disabled),
      getSizeStyles(size),
      style,
    ];

    const textStyleCombined = [
      getTextStyles(variant, colors),
      textStyle,
    ];

    // For simplicity, asChild is not implemented in mobile version
    // In RN, composition is less common than web

    return (
      <TouchableOpacity
        ref={ref}
        style={buttonStyle}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        activeOpacity={0.7}
        {...props}
      >
        {variant === 'submit' && (
          <SendHorizonal size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
        )}
        {typeof children === 'string' ? (
          <Text style={textStyleCombined}>{children}</Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = "Button"
