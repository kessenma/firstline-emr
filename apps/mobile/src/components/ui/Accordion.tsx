// apps/mobile/src/components/ui/Accordion.tsx
// Reusable Accordion component for React Native

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  icon?: React.ReactNode;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  isOpen = false,
  onToggle,
  icon,
  headerStyle,
  contentStyle,
  disabled = false,
}) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(isOpen);
  const rotateAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  const toggleExpand = () => {
    if (disabled) return;

    const newExpanded = !expanded;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(newExpanded);

    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onToggle?.();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.accordionItem,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.header,
          { backgroundColor: colors.surface },
          disabled && styles.disabled,
          headerStyle,
        ]}
        onPress={toggleExpand}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View
          style={[
            styles.content,
            { backgroundColor: colors.backgroundSecondary },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
};

interface AccordionProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  style,
}) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const handleToggle = (index: number) => {
    if (allowMultiple) {
      setOpenIndexes(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
      );
    } else {
      setOpenIndexes(prev => (prev.includes(index) ? [] : [index]));
    }
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.accordion, style]}>
      {childrenArray.map((child, index) => {
        if (React.isValidElement(child) && child.type === AccordionItem) {
          return React.cloneElement(
            child as React.ReactElement<AccordionItemProps>,
            {
              key: index,
              isOpen: openIndexes.includes(index),
              onToggle: () => handleToggle(index),
            },
          );
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  accordion: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  accordionItem: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
});
