// apps/mobile/src/components/ui/Tabs.tsx
// Tabs component for React Native

import React, { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

type TabsVariant = 'default' | 'styled' | 'underline' | 'pills' | 'chip';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
  activeColor?: string;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  variant?: TabsVariant;
  activeColor?: string;
  style?: any;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  children,
  variant = 'default',
  activeColor,
  style,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  const isControlled = controlledValue !== undefined && controlledOnValueChange !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = isControlled ? controlledOnValueChange : setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange, variant, activeColor }}>
      <View style={style}>
        {children}
      </View>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  style?: any;
}

export const TabsList: React.FC<TabsListProps> = ({ children, style }) => {
  const context = useContext(TabsContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('TabsList must be used within Tabs');
  }

  const { variant } = context;

  const getListStyle = () => {
    // Only non-layout styles go on ScrollView's style prop
    switch (variant) {
      case 'styled':
        return { width: '100%' as const };
      case 'underline':
        return {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        };
      case 'pills':
        return {};
      case 'chip':
        return { flexGrow: 0, flexShrink: 0 };
      default:
        return {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: borderRadius.md,
        };
    }
  };

  const getContentContainerStyle = () => {
    // Layout styles (flexDirection, alignItems, gap, padding) go on contentContainerStyle
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    };

    switch (variant) {
      case 'pills':
        return {
          ...baseStyle,
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
        };
      case 'chip':
        return {
          ...baseStyle,
          flexGrow: 1,
          justifyContent: 'center' as const,
          gap: spacing.xs,
          paddingVertical: spacing.sm,
        };
      default:
        return {
          ...baseStyle,
          padding: variant === 'default' ? spacing.xs : undefined,
        };
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[getListStyle(), style]}
      contentContainerStyle={getContentContainerStyle()}
    >
      {children}
    </ScrollView>
  );
};

interface TabsTriggerProps {
  value: string;
  children?: React.ReactNode;
  label?: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  style?: any;
  disabled?: boolean;
  showCheckmark?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  label,
  icon: Icon,
  style,
  disabled = false,
  showCheckmark = false,
}) => {
  const context = useContext(TabsContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }

  const { value: selectedValue, onValueChange, variant, activeColor } = context;
  const isSelected = selectedValue === value;
  const chipColor = activeColor || colors.primary;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };

  const getTriggerStyle = () => {
    const baseStyle = {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
      case 'styled':
        return {
          ...baseStyle,
          flex: 1,
          borderWidth: 1,
          borderRadius: borderRadius.lg,
          marginHorizontal: 2,
          backgroundColor: isSelected ? colors.surface : 'transparent',
          borderColor: isSelected ? 'transparent' : colors.border,
        };
      case 'underline':
        return {
          ...baseStyle,
          borderBottomWidth: 2,
          borderBottomColor: isSelected ? colors.primary : 'transparent',
          borderRadius: 0,
          paddingHorizontal: spacing.lg,
        };
      case 'pills':
        return {
          ...baseStyle,
          backgroundColor: isSelected ? colors.primary : 'transparent',
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.lg,
        };
      case 'chip':
        return {
          ...baseStyle,
          flexDirection: 'row' as const,
          paddingVertical: 6,
          borderRadius: borderRadius.pill,
          borderWidth: 1,
          borderColor: isSelected ? chipColor : colors.border,
          backgroundColor: isSelected ? chipColor + '15' : colors.surface,
          gap: 4,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: isSelected ? colors.surface : 'transparent',
        };
    }
  };

  const renderContent = () => {
    if (children) return children;
    if (!label) return null;
    const textColor = variant === 'chip'
      ? (isSelected ? chipColor : colors.textSecondary)
      : (isSelected ? colors.text : colors.textSecondary);
    return (
      <>
        {Icon && <Icon size={14} color={textColor} />}
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: textColor }}>
          {label}
        </Text>
      </>
    );
  };

  return (
    <TouchableOpacity
      style={[getTriggerStyle(), style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {renderContent()}
      {showCheckmark && variant === 'styled' && isSelected && (
        <View style={styles.checkmark}>
          <View style={[styles.checkmarkCircle, { backgroundColor: colors.primary }]}>
            <View style={styles.checkIcon}>
              <View style={[styles.checkmarkLine1, { backgroundColor: colors.background }]} />
              <View style={[styles.checkmarkLine2, { backgroundColor: colors.background }]} />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  style?: any;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, style }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  const { value: selectedValue } = context;

  if (selectedValue !== value) {
    return null;
  }

  return (
    <View style={[{ marginTop: spacing.md }, style]}>
      {children}
    </View>
  );
};

// Legacy exports for backward compatibility with styled-tabs
export const StyledTabs = {
  Root: (props: Omit<TabsProps, 'variant'>) => <Tabs {...props} variant="styled" />,
  List: TabsList,
  Trigger: (props: TabsTriggerProps) => <TabsTrigger {...props} showCheckmark />,
  Content: TabsContent,
};

const styles = StyleSheet.create({
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 8,
    height: 6,
    position: 'relative',
  },
  checkmarkLine1: {
    position: 'absolute',
    width: 2,
    height: 6,
    left: 3,
    top: 0,
    transform: [{ rotate: '45deg' }],
  },
  checkmarkLine2: {
    position: 'absolute',
    width: 4,
    height: 2,
    left: 2,
    top: 4,
    transform: [{ rotate: '45deg' }],
  },
});
