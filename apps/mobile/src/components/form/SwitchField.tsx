// apps/mobile/src/components/form/SwitchField.tsx
// Reusable switch field component for React Native forms

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';

interface SwitchFieldProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelPosition?: 'left' | 'right';
  description?: string;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  value,
  onValueChange,
  error,
  helperText,
  disabled = false,
  containerStyle,
  labelPosition = 'left',
  description,
}) => {
  const colors = useThemeColors();
  const hasError = !!error;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const renderSwitch = () => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.border,
        true: colors.primary,
      }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.border}
    />
  );

  const renderLabel = () => (
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
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.switchContainer,
          hasError && { borderBottomWidth: 1, borderBottomColor: colors.error },
        ]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        {labelPosition === 'left' && renderLabel()}
        {renderSwitch()}
        {labelPosition === 'right' && renderLabel()}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
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
});
