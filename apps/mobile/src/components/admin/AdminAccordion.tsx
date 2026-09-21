// apps/mobile/src/components/admin/AdminAccordion.tsx
// Admin-specific Accordion component with enhanced features

import React, { useState, useRef, useEffect } from 'react';
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
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { ChevronDown, LucideIcon } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AdminAccordionItemProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  icon?: LucideIcon;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
  badge?: string | number;
  searchTerm?: string;
  subtitle?: string;
}

export const AdminAccordionItem: React.FC<AdminAccordionItemProps> = ({
  id: _id,
  title,
  children,
  isOpen = false,
  onToggle,
  icon: Icon,
  headerStyle,
  contentStyle,
  titleStyle,
  disabled = false,
  loading = false,
  badge,
  searchTerm,
  subtitle,
}) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(isOpen);
  const rotateAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  // Sync with external isOpen prop
  useEffect(() => {
    if (isOpen !== expanded) {
      setExpanded(isOpen);
      Animated.timing(rotateAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, expanded, rotateAnim]);

  const toggleExpand = () => {
    if (disabled || loading) return;

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

  // Highlight search term in title
  const renderTitle = () => {
    if (
      !searchTerm ||
      !title.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return (
        <Text style={[styles.title, { color: colors.text }, titleStyle]}>
          {title}
        </Text>
      );
    }

    const parts = title.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <Text style={[styles.title, { color: colors.text }, titleStyle]}>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <Text
              key={index}
              style={[
                styles.highlightedText,
                { backgroundColor: colors.primary, color: colors.surface },
              ]}
            >
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          ),
        )}
      </Text>
    );
  };

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
        disabled={disabled || loading}
      >
        {/* Icon */}
        {Icon && (
          <View style={styles.iconContainer}>
            <Icon size={22} color={colors.primary} />
          </View>
        )}

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          {renderTitle()}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Badge */}
        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>{badge}</Text>
          </View>
        )}

        {/* Loading or Chevron */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Content */}
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

interface AdminAccordionProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  style?: StyleProp<ViewStyle>;
  defaultOpenId?: string;
  onSectionChange?: (openId: string | null) => void;
}

export const AdminAccordion: React.FC<AdminAccordionProps> = ({
  children,
  allowMultiple = false,
  style,
  defaultOpenId,
  onSectionChange,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : [],
  );

  const handleToggle = (id: string) => {
    let newOpenIds: string[];

    if (allowMultiple) {
      newOpenIds = openIds.includes(id)
        ? openIds.filter(i => i !== id)
        : [...openIds, id];
    } else {
      newOpenIds = openIds.includes(id) ? [] : [id];
    }

    setOpenIds(newOpenIds);
    onSectionChange?.(newOpenIds.length > 0 ? newOpenIds[0] : null);
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.accordion, style]}>
      {childrenArray.map((child, index) => {
        if (React.isValidElement(child) && child.type === AdminAccordionItem) {
          const childProps = child.props as AdminAccordionItemProps;
          return React.cloneElement(
            child as React.ReactElement<AdminAccordionItemProps>,
            {
              key: childProps.id || index,
              isOpen: openIds.includes(childProps.id),
              onToggle: () => handleToggle(childProps.id),
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
    minHeight: 60,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: spacing.md,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * 1.3,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
    lineHeight: typography.fontSize.sm * 1.3,
  },
  highlightedText: {
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
});
