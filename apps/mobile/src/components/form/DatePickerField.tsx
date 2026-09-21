/**
 * Enhanced DatePickerField for React Native
 * Matches web functionality with year/month selection and improved UX
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StyleProp,
  ViewStyle,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { format, parse, isValid, startOfDay } from 'date-fns';

interface DatePickerFieldProps {
  label?: string;
  value?: Date | null;
  onChange?: (date: Date) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  type?: 'future' | 'past' | 'any';
}

type PickerView = 'calendar' | 'year' | 'month';

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  containerStyle,
  mode = 'date',
  minimumDate,
  maximumDate,
  placeholder = 'MM/DD/YYYY',
  disabled = false,
  type = 'any',
}) => {
  const colors = useThemeColors();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pickerView, setPickerView] = useState<PickerView>('calendar');
  const [selectedYear, setSelectedYear] = useState<number>(
    value?.getFullYear() || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    value?.getMonth() || new Date().getMonth()
  );

  const hasError = !!error;

  useEffect(() => {
    if (value) {
      setInputValue(format(value, 'MM/dd/yyyy'));
      setSelectedYear(value.getFullYear());
      setSelectedMonth(value.getMonth());
    } else {
      setInputValue('');
    }
  }, [value]);

  // Determine date constraints based on type
  const getMinDate = () => {
    if (minimumDate) return minimumDate;
    if (type === 'future') return new Date();
    return undefined;
  };

  const getMaxDate = () => {
    if (maximumDate) return maximumDate;
    if (type === 'past') return new Date();
    return undefined;
  };

  // Generate years array based on type
  const generateYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    const yearsToShow = 100;

    if (type === 'future') {
      return Array.from({ length: yearsToShow }, (_, i) => currentYear + i);
    } else {
      return Array.from({ length: yearsToShow }, (_, i) => currentYear - i).reverse();
    }
  };

  const years = generateYears();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const normalizedDate = startOfDay(selectedDate);
      setTempDate(normalizedDate);
      if (Platform.OS === 'android') {
        onChange?.(normalizedDate);
        setInputValue(format(normalizedDate, 'MM/dd/yyyy'));
      }
    }
  };

  const handleConfirm = () => {
    const normalizedDate = startOfDay(tempDate);
    onChange?.(normalizedDate);
    setInputValue(format(normalizedDate, 'MM/dd/yyyy'));
    setShowPicker(false);
    setIsFocused(false);
    setPickerView('calendar');
  };

  const handleCancel = () => {
    setTempDate(value || new Date());
    setShowPicker(false);
    setIsFocused(false);
    setPickerView('calendar');
  };

  const handleClear = () => {
    onChange?.(new Date());
    setInputValue('');
    setShowPicker(false);
    setPickerView('calendar');
  };

  const handleTextChange = (text: string) => {
    // Only allow numbers and slashes
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
    }

    // Limit to 10 characters
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    setInputValue(formatted);

    // Validate and update date if valid
    if (formatted.length === 10) {
      const parsedDate = parse(formatted, 'MM/dd/yyyy', startOfDay(new Date()));
      if (isValid(parsedDate)) {
        // Check constraints
        const min = getMinDate();
        const max = getMaxDate();

        if (min && parsedDate < min) return;
        if (max && parsedDate > max) return;

        const normalizedDate = startOfDay(parsedDate);
        onChange?.(normalizedDate);
        setTempDate(normalizedDate);
        setSelectedYear(normalizedDate.getFullYear());
        setSelectedMonth(normalizedDate.getMonth());
      }
    } else if (formatted === '') {
      setInputValue('');
    }
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    const newDate = new Date(year, selectedMonth, tempDate.getDate() || 1);
    setTempDate(startOfDay(newDate));
    setPickerView('calendar');
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    const newDate = new Date(selectedYear, monthIndex, tempDate.getDate() || 1);
    setTempDate(startOfDay(newDate));
    setPickerView('calendar');
  };

  const goToNextMonth = () => {
    const nextMonth = (selectedMonth + 1) % 12;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  const goToPreviousMonth = () => {
    const prevMonth = (selectedMonth - 1 + 12) % 12;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    setSelectedMonth(prevMonth);
    setSelectedYear(prevYear);
  };

  const renderYearPicker = () => (
    <View style={styles.pickerContent}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerTitle, { color: colors.text }]}>
          Select Year
        </Text>
      </View>
      <ScrollView
        style={styles.yearScroll}
        contentContainerStyle={styles.yearGrid}
        showsVerticalScrollIndicator={true}
      >
        {years.map((year) => (
          <TouchableOpacity
            key={year}
            style={[
              styles.yearButton,
              year === selectedYear && {
                backgroundColor: colors.primary,
              },
              { borderColor: colors.border },
            ]}
            onPress={() => handleYearSelect(year)}
          >
            <Text
              style={[
                styles.yearText,
                { color: year === selectedYear ? colors.white : colors.text },
              ]}
            >
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setPickerView('calendar')}
      >
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMonthPicker = () => (
    <View style={styles.pickerContent}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerTitle, { color: colors.text }]}>
          Select Month
        </Text>
      </View>
      <View style={styles.monthGrid}>
        {months.map((month, index) => (
          <TouchableOpacity
            key={month}
            style={[
              styles.monthButton,
              index === selectedMonth && {
                backgroundColor: colors.primary,
              },
              { borderColor: colors.border },
            ]}
            onPress={() => handleMonthSelect(index)}
          >
            <Text
              style={[
                styles.monthText,
                { color: index === selectedMonth ? colors.white : colors.text },
              ]}
            >
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => setPickerView('calendar')}
      >
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalendarPicker = () => (
    <View style={styles.pickerContent}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPreviousMonth}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.dateSelector}>
          <TouchableOpacity
            style={styles.dateSelectorButton}
            onPress={() => setPickerView('year')}
          >
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {selectedYear}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateSelectorButton}
            onPress={() => setPickerView('month')}
          >
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {months[selectedMonth]}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextMonth}
        >
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <DateTimePicker
          value={new Date(selectedYear, selectedMonth, tempDate.getDate() || 1)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
          minimumDate={getMinDate()}
          maximumDate={getMaxDate()}
          textColor={colors.text}
        />
      </View>
    </View>
  );

  const renderPicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text
                    style={[
                      styles.modalButton,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {label || 'Select Date'}
                </Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text
                    style={[
                      styles.modalButton,
                      styles.modalButtonPrimary,
                      { color: colors.primary },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {pickerView === 'year' && renderYearPicker()}
              {pickerView === 'month' && renderMonthPicker()}
              {pickerView === 'calendar' && renderCalendarPicker()}

              {value && pickerView === 'calendar' && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                >
                  <X size={16} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.clearButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      );
    }

    // Android picker - uses native date picker
    if (showPicker) {
      return (
        <DateTimePicker
          value={tempDate}
          mode={mode}
          display="default"
          onChange={handleDateChange}
          minimumDate={getMinDate()}
          maximumDate={getMaxDate()}
        />
      );
    }

    return null;
  };

  const inputContainerStyles = [
    styles.inputContainer,
    {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    isFocused && {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    hasError && {
      borderColor: colors.error,
      borderWidth: 1,
    },
    disabled && {
      backgroundColor: colors.backgroundSecondary,
      opacity: 0.6,
    },
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {label}
            {required && (
              <Text style={[styles.required, { color: colors.error }]}> *</Text>
            )}
          </Text>
        </View>
      )}

      <View style={inputContainerStyles}>
        <TouchableOpacity
          style={styles.leftIconContainer}
          onPress={() => {
            if (!disabled) {
              setIsFocused(true);
              setShowPicker(true);
            }
          }}
          disabled={disabled}
        >
          <Calendar size={20} color={isFocused ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            disabled && { color: colors.textSecondary },
          ]}
          value={inputValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          maxLength={10}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
        />

        {inputValue ? (
          <TouchableOpacity
            style={styles.clearIconContainer}
            onPress={() => {
              handleClear();
              setInputValue('');
            }}
          >
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: colors.textSecondary },
            hasError && { color: colors.error },
          ]}
        >
          {error || helperText}
        </Text>
      )}

      {renderPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  required: {
    // Color applied inline
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
  },
  leftIconContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    height: '100%',
  },
  clearIconContainer: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
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
    paddingBottom: spacing.md,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  modalButton: {
    fontSize: typography.fontSize.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modalButtonPrimary: {
    fontWeight: typography.fontWeight.semibold,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  clearButtonText: {
    fontSize: typography.fontSize.base,
  },
  pickerContent: {
    paddingHorizontal: spacing.sm,
  },
  pickerHeader: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  navButton: {
    padding: spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateSelectorButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateSelectorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  yearScroll: {
    maxHeight: 300,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  yearButton: {
    width: '23%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  yearText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  monthButton: {
    width: '31%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  monthText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
  },
  calendarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
