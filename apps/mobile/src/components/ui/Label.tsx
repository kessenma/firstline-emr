// apps/mobile/src/components/ui/Label.tsx
// Label component matching web API for React Native

import React, { forwardRef } from 'react';
import {
  Text,
  TextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';

export interface LabelProps extends TextProps {
  className?: string;
  style?: StyleProp<TextStyle>;
  required?: boolean;
  disabled?: boolean;
  htmlFor?: string; // For web compatibility (ignored in mobile)
}

export const Label = forwardRef<Text, LabelProps>(
  (
    {
      className: _className,
      style,
      required = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const colors = useThemeColors();

    const labelStyles = [
      styles.label,
      {
        color: colors.text,
      },
      disabled && {
        opacity: 0.7,
      },
      style,
    ];

    return (
      <Text ref={ref} style={labelStyles} {...props}>
        {children}
        {required && (
          <Text style={{ color: colors.error }}> *</Text>
        )}
      </Text>
    );
  }
);

Label.displayName = 'Label';

const styles = StyleSheet.create({
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
});
