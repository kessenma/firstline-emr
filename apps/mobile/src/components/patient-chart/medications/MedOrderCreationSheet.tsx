// apps/mobile/src/components/patient-chart/medications/MedOrderCreationSheet.tsx

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, UserCheck } from 'lucide-react-native';
import { BottomSheet, BottomSheetScrollView, BottomSheetKeyboardSpacer } from '../../BottomSheet';
import { Button } from '../../ui/Button';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing } from '../../../utils/theme';
import { useMedOrderForm } from './useMedOrderForm';
import { usePatientChart } from '../PatientChartContext';

interface MedOrderCreationSheetProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
}

export const MedOrderCreationSheet: React.FC<MedOrderCreationSheetProps> = ({
  visible,
  onClose,
  patientId,
}) => {
  const colors = useThemeColors();
  const { patientInfo } = usePatientChart();
  const vm = useMedOrderForm(patientId);

  const handleSubmit = useCallback(async () => {
    const success = await vm.submit();
    if (success) onClose();
  }, [vm, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Request Unavailable Medications"
      snapPoint={90}
      startExpanded
      showHandle
      showCloseButton
      rawContent
    >
      <View style={styles.sheetContent}>
        {/* Doctor & Patient Info */}
        <View style={[styles.infoBar, { borderBottomColor: colors.border }]}>
          <View style={styles.infoRow}>
            <UserCheck size={14} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Dr. {vm.form.prescribingDr} ({vm.form.doctorSpecialty})
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            Patient: {patientInfo?.patientName || 'Unknown'} | City: {vm.form.patientCity || 'N/A'}
          </Text>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Medications */}
          {vm.form.medications.map((medication, index) => (
            <View key={index} style={[styles.medicationCard, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={styles.medicationHeader}>
                <Text style={[styles.medicationTitle, { color: colors.text }]}>
                  Medication {index + 1}
                </Text>
                {vm.form.medications.length > 1 && (
                  <TouchableOpacity onPress={() => vm.removeMedication(index)}>
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={medication.diagnosis}
                onChangeText={v => vm.updateMedication(index, 'diagnosis', v)}
                placeholder="Diagnosis"
                placeholderTextColor={colors.textTertiary}
                multiline
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Medication</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={medication.medication}
                onChangeText={v => vm.updateMedication(index, 'medication', v)}
                placeholder="Medication name"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Dosage</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={medication.dosage}
                onChangeText={v => vm.updateMedication(index, 'dosage', v)}
                placeholder="Dosage"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Frequency</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={medication.frequency}
                onChangeText={v => vm.updateMedication(index, 'frequency', v)}
                placeholder="Frequency"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quantity</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={medication.quantity}
                onChangeText={v => vm.updateMedication(index, 'quantity', v)}
                placeholder="Quantity"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          ))}

          {/* Add Medication Button */}
          <TouchableOpacity
            style={[styles.addMedicationButton, { borderColor: colors.primary }]}
            onPress={vm.addMedication}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[styles.addMedicationText, { color: colors.primary }]}>
              Add Medication
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <View style={styles.actionRow}>
            <Button
              variant="default"
              onPress={handleSubmit}
              style={[styles.submitButton, !vm.isFormComplete && { opacity: 0.4 }]}
              disabled={!vm.isFormComplete || vm.isLoading}
              size="sm"
            >
              {vm.isLoading ? (
                <ActivityIndicator size={16} color={colors.textInverse} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                  Submit Medication Request
                </Text>
              )}
            </Button>
          </View>
          <BottomSheetKeyboardSpacer />
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  infoBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  medicationCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginBottom: 16,
  },
  addMedicationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionRow: {
    marginTop: spacing.sm,
  },
  submitButton: {
    width: '100%',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
