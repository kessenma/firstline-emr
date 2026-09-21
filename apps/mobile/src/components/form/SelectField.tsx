// apps/mobile/src/components/form/SelectField.tsx
// Reusable select field components (single and multi) for React Native forms

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronDown, Check, X, Search } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface SingleSelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SingleSelectField: React.FC<SingleSelectFieldProps> = ({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  searchable = false,
  containerStyle,
}) => {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hasError = !!error;
  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: any) => {
    e.stopPropagation();
    onChange('');
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

      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            borderColor: hasError ? colors.error : colors.border,
            backgroundColor: disabled
              ? colors.backgroundSecondary
              : colors.surface,
          },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectText,
            { color: selectedOption ? colors.text : colors.textSecondary },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>

        <View style={styles.iconContainer}>
          {value && !disabled && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <ChevronDown size={20} color={colors.textSecondary} />
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

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.divider },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {label || 'Select'}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

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

            <FlatList
              data={filteredOptions}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      borderBottomColor: colors.divider,
                      backgroundColor:
                        item.value === value
                          ? colors.primary + '10'
                          : 'transparent',
                    },
                    item.disabled && { opacity: 0.5 },
                  ]}
                  onPress={() => !item.disabled && handleSelect(item.value)}
                  disabled={item.disabled}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.text },
                          item.disabled && styles.disabledText,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.description && (
                        <Text
                          style={[
                            styles.optionDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {item.value === value && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No options found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface MultiSelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  maxSelections?: number;
}

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  label,
  placeholder = 'Select options',
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  searchable = false,
  containerStyle,
  maxSelections,
}) => {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hasError = !!error;
  const selectedOptions = options.filter(opt => value.includes(opt.value));
  const selectedCount = value.length;

  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return;
      }
      onChange([...value, optionValue]);
    }
  };

  const handleClear = (e: any) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleRemoveTag = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const displayText = () => {
    if (selectedCount === 0) return placeholder;
    if (selectedCount === 1) return selectedOptions[0].label;
    return `${selectedCount} selected`;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && <Text style={{ color: colors.error }}> *</Text>}
            {maxSelections && (
              <Text style={[styles.maxText, { color: colors.textSecondary }]}>
                {' '}
                (Max: {maxSelections})
              </Text>
            )}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            borderColor: hasError ? colors.error : colors.border,
            backgroundColor: disabled
              ? colors.backgroundSecondary
              : colors.surface,
          },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectText,
            { color: selectedCount > 0 ? colors.text : colors.textSecondary },
          ]}
        >
          {displayText()}
        </Text>

        <View style={styles.iconContainer}>
          {selectedCount > 0 && !disabled && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <ChevronDown size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {selectedCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsContainer}
          contentContainerStyle={styles.tagsContent}
        >
          {selectedOptions.map(option => (
            <View
              key={option.value}
              style={[styles.tag, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {option.label}
              </Text>
              {!disabled && (
                <TouchableOpacity
                  onPress={() => handleRemoveTag(option.value)}
                  style={styles.tagClose}
                >
                  <X size={12} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
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

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.divider },
              ]}
            >
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {label || 'Select'}
                </Text>
                {maxSelections && (
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {selectedCount} of {maxSelections} selected
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

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

            <FlatList
              data={filteredOptions}
              keyExtractor={item => item.value}
              renderItem={({ item }) => {
                const isSelected = value.includes(item.value);
                const isMaxReached =
                  maxSelections !== undefined &&
                  selectedCount >= maxSelections &&
                  !isSelected;

                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        borderBottomColor: colors.divider,
                        backgroundColor: isSelected
                          ? colors.primary + '10'
                          : 'transparent',
                      },
                      (item.disabled || isMaxReached) && { opacity: 0.5 },
                    ]}
                    onPress={() =>
                      !item.disabled &&
                      !isMaxReached &&
                      handleToggle(item.value)
                    }
                    disabled={item.disabled || isMaxReached}
                  >
                    <View style={styles.optionContent}>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surface,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Check
                            size={14}
                            color={colors.surface}
                            strokeWidth={3}
                          />
                        )}
                      </View>

                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionText,
                            { color: colors.text },
                            (item.disabled || isMaxReached) &&
                              styles.disabledText,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.description && (
                          <Text
                            style={[
                              styles.optionDescription,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No options found
                  </Text>
                </View>
              }
            />

            <View
              style={[styles.modalFooter, { borderTopColor: colors.divider }]}
            >
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setIsOpen(false)}
              >
                <Text
                  style={[styles.footerButtonText, { color: colors.surface }]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  maxText: {
    fontSize: typography.fontSize.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  selectText: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  tagsContainer: {
    marginTop: spacing.sm,
    maxHeight: 100,
  },
  tagsContent: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    gap: spacing.xs,
  },
  tagText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  tagClose: {
    padding: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
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
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
