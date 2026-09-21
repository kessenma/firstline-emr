// apps/mobile/src/components/form/CheckboxField.tsx
// Reusable checkbox field component for React Native forms

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface CheckboxFieldProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  description?: string;
  size?: 'small' | 'medium' | 'large';
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  value,
  onValueChange,
  error,
  helperText,
  disabled = false,
  containerStyle,
  description,
  size = 'medium',
}) => {
  const colors = useThemeColors();
  const hasError = !!error;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const getCheckboxSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 28;
      default:
        return 24;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const checkboxSize = getCheckboxSize();
  const iconSize = getIconSize();

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.checkboxContainer, hasError && styles.error]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <View
          style={[
            styles.checkbox,
            {
              width: checkboxSize,
              height: checkboxSize,
              borderColor: hasError ? colors.error : colors.border,
              backgroundColor: value ? colors.primary : colors.surface,
            },
            disabled && {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              opacity: 0.5,
            },
          ]}
        >
          {value && (
            <Check
              size={iconSize}
              color={disabled ? colors.textTertiary : colors.surface}
              strokeWidth={3}
            />
          )}
        </View>

        <View style={styles.labelContainer}>
          {label && (
            <Text
              style={[
                styles.label,
                { color: colors.text },
                disabled && styles.disabledText,
              ]}
            >
              {label}
            </Text>
          )}
          {description && (
            <Text
              style={[
                styles.description,
                { color: colors.textSecondary },
                disabled && styles.disabledText,
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: hasError ? colors.error : colors.textSecondary },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

// Checkbox Group Component
interface CheckboxGroupProps {
  label?: string;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
  }>;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  containerStyle,
  required = false,
}) => {
  const colors = useThemeColors();

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const hasError = !!error;

  return (
    <View style={[styles.groupContainer, containerStyle]}>
      {label && (
        <View style={styles.groupLabelContainer}>
          <Text style={[styles.groupLabel, { color: colors.text }]}>
            {label}
            {required && <Text style={{ color: colors.error }}> *</Text>}
          </Text>
        </View>
      )}

      <View style={styles.optionsContainer}>
        {options.map(option => (
          <CheckboxField
            key={option.value}
            label={option.label}
            description={option.description}
            value={value.includes(option.value)}
            onValueChange={() => handleToggle(option.value)}
            disabled={option.disabled}
            containerStyle={styles.optionItem}
          />
        ))}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: hasError ? colors.error : colors.textSecondary },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  error: {
    borderBottomWidth: 1,
  },
  checkbox: {
    borderWidth: 2,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  labelContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  disabledText: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  groupContainer: {
    marginBottom: spacing.md,
  },
  groupLabelContainer: {
    marginBottom: spacing.sm,
  },
  groupLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  optionsContainer: {
    gap: spacing.xs,
  },
  optionItem: {
    marginBottom: 0,
  },
});
