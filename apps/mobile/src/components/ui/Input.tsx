// apps/mobile/src/components/ui/Input.tsx
// Input component matching web API for React Native

import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  className?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      className: _className,
      style,
      containerStyle: _containerStyle,
      error = false,
      disabled = false,
      editable,
      ...props
    },
    ref
  ) => {
    const colors = useThemeColors();

    const inputStyles = [
      styles.input,
      {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
      },
      error && {
        borderColor: colors.error,
      },
      disabled && {
        opacity: 0.5,
        backgroundColor: colors.surfaceSecondary,
      },
      style,
    ];

    return (
      <TextInput
        ref={ref}
        style={inputStyles}
        placeholderTextColor={colors.textTertiary}
        editable={editable ?? !disabled}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: '100%',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
});
