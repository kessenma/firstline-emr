// apps/mobile/src/components/patient-chart/medications/RxOrderDetailSheet.tsx

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Share, Alert, Image, ActivityIndicator } from 'react-native';
import { AlertTriangle, Ban, FileText, Share2 } from 'lucide-react-native';
import { BottomSheet, BottomSheetScrollView } from '../../BottomSheet';
import { Button } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { TelegramIcon } from '../../icons/TelegramIcon';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing } from '../../../utils/theme';
import {
  buildPrescriptionSummary,
  describePrescriptionCancellation,
  describePrescriptionCancelFailure,
  describePrescriptionDelivery,
  describePrescriptionSendFailure,
  prescriptionCancelToast,
  prescriptionSendToast,
  formatMedicationDate,
  formatMedicationDateOnly,
  getPrescriptionLink,
  hasPharmacyQrCode,
  hasSentPrescriptionLink,
  type RxOrder,
} from '@fajr/shared/medications';
import { MESSAGING_CHANNELS, getPatientChannel } from '@fajr/shared/messaging';
import { useToast } from '../../../hooks/useToast';
import { useRxOrderSend } from './useRxOrderSend';
import { useRxOrderCancel } from './useRxOrderCancel';
import { CancelPrescriptionModal } from './CancelPrescriptionModal';

interface RxOrderDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Null before any order has been opened. The sheet stays mounted from first
   * render — mounting one already-visible never presents it — so it has to
   * tolerate having nothing to show yet.
   */
  rxOrder: RxOrder | null;
  /** Read in the sheet's own body — the Portal detaches context from children. */
  patientId: string | undefined;
  telegramChatId: string | undefined;
}

export const RxOrderDetailSheet: React.FC<RxOrderDetailSheetProps> = ({
  visible,
  onClose,
  rxOrder,
  patientId,
  telegramChatId,
}) => {
  const colors = useThemeColors();
  // Called in the sheet's own body, not in its children: the Portal detaches
  // the context tree, and ToastProvider sits above BottomSheetModalProvider so
  // the toast still paints over the presented sheet.
  const { toast } = useToast();

  const patientRxUrl = useMemo(() => getPrescriptionLink(rxOrder), [rxOrder]);
  const delivery = useMemo(
    () => describePrescriptionDelivery(rxOrder ?? {}),
    [rxOrder],
  );
  const channel = getPatientChannel({ telegramChatId });
  const descriptor = channel ? MESSAGING_CHANNELS[channel] : null;

  const { sendState, failure, send } = useRxOrderSend({
    patientId,
    rxOrderId: rxOrder?.id,
  });

  // `failure` in the send callback's closure is the value from the render that
  // created it — i.e. before the send ran. The ref carries the fresh one.
  const failureRef = useRef(failure);
  failureRef.current = failure;

  const {
    cancelState,
    failure: cancelFailure,
    cancel,
  } = useRxOrderCancel({ patientId, rxOrderId: rxOrder?.id });
  const [cancelOpen, setCancelOpen] = useState(false);

  const cancellation = useMemo(
    () => describePrescriptionCancellation(rxOrder ?? {}),
    [rxOrder],
  );
  // Local state covers the gap before PowerSync echoes cancelled_at back.
  const cancelled = !!cancellation || cancelState === 'cancelled';

  const handleCancelConfirm = useCallback(
    async (reason: string) => {
      const result = await cancel(reason);
      if (result.ok) {
        setCancelOpen(false);
        toast(
          prescriptionCancelToast({
            ok: true,
            notifiedPatient: result.notifiedPatient,
          }),
        );
      }
    },
    [cancel, toast],
  );

  // Second tap sends. The first only reveals why the button is greyed, which
  // is the whole point of the soft guard — re-sending stays possible, it just
  // stops being accidental.
  const [tooltipAcknowledged, setTooltipAcknowledged] = useState(false);
  const [showSentTooltip, setShowSentTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `sendState` covers the gap before PowerSync echoes patient_link_sent_at back.
  const alreadySent = hasSentPrescriptionLink(rxOrder) || sendState === 'sent';
  const blocked = alreadySent && !tooltipAcknowledged;

  const handleSendPress = useCallback(async () => {
    if (blocked) {
      setTooltipAcknowledged(true);
      setShowSentTooltip(true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setShowSentTooltip(false), 3500);
      return;
    }

    setShowSentTooltip(false);
    const ok = await send();

    // Confirms delivery without dismissing the sheet — the clinician may still
    // want the QR or the full details. Wording comes from the shared helper so
    // web says the same thing for the same outcome.
    toast(
      prescriptionSendToast(
        ok && channel
          ? { ok: true, channel }
          : { ok: false, reason: failureRef.current ?? 'unknown' },
      ),
    );
  }, [blocked, send, toast, channel]);

  // Full clinical detail — for the doctor's own records or a colleague.
  const handleShareDetails = useCallback(async () => {
    try {
      await Share.share({ message: buildPrescriptionSummary(rxOrder!) });
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share prescription.');
      }
    }
  }, [rxOrder]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="RX Prescription Details"
      snapPoint={75}
      startExpanded
      showHandle
      showCloseButton
      rawContent
    >
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {!rxOrder ? null : (
        <>
        {/* Prescriber Info */}
        <View style={[styles.section, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescriber</Text>
          </View>
          <DetailRow label="Doctor" value={`Dr. ${rxOrder.prescribingDr || 'Unknown'}`} colors={colors} />
          {rxOrder.doctorSpecialty ? (
            <DetailRow label="Specialty" value={rxOrder.doctorSpecialty} colors={colors} />
          ) : null}
          {rxOrder.drEmail ? (
            <DetailRow label="Email" value={rxOrder.drEmail} colors={colors} />
          ) : null}
          <DetailRow label="Date" value={formatMedicationDate(rxOrder.prescribedDate)} colors={colors} />
          {rxOrder.validTill ? (
            <DetailRow label="Valid Till" value={formatMedicationDateOnly(rxOrder.validTill)} colors={colors} />
          ) : null}
          {rxOrder.city ? (
            <DetailRow label="City" value={rxOrder.city} colors={colors} />
          ) : null}
        </View>

        {/* Pharmacy QR — the same image the web drawer renders */}
        {hasPharmacyQrCode(rxOrder) && (
          <View style={[styles.section, styles.qrSection, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pharmacy QR Code
            </Text>
            <Image
              source={{ uri: rxOrder.pharmacyQrCode as string }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Prescriptions */}
        <Text style={[styles.listTitle, { color: colors.text }]}>
          Prescriptions ({rxOrder.prescriptions?.length || 0})
        </Text>
        {(rxOrder.prescriptions || []).map((med: any, idx: number) => (
          <View key={idx} style={[styles.medCard, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.medNumber, { color: colors.primary }]}>#{idx + 1}</Text>
            <DetailRow label="Diagnosis" value={med.diagnosis} colors={colors} />
            <DetailRow label="Medication" value={med.medication} colors={colors} />
            <DetailRow label="Dosage" value={med.dosage} colors={colors} />
            <DetailRow label="Frequency" value={med.frequency} colors={colors} />
          </View>
        ))}

        {(rxOrder.prescriptions?.length || 0) === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No prescriptions listed.
          </Text>
        )}

        {/* Delivery status — visible without acting on anything */}
        <View style={[styles.statusBox, { backgroundColor: colors.surfaceSecondary }]}>
          {/* Cancelled first: the delivery line alone reads as though the
              script were still live. It stays below because it is still true —
              it explains why the patient had to be told. */}
          {cancellation && (
            <View style={styles.warningRow}>
              <Ban size={13} color={colors.error} />
              <Text style={[styles.statusWarning, { color: colors.error }]}>
                {cancellation.headline}
                {cancellation.reason ? ` — ${cancellation.reason}` : ''}
              </Text>
            </View>
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {delivery.summary}
          </Text>
          {delivery.warning && (
            <View style={styles.warningRow}>
              <AlertTriangle size={13} color={colors.error} />
              <Text style={[styles.statusWarning, { color: colors.error }]}>
                {delivery.warning}
              </Text>
            </View>
          )}
        </View>

        {/* Send action.
            The button stays enabled and is merely dimmed when already sent: a
            genuinely disabled Touchable swallows the press, and the tooltip
            would never open. `disabled` is reserved for the hard block below,
            where there is no link to send at all. */}
        {!cancelled && (
        <Tooltip
          tooltipText={
            delivery.opened
              ? `${delivery.summary}. Tap again to send it once more.`
              : `${delivery.summary}. Tap again to send it once more.`
          }
          showTooltip={showSentTooltip}
          position="top"
          maxWidth={260}
          style={styles.tooltipWrapper}
        >
          <Button
            variant="default"
            onPress={() => void handleSendPress()}
            disabled={!patientRxUrl || !descriptor || sendState === 'sending'}
            style={[styles.shareButton, blocked ? styles.blockedButton : null]}
            size="sm"
          >
            {sendState === 'sending' ? (
              <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 6 }} />
            ) : (
              <TelegramIcon size={16} color={colors.textInverse} />
            )}
            <Text style={[styles.shareButtonText, { color: colors.textInverse, marginLeft: 6 }]}>
              {!descriptor
                ? 'No messaging channel'
                : sendState === 'sending'
                  ? descriptor.sendingLabel
                  : sendState === 'failed'
                    ? descriptor.failedLabel
                    : alreadySent
                      ? descriptor.sentLabel
                      : descriptor.sendLabel}
            </Text>
          </Button>
        </Tooltip>
        )}

        {!patientRxUrl && !cancelled && (
          <Text style={[styles.warningText, { color: colors.error }]}>
            This prescription has no patient link, so it cannot be sent.
            Re-create it to generate one.
          </Text>
        )}

        {!descriptor && patientRxUrl && !cancelled && (
          <Text style={[styles.warningText, { color: colors.textTertiary }]}>
            {MESSAGING_CHANNELS.telegram.unreachableLabel}.
          </Text>
        )}

        {describePrescriptionSendFailure(failure) && (
          <Text style={[styles.warningText, { color: colors.error }]}>
            {describePrescriptionSendFailure(failure)}
          </Text>
        )}

        <Button
          variant="outline"
          onPress={handleShareDetails}
          style={styles.shareButton}
          size="sm"
        >
          <Share2 size={16} color={colors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.shareButtonText, { color: colors.text }]}>
            Share Full Details
          </Text>
        </Button>

        {!cancelled && (
          <Button
            variant="outline"
            onPress={() => setCancelOpen(true)}
            style={styles.shareButton}
            size="sm"
          >
            <Ban size={16} color={colors.error} style={{ marginRight: 6 }} />
            <Text style={[styles.shareButtonText, { color: colors.error }]}>
              Cancel Prescription
            </Text>
          </Button>
        )}

        {describePrescriptionCancelFailure(cancelFailure) && (
          <Text style={[styles.warningText, { color: colors.error }]}>
            {describePrescriptionCancelFailure(cancelFailure)}
          </Text>
        )}
        </>
        )}
      </BottomSheetScrollView>

      {/* A plain RN Modal, not a nested BottomSheet — see the file header. */}
      <CancelPrescriptionModal
        visible={cancelOpen}
        submitting={cancelState === 'cancelling'}
        error={describePrescriptionCancelFailure(cancelFailure)}
        onConfirm={handleCancelConfirm}
        onDismiss={() => setCancelOpen(false)}
      />
    </BottomSheet>
  );
};

const DetailRow: React.FC<{
  label: string;
  value?: string;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ label, value, colors }) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}:</Text>
    <Text style={[styles.detailValue, { color: colors.text }]}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  medCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  medNumber: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  shareButton: {
    marginTop: 12,
    width: '100%',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  tooltipWrapper: {
    width: '100%',
  },
  blockedButton: {
    opacity: 0.5,
  },
  statusBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusWarning: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  qrSection: {
    alignItems: 'center',
  },
  qrImage: {
    width: 180,
    height: 180,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
});
