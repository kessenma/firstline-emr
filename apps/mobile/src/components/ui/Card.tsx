// apps/mobile/src/components/ui/Card.tsx
// Reusable Card component for React Native

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Text } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../../utils/theme';

// Helper function to convert hex color to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: keyof typeof spacing;
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderColor?: string;
  borderSize?: number;
  shadowSize?: 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<View, CardProps>(
  (
    {
      children,
      style,
      variant = 'default',
      padding = 'base',
      backgroundColor,
      backgroundOpacity = 100,
      borderColor,
      borderSize = 0,
      shadowSize = 'sm',
      ...props
    },
    ref,
  ) => {
    const colors = useThemeColors();

    // Determine background color
    let bgColor: string = colors.surface;
    if (backgroundColor) {
      // Map common color names to theme colors
      const colorMap: Record<string, string> = {
        card: colors.surface,
        background: colors.background,
        foreground: colors.text,
        muted: colors.surfaceSecondary,
        accent: colors.accent,
        destructive: colors.error,
        primary: colors.primary,
        secondary: colors.secondary,
      };
      bgColor = colorMap[backgroundColor] || backgroundColor;
    }

    // Apply opacity
    const bgStyle: ViewStyle =
      backgroundOpacity < 100
        ? { backgroundColor: hexToRgba(bgColor, backgroundOpacity / 100) }
        : { backgroundColor: bgColor };

    // Shadow
    const shadowMap = {
      sm: shadows.sm,
      md: shadows.md,
      lg: shadows.lg,
    };
    const shadowStyle = shadowMap[shadowSize];

    // Border
    const borderStyle =
      borderSize > 0
        ? {
            borderWidth: borderSize,
            borderColor: borderColor || colors.border,
          }
        : {};

    const cardStyle = [
      styles.card,
      bgStyle,
      variant === 'outlined' && {
        borderWidth: 1,
        borderColor: colors.border,
      },
      variant === 'elevated' && shadows.md,
      shadowStyle,
      borderStyle,
      { padding: spacing[padding] },
      style,
    ];

    return (
      <View ref={ref} style={cardStyle} {...props}>
        {children}
      </View>
    );
  },
);
Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  style,
}) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

interface CardTitleProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardTitle = React.forwardRef<Text, CardTitleProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text ref={ref} style={[styles.title, style]} {...props}>
        {children}
      </Text>
    );
  },
);
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardDescription = React.forwardRef<Text, CardDescriptionProps>(
  ({ children, style, ...props }, ref) => {
    const colors = useThemeColors();
    return (
      <Text
        ref={ref}
        style={[{ color: colors.textSecondary }, styles.description, style]}
        {...props}
      >
        {children}
      </Text>
    );
  },
);
CardDescription.displayName = 'CardDescription';

interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.md,
  },
});
