// apps/mobile/src/components/ui/RadioCard.tsx
// RadioCard component for React Native

import React, { createContext, useContext, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius } from '../../utils/theme';

interface RadioCardContextType {
  value: string | null;
  onValueChange: (value: string) => void;
}

const RadioCardContext = createContext<RadioCardContextType | null>(null);

interface RadioCardRootProps {
  children: React.ReactNode;
  value?: string | null;
  onValueChange?: (value: string) => void;
  style?: ViewStyle;
}

export const RadioCardRoot: React.FC<RadioCardRootProps> = ({
  children,
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  style,
}) => {
  const [internalValue, setInternalValue] = useState<string | null>(null);

  const isControlled = controlledValue !== undefined && controlledOnValueChange !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = isControlled ? controlledOnValueChange : setInternalValue;

  return (
    <RadioCardContext.Provider value={{ value, onValueChange: onValueChange! }}>
      <View style={[{ width: '100%' }, style]}>
        {children}
      </View>
    </RadioCardContext.Provider>
  );
};

interface RadioCardItemProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const RadioCardItem: React.FC<RadioCardItemProps> = ({
  children,
  value,
  style,
  disabled = false,
}) => {
  const context = useContext(RadioCardContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('RadioCardItem must be used within RadioCardRoot');
  }

  const { value: selectedValue, onValueChange } = context;
  const isSelected = selectedValue === value;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };

  const itemStyle = [
    styles.item,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    isSelected && {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={itemStyle}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {children}
      </View>
      {isSelected && (
        <View style={styles.indicator}>
          <View style={[styles.checkContainer, { backgroundColor: colors.primary }]}>
            <Check size={12} color={colors.background} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const RadioCard = {
  Root: RadioCardRoot,
  Item: RadioCardItem,
};

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
