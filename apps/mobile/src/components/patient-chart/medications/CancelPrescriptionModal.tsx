// apps/mobile/src/components/patient-chart/medications/CancelPrescriptionModal.tsx
//
// Confirms withdrawing a prescription, from inside the Rx detail sheet.
//
// A plain RN Modal, not a second BottomSheet: nested BottomSheetModals are the
// documented failure mode in this codebase, and the detail sheet is on screen
// at this moment. RN's Modal presents as its own native window above
// everything, which is exactly what SendInviteModal does for the same reason.
//
// The warning that the reason reaches the patient sits above the input, not
// below it — told afterwards, the clinician has already written a note to a
// colleague and has to rewrite it for a patient.

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ban } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { isCancellationReasonRequired } from '@fajr/shared/medications';

interface CancelPrescriptionModalProps {
  visible: boolean;
  /** Mobile is the clinician's surface; the pharmacy cancels on the web page. */
  role?: 'doctor';
  submitting: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onDismiss: () => void;
}

export const CancelPrescriptionModal: React.FC<CancelPrescriptionModalProps> = ({
  visible,
  role = 'doctor',
  submitting,
  error,
  onConfirm,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const [reason, setReason] = useState('');
  const reasonRequired = isCancellationReasonRequired(role);

  // Reopening for a different prescription must not inherit the last reason —
  // sending one script's explanation to another patient is a real hazard.
  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  const canConfirm = (!reasonRequired || !!reason.trim()) && !submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.titleRow}>
            <Ban size={18} color={colors.error} />
            <Text style={[styles.title, { color: colors.text }]}>
              Cancel this prescription?
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This cannot be undone. The link and QR code stop working
            immediately, and a replacement has to be a new prescription.
          </Text>

          <View
            style={[
              styles.warning,
              { backgroundColor: colors.error + '15', borderColor: colors.error + '40' },
            ]}
          >
            <Text style={[styles.warningText, { color: colors.text }]}>
              The patient will be told on Telegram, and{' '}
              <Text style={styles.bold}>your reason is sent word for word</Text>.
              Write it for the patient, not for the chart.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>
            Reason {reasonRequired ? '*' : '(optional)'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Switching you to a different medication."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error && (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondary, { borderColor: colors.border }]}
              onPress={onDismiss}
              disabled={submitting}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                Keep it
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primary,
                { backgroundColor: colors.error, opacity: canConfirm ? 1 : 0.5 },
              ]}
              onPress={() => onConfirm(reason.trim())}
              disabled={!canConfirm}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ban size={15} color={colors.textInverse} />
              )}
              <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                {submitting ? 'Cancelling…' : 'Cancel Rx'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
  },
  warning: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
  },
  bold: {
    fontWeight: typography.fontWeight.bold,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.xs,
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    minHeight: 72,
    fontSize: typography.fontSize.sm,
  },
  error: {
    fontSize: typography.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  primaryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default CancelPrescriptionModal;
