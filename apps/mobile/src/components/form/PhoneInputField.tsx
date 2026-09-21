// apps/mobile/src/components/form/PhoneInputField.tsx
// Phone number input field with country code dropdown and formatting for React Native forms

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Phone, ChevronDown } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { CountryCodesWithNames } from '../../constants/countryCodes';

interface PhoneInputFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'outlined' | 'filled';
}

// Format phone number as (xxx) xxx-xxxx for US numbers
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

// Remove formatting from phone number
const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  variant = 'outlined',
}) => {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [displayPhone, setDisplayPhone] = useState(formatPhoneNumber(phoneNumber));

  // Update display phone when phoneNumber prop changes
  useEffect(() => {
    setDisplayPhone(formatPhoneNumber(phoneNumber));
  }, [phoneNumber]);

  const hasError = !!error;

  const containerStyles = [styles.container, containerStyle];

  const getInputContainerStyles = (fieldIsFocused: boolean) => [
    styles.inputContainer,
    variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    variant === 'filled' && {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 0,
    },
    fieldIsFocused && {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    hasError && {
      borderColor: colors.error,
    },
  ];

  const inputStyles = {
    color: colors.text,
    fontSize: typography.fontSize.base,
  };

  const handlePhoneNumberChange = (text: string) => {
    const cleaned = unformatPhoneNumber(text);
    const limited = cleaned.slice(0, 10); // Limit to 10 digits

    setDisplayPhone(formatPhoneNumber(limited));
    onPhoneNumberChange(limited);
  };

  const handleCountryCodeSelect = (code: string) => {
    onCountryCodeChange(code);
    setShowPicker(false);
  };

  return (
    <View style={containerStyles}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: hasError ? colors.error : colors.text,
              fontSize: typography.fontSize.sm,
            },
          ]}
        >
          {label}
          {required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
        </Text>
      )}

      <View style={styles.phoneContainer}>
        {/* Country Code Picker */}
        <TouchableOpacity
          style={[getInputContainerStyles(false), styles.countryCodeContainer]}
          onPress={() => !disabled && setShowPicker(true)}
          disabled={disabled}
        >
          <Phone size={18} color={colors.textSecondary} />
          <Text style={[styles.countryCodeText, { color: colors.text }]}>
            {countryCode || '+1'}
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <View style={[getInputContainerStyles(isFocused), styles.phoneNumberContainer]}>
          <TextInput
            value={displayPhone}
            onChangeText={handlePhoneNumberChange}
            placeholder="(555) 555-5555"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            editable={!disabled}
            style={[styles.phoneNumberInput, inputStyles]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            {
              color: hasError ? colors.error : colors.textSecondary,
              fontSize: typography.fontSize.xs,
            },
          ]}
        >
          {error || helperText}
        </Text>
      )}

      {/* Country Code Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Country Code
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CountryCodesWithNames}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    item.code === countryCode && { backgroundColor: colors.backgroundSecondary },
                  ]}
                  onPress={() => handleCountryCodeSelect(item.code)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>
                    {item.code}
                  </Text>
                  <Text style={[styles.pickerItemName, { color: colors.textSecondary }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
  label: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    // color set inline via colors.error
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeContainer: {
    width: 110,
    gap: spacing.xs,
  },
  countryCodeText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  phoneNumberContainer: {
    flex: 1,
  },
  phoneNumberInput: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  helperText: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    // borderBottomColor set inline via colors.border
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  modalClose: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    width: 60,
  },
  pickerItemName: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
});

export default PhoneInputField;
