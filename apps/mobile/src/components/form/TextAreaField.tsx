// apps/mobile/src/components/form/TextAreaField.tsx
// Reusable multi-line text input (textarea) field component for React Native forms

import React, { useState, useCallback, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useInsideBottomSheet } from '../BottomSheet';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface TextAreaFieldProps extends Omit<TextInputProps, 'multiline'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'filled';
  minHeight?: number;
  maxHeight?: number;
  showCharacterCount?: boolean;
  maxCharacters?: number;
  /** When true, the field is non-editable with a muted background. */
  readOnly?: boolean;
}

export const TextAreaField = React.memo(forwardRef<TextInput, TextAreaFieldProps>(({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  inputStyle,
  variant = 'outlined',
  minHeight = 100,
  maxHeight,
  showCharacterCount = false,
  maxCharacters,
  readOnly = false,
  value,
  onChangeText,
  ...textInputProps
}, ref) => {
  const colors = useThemeColors();
  const insideBottomSheet = useInsideBottomSheet();
  const InputComponent = insideBottomSheet ? BottomSheetTextInput : TextInput;
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const characterCount = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxCharacters ? characterCount > maxCharacters : false;

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
    {
      minHeight,
      maxHeight,
    },
  ];

  const inputStyles = [
    styles.input,
    {
      color: colors.text,
      fontSize: typography.fontSize.base,
    },
    inputStyle,
  ];

  const handleChangeText = useCallback((text: string) => {
    if (maxCharacters && text.length > maxCharacters) {
      return; // Don't allow input beyond max characters
    }
    onChangeText?.(text);
  }, [maxCharacters, onChangeText]);

  return (
    <View style={containerStyles}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: hasError ? colors.error : colors.text,
              fontSize: typography.fontSize.sm,
            },
          ]}
        >
          {label}
          {required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
        </Text>
      )}

      <View style={inputContainerStyles}>
        <InputComponent
          ref={ref as any}
          {...textInputProps}
          value={value}
          onChangeText={handleChangeText}
          multiline
          textAlignVertical="top"
          style={inputStyles}
          placeholderTextColor={colors.textTertiary}
          editable={!readOnly}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
      </View>

      <View style={styles.footer}>
        {(error || helperText) && (
          <Text
            style={[
              styles.helperText,
              {
                color: hasError ? colors.error : colors.textSecondary,
                fontSize: typography.fontSize.xs,
              },
            ]}
          >
            {error || helperText}
          </Text>
        )}

        {showCharacterCount && (
          <Text
            style={[
              styles.characterCount,
              {
                color: isOverLimit ? colors.error : colors.textSecondary,
                fontSize: typography.fontSize.xs,
              },
            ]}
          >
            {characterCount}
            {maxCharacters && ` / ${maxCharacters}`}
          </Text>
        )}
      </View>
    </View>
  );
}));
TextAreaField.displayName = 'TextAreaField';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    // color set inline via colors.error
  },
  inputContainer: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    paddingVertical: spacing.xs,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  helperText: {
    flex: 1,
  },
  characterCount: {
    marginLeft: spacing.sm,
  },
});

export default TextAreaField;
