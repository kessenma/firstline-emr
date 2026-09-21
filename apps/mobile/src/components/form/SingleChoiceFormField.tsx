// apps/mobile/src/components/form/SingleChoiceFormField.tsx
// SingleChoiceFormField component for React Native

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { ChevronsUpDown, Check } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../utils/theme';

// Optional react-hook-form integration
let useFormContext: any = null;
let Controller: any = null;
try {
  const hookForm = require('react-hook-form');
  useFormContext = hookForm.useFormContext;
  Controller = hookForm.Controller;
} catch {
  // react-hook-form not available, will use fallback
}

const { height: screenHeight } = Dimensions.get('window');

interface SingleChoiceFormFieldProps {
  fieldName: string;
  fieldLabel?: string;
  choices: string[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SingleChoiceFormField({
  fieldName,
  fieldLabel,
  choices,
  value: propValue,
  onChange: propOnChange,
  disabled = false,
  className: _className,
}: SingleChoiceFormFieldProps) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add a safety check for undefined choices
  const safeChoices = choices || ["Female", "Male", "No Preference"];

  const filteredChoices = safeChoices.filter((choice) =>
    choice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formContext = useFormContext();

  const handleSelect = useCallback(
    (selectedChoice: string, fieldOnChange: (value: string) => void) => {
      fieldOnChange(selectedChoice);
      if (propOnChange) {
        propOnChange(selectedChoice);
      }
      setModalVisible(false);
      setSearchQuery("");
    },
    [propOnChange],
  );

  const renderField = ({ field }: { field: { value: string; onChange: (value: string) => void } }) => (
    <View style={styles.container}>
      {fieldLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {fieldLabel}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          !field.value && { borderColor: colors.border },
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            {
              color: field.value ? colors.text : colors.textSecondary,
            },
          ]}
        >
          {field.value || `Select ${fieldLabel || "option"}`}
        </Text>
        <ChevronsUpDown size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select {fieldLabel || "Option"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search input for large choice lists */}
            {safeChoices.length >= 10 && (
              <View style={[styles.searchContainer, { borderColor: colors.border }]}>
                <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
                  Search {fieldLabel?.toLowerCase() || "option"}...
                </Text>
              </View>
            )}

            <ScrollView style={styles.choicesList} showsVerticalScrollIndicator={false}>
              {filteredChoices.map((choice) => (
                <TouchableOpacity
                  key={choice}
                  style={[
                    styles.choiceItem,
                    field.value === choice && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleSelect(choice, field.onChange)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      {
                        color: field.value === choice ? colors.background : colors.text,
                      },
                    ]}
                  >
                    {choice}
                  </Text>
                  {field.value === choice && (
                    <Check size={16} color={colors.background} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (formContext) {
    return <Controller control={formContext.control} name={fieldName} render={renderField} />;
  }

  // Fallback for cases where FormProvider is not available
  return renderField({ field: { value: propValue || "", onChange: propOnChange || (() => {}) } });
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  trigger: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    maxHeight: screenHeight * 0.7,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  closeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  searchContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  searchPlaceholder: {
    fontSize: typography.fontSize.sm,
  },
  choicesList: {
    maxHeight: screenHeight * 0.5,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  choiceText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
});
