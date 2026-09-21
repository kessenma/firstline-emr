// apps/mobile/src/components/patient-chart/medications/MedicationCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  FileText,
  Pill,
  Share2,
} from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import {
  isRxOrder,
  formatMedicationDate,
  formatMedicationDateOnly,
  getMedicationDate,
  getMedicationItemCount,
  type AnyMedication,
} from './medicationUtils';
import {
  describePrescriptionCancellation,
  describePrescriptionDelivery,
} from '@fajr/shared/medications';

interface MedicationCardProps {
  item: AnyMedication;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onShare?: (item: AnyMedication) => void;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  item,
  isExpanded,
  onToggle,
  onShare,
}) => {
  const colors = useThemeColors();
  const isRx = isRxOrder(item);
  const delivery = isRx ? describePrescriptionDelivery(item) : null;
  const cancellation = isRx ? describePrescriptionCancellation(item) : null;
  const date = getMedicationDate(item);
  const itemCount = getMedicationItemCount(item);
  const doctorName = isRx ? item.prescribingDr : item.prescribingDr;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {isRx ? (
            <FileText size={18} color={colors.primary} />
          ) : (
            <Pill size={18} color={colors.warning} />
          )}
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: colors.text }]}>
              {isRx ? 'RX Prescription' : 'Med Request'}
            </Text>
            <Text style={[styles.countLabel, { color: colors.textTertiary }]}>
              {itemCount} {isRx ? 'prescription' : 'medication'}
              {itemCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isRx && onShare && (
            <TouchableOpacity
              onPress={() => onShare(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.shareButton}
            >
              <Share2 size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          {isExpanded ? (
            <ChevronUp size={18} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Meta info */}
      <View style={styles.metaRow}>
        {doctorName ? (
          <Text style={[styles.doctorName, { color: colors.textSecondary }]}>
            Dr. {doctorName}
          </Text>
        ) : null}
        {isRx && item.doctorSpecialty ? (
          <Text style={[styles.specialty, { color: colors.textTertiary }]}>
            {item.doctorSpecialty}
          </Text>
        ) : null}
      </View>

      {/* Date */}
      <Text style={[styles.date, { color: colors.textTertiary }]}>
        {formatMedicationDate(date)}
      </Text>

      {/* Delivery status — worded by the shared helper so web says the same.
          On the card rather than only in the sheet, so staff can see at a
          glance which scripts never reached their patient. */}
      {isRx && delivery && (
        <View style={styles.deliveryRow}>
          {/* Cancelled leads: "Sent · opened" on its own reads as a live
              script, which is the opposite of what happened. */}
          {cancellation && (
            <View style={styles.deliveryWarningRow}>
              <Ban size={12} color={colors.error} />
              <Text style={[styles.deliveryWarning, { color: colors.error }]}>
                {cancellation.headline}
                {cancellation.reason ? ` — ${cancellation.reason}` : ''}
              </Text>
            </View>
          )}
          <Text style={[styles.deliveryText, { color: colors.textTertiary }]}>
            {delivery.summary}
          </Text>
          {delivery.warning && (
            <View style={styles.deliveryWarningRow}>
              <AlertTriangle size={12} color={colors.error} />
              <Text style={[styles.deliveryWarning, { color: colors.error }]}>
                {delivery.warning}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
          {isRx && item.city ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>City:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{item.city}</Text>
            </View>
          ) : null}
          {isRx && item.validTill ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Valid Till:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatMedicationDateOnly(item.validTill)}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isRx ? 'Prescriptions' : 'Medications'}
          </Text>

          {isRx
            ? (item.prescriptions || []).map((med: any, idx: number) => (
                <View
                  key={`rx-${idx}`}
                  style={[styles.medItem, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <DetailField label="Diagnosis" value={med.diagnosis} colors={colors} />
                  <DetailField label="Medication" value={med.medication} colors={colors} />
                  <DetailField label="Dosage" value={med.dosage} colors={colors} />
                  <DetailField label="Frequency" value={med.frequency} colors={colors} />
                </View>
              ))
            : (item.medications || []).map((med, idx) => (
                <View
                  key={`med-${idx}`}
                  style={[styles.medItem, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <DetailField label="Diagnosis" value={med.diagnosis} colors={colors} />
                  <DetailField label="Medication" value={med.medication} colors={colors} />
                  <DetailField label="Dosage" value={med.dosage} colors={colors} />
                  <DetailField label="Frequency" value={med.frequency} colors={colors} />
                  <DetailField label="Quantity" value={med.quantity} colors={colors} />
                </View>
              ))}

          {itemCount === 0 && (
            <Text style={[styles.emptyMeds, { color: colors.textTertiary }]}>
              No {isRx ? 'prescriptions' : 'medications'} listed.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const DetailField: React.FC<{
  label: string;
  value?: string;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ label, value, colors }) => (
  <View style={styles.fieldRow}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}:</Text>
    <Text style={[styles.fieldValue, { color: colors.text }]}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  countLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  shareButton: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '500',
  },
  specialty: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  deliveryRow: {
    marginTop: 4,
    gap: 3,
  },
  deliveryText: {
    fontSize: 11,
  },
  deliveryWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryWarning: {
    fontSize: 11,
    flex: 1,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  medItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  fieldValue: {
    fontSize: 12,
    flex: 1,
  },
  emptyMeds: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
