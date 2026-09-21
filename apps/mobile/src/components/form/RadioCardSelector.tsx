// apps/mobile/src/components/form/RadioCardSelector.tsx
// Reusable radio card selector component for React Native forms

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Check, Circle, ChevronDown } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../utils/theme';

interface RadioCardOption {
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface RadioCardSelectorProps {
  label?: string;
  options: RadioCardOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  direction?: 'vertical' | 'horizontal';
  size?: 'small' | 'medium' | 'large';
  /** Show only this many options initially, with a "Show more" toggle for the rest */
  collapsedCount?: number;
  /** Number of columns for a grid layout. Overrides direction. */
  columns?: number;
  /** When true, cards auto-size based on label length — short labels share a row, long labels take full width */
  autoFitColumns?: boolean;
}

export const RadioCardSelector: React.FC<RadioCardSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  containerStyle,
  direction = 'vertical',
  size = 'medium',
  collapsedCount,
  columns,
  autoFitColumns,
}) => {
  const colors = useThemeColors();
  const hasError = !!error;
  const [expanded, setExpanded] = useState(false);

  const getCardPadding = () => {
    switch (size) {
      case 'small':
        return spacing.sm;
      case 'large':
        return spacing.lg;
      default:
        return spacing.md;
    }
  };

  const cardPadding = getCardPadding();

  // Determine which options to show vs. hide behind "Show more"
  const shouldCollapse =
    collapsedCount != null && options.length > collapsedCount;
  const visibleOptions =
    shouldCollapse && !expanded ? options.slice(0, collapsedCount) : options;
  const hiddenCount = shouldCollapse ? options.length - collapsedCount : 0;

  // If the selected value is hidden, auto-expand so the user can see their selection
  const selectedIsHidden =
    shouldCollapse &&
    !expanded &&
    value != null &&
    !visibleOptions.some((o) => o.value === value);

  const effectiveVisible = selectedIsHidden ? options : visibleOptions;
  const effectiveExpanded = expanded || selectedIsHidden;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  // Determine per-card layout style for grid layouts
  const getCardGridStyle = (option: RadioCardOption) => {
    if (columns) {
      // Fixed columns using flexBasis + flexGrow so gap is handled by the container
      return {
        flexBasis: `${(100 / columns) - 2}%` as any,
        flexGrow: 1,
        flexShrink: 0,
      };
    }
    if (autoFitColumns) {
      const isShort = option.label.length <= 15;
      if (isShort) {
        return {
          flexBasis: '46%' as any,
          flexGrow: 1,
          flexShrink: 0,
        };
      }
      // Full-width card — center the content
      return {
        flexBasis: '100%' as any,
        alignItems: 'center' as const,
      };
    }
    return undefined;
  };

  const useGridLayout = !!(columns || autoFitColumns);

  const renderCard = (option: RadioCardOption) => {
    const isSelected = value === option.value;
    const isDisabled = option.disabled || false;
    const gridStyle = getCardGridStyle(option);

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.card,
          {
            padding: cardPadding,
            backgroundColor: isSelected
              ? colors.primary + '10'
              : colors.surface,
            borderColor: hasError
              ? colors.error
              : isSelected
              ? colors.primary
              : colors.border,
          },
          isDisabled && {
            opacity: 0.5,
            backgroundColor: colors.backgroundSecondary,
          },
          direction === 'horizontal' && !useGridLayout && styles.cardHorizontal,
          gridStyle,
        ]}
        onPress={() => !isDisabled && onChange(option.value)}
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
      >
        <View style={styles.cardContent}>
          {option.icon && (
            <View style={styles.iconContainer}>{option.icon}</View>
          )}

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.optionLabel,
                { color: colors.text },
                isDisabled && styles.disabledText,
              ]}
            >
              {option.label}
            </Text>
            {option.description && (
              <Text
                style={[
                  styles.optionDescription,
                  { color: colors.textSecondary },
                  isDisabled && styles.disabledText,
                ]}
              >
                {option.description}
              </Text>
            )}
          </View>

          <View style={styles.radioContainer}>
            {isSelected ? (
              <View
                style={[
                  styles.radioSelected,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Check size={14} color={colors.surface} strokeWidth={3} />
              </View>
            ) : (
              <View style={styles.radioUnselected}>
                <Circle size={20} color={colors.border} strokeWidth={2} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && <Text style={{ color: colors.error }}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.cardsContainer,
          direction === 'horizontal' && !useGridLayout && styles.cardsContainerHorizontal,
          useGridLayout && styles.cardsContainerGrid,
        ]}
      >
        {effectiveVisible.map(renderCard)}
      </View>

      {shouldCollapse && (
        <TouchableOpacity
          onPress={toggleExpanded}
          style={[styles.showMoreButton, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.showMoreText, { color: colors.primary }]}>
            {effectiveExpanded
              ? 'Show less'
              : `Show ${hiddenCount} more`}
          </Text>
          <ChevronDown
            size={16}
            color={colors.primary}
            style={effectiveExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        </TouchableOpacity>
      )}

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

// Simple Radio Group (non-card version)
interface RadioGroupProps {
  label?: string;
  options: Array<{
    label: string;
    value: string;
    disabled?: boolean;
  }>;
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  direction?: 'vertical' | 'horizontal';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  containerStyle,
  direction = 'vertical',
}) => {
  const colors = useThemeColors();
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && <Text style={{ color: colors.error }}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.radioGroupContainer,
          direction === 'horizontal' && styles.radioGroupHorizontal,
        ]}
      >
        {options.map(option => {
          const isSelected = value === option.value;
          const isDisabled = option.disabled || false;

          return (
            <TouchableOpacity
              key={option.value}
              style={styles.radioOption}
              onPress={() => !isDisabled && onChange(option.value)}
              activeOpacity={isDisabled ? 1 : 0.7}
              disabled={isDisabled}
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                  isDisabled && {
                    opacity: 0.5,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.radioLabel,
                  { color: colors.text },
                  isDisabled && styles.disabledText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  labelContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  cardsContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    ...shadows.sm,
  },
  cardHorizontal: {
    flex: 1,
    minWidth: '45%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  radioContainer: {
    marginLeft: spacing.md,
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledText: {
    opacity: 0.5,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  showMoreText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  // Radio Group (Simple) Styles
  radioGroupContainer: {
    gap: spacing.md,
  },
  radioGroupHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: typography.fontSize.base,
  },
});
