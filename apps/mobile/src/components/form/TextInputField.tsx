// apps/mobile/src/components/form/TextInputField.tsx
// Reusable text input field component for React Native forms

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Eye, EyeOff } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useInsideBottomSheet } from '../BottomSheet';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface TextInputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'filled';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  /** When true, the field is non-editable with a muted background. */
  readOnly?: boolean;
}

export const TextInputField: React.FC<TextInputFieldProps> = React.memo(({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  inputStyle,
  variant = 'outlined',
  leftIcon,
  rightIcon,
  isPassword = false,
  readOnly = false,
  secureTextEntry,
  ...textInputProps
}) => {
  const colors = useThemeColors();
  const insideBottomSheet = useInsideBottomSheet();
  const InputComponent = insideBottomSheet ? BottomSheetTextInput : TextInput;
  const [isSecure, setIsSecure] = useState(isPassword || secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const showPasswordToggle = isPassword || secureTextEntry;

  const containerStyles = [styles.container, containerStyle];

  const inputContainerStyles = [
    styles.inputContainer,
    variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    variant === 'filled' && {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 0,
    },
    !readOnly && isFocused && {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    hasError && {
      borderColor: colors.error,
    },
    readOnly && {
      backgroundColor: colors.surfaceSecondary,
      opacity: 0.8,
    },
  ];

  const inputStyles = [
    styles.input,
    {
      color: colors.text,
      fontSize: typography.fontSize.base,
    },
    leftIcon && styles.inputWithLeftIcon,
    (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
    inputStyle,
  ].filter(Boolean) as any;

  return (
    <View style={containerStyles}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && (
              <Text style={[styles.required, { color: colors.error }]}> *</Text>
            )}
          </Text>
        </View>
      )}

      <View style={inputContainerStyles}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <InputComponent
          style={inputStyles}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isSecure}
          editable={!readOnly}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />

        {showPasswordToggle ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            {isSecure ? (
              <EyeOff size={20} color={colors.textSecondary} />
            ) : (
              <Eye size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIconContainer}>{rightIcon}</View>
        ) : null}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: colors.textSecondary },
            hasError && { color: colors.error },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
});
TextInputField.displayName = 'TextInputField';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  required: {
    // Color applied inline
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  leftIconContainer: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    paddingRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});
