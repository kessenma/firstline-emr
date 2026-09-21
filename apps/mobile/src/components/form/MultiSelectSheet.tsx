// apps/mobile/src/components/form/MultiSelectSheet.tsx
// Generic multi-select bottom sheet component for profile pickers

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { BottomSheet, BottomSheetFlatList } from '../BottomSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

export interface MultiSelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  /** When defined, shows a green (true) or red (false) availability dot */
  available?: boolean;
}

interface MultiSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  searchable?: boolean;
  minSelections?: number;
  maxSelections?: number;
  snapPoint?: number;
  /** Show green/red availability dots when options have the `available` field set */
  showAvailabilityIndicators?: boolean;
}

export const MultiSelectSheet: React.FC<MultiSelectSheetProps> = ({
  visible,
  onClose,
  title,
  options,
  selectedValues,
  onSelectionChange,
  searchable = true,
  minSelections = 0,
  maxSelections,
  snapPoint = 70,
  showAvailabilityIndicators = false,
}) => {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleToggle = (value: string) => {
    const isSelected = selectedValues.includes(value);

    if (isSelected) {
      // Check min selections before removing
      if (selectedValues.length > minSelections) {
        onSelectionChange(selectedValues.filter(v => v !== value));
      }
    } else {
      // Check max selections before adding
      if (!maxSelections || selectedValues.length < maxSelections) {
        onSelectionChange([...selectedValues, value]);
      }
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const renderOption = ({ item }: { item: MultiSelectOption }) => {
    const isSelected = selectedValues.includes(item.value);
    const isMaxReached =
      maxSelections !== undefined &&
      selectedValues.length >= maxSelections &&
      !isSelected;
    const cannotRemove =
      isSelected && selectedValues.length <= minSelections;

    return (
      <TouchableOpacity
        style={[
          styles.option,
          {
            borderBottomColor: colors.divider,
            backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
          },
          (item.disabled || isMaxReached) && { opacity: 0.5 },
        ]}
        onPress={() => !item.disabled && !isMaxReached && handleToggle(item.value)}
        disabled={item.disabled || isMaxReached || cannotRemove}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.surface,
              },
            ]}
          >
            {isSelected && (
              <Check size={14} color={colors.surface} strokeWidth={3} />
            )}
          </View>

          {showAvailabilityIndicators && item.available !== undefined && (
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: item.available ? '#22c55e' : '#ef4444' },
              ]}
            />
          )}

          <View style={styles.optionTextContainer}>
            <Text
              style={[
                styles.optionText,
                { color: colors.text },
                (item.disabled || isMaxReached) && styles.disabledText,
              ]}
            >
              {item.label}
            </Text>
            {item.description && (
              <Text
                style={[styles.optionDescription, { color: colors.textSecondary }]}
              >
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={title}
      snapPoint={snapPoint}
      showHandle={true}
      showCloseButton={true}
      rawContent
    >
      <View style={styles.content}>
        {/* Selection count */}
        <View style={styles.selectionInfo}>
          <Text style={[styles.selectionCount, { color: colors.textSecondary }]}>
            {selectedValues.length} selected
            {maxSelections && ` (max ${maxSelections})`}
            {minSelections > 0 && ` (min ${minSelections})`}
          </Text>
          {showAvailabilityIndicators && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Doctors Available
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  No Doctors
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Search */}
        {searchable && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Options list */}
        <BottomSheetFlatList
          data={filteredOptions}
          keyExtractor={(item: MultiSelectOption) => item.value}
          renderItem={renderOption}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No options found
              </Text>
            </View>
          }
        />

        {/* Done button */}
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={handleClose}
        >
          <Text style={[styles.doneButtonText, { color: colors.surface }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  selectionInfo: {
    paddingBottom: spacing.sm,
  },
  selectionCount: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: typography.fontSize.base,
    marginLeft: spacing.sm,
  },
  list: {
    flex: 1,
    marginHorizontal: -spacing.lg,
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  disabledText: {
    opacity: 0.5,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  doneButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default MultiSelectSheet;
