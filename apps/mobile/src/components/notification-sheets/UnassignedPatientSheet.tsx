// apps/mobile/src/components/notification-sheets/UnassignedPatientSheet.tsx
// Bottom sheet for specialty_no_doctors notifications — patient detail + specialty reassignment

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  User,
  MapPin,
  Globe,
} from 'lucide-react-native';
import axios from 'axios';
import { BottomSheet } from '../BottomSheet';
import { SpecialtyPickerSheet } from '../../screens/user-profile/components/SpecialtyPickerSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

interface UnassignedPatientSheetProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onOpenFull: () => void;
}

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
  priority?: string;
  specialties?: string[];
  chiefComplaint?: string;
  country?: string;
  city?: string;
  language?: string;
  email?: string;
  phone?: { countryCode?: string; phoneNumber?: string } | string;
  hospital?: string;
  hasSpecialtyWithoutDoctors?: boolean;
}

export function UnassignedPatientSheet({
  visible,
  patientId,
  onClose,
  onOpenFull,
}: UnassignedPatientSheetProps) {
  const colors = useThemeColors();
  useAuth();

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialtyPickerOpen, setSpecialtyPickerOpen] = useState(false);
  const [isUpdatingSpecialty, setIsUpdatingSpecialty] = useState(false);

  useEffect(() => {
    if (!visible || !patientId) return;
    let cancelled = false;

    const fetchPatient = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = storageUtils.getToken();
        const res = await axios.get(getApiUrl(`/patient/${patientId}`), {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        if (!cancelled) {
          setPatientData(res.data.patient || res.data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load patient data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPatient();
    return () => { cancelled = true; };
  }, [visible, patientId]);

  const handleSpecialtyChange = useCallback(
    async (specialties: string[]) => {
      if (!patientData) return;
      setIsUpdatingSpecialty(true);
      try {
        const token = storageUtils.getToken();
        await axios.patch(
          getApiUrl(`/patient/${patientId}`),
          { specialties },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setPatientData((prev) => (prev ? { ...prev, specialties } : prev));
        setSpecialtyPickerOpen(false);
      } catch {
        Alert.alert('Error', 'Failed to update specialty.');
      } finally {
        setIsUpdatingSpecialty(false);
      }
    },
    [patientData, patientId],
  );

  const handleOpenFull = () => {
    onClose();
    onOpenFull();
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Unassigned Specialty Patient"
        snapPoint={90}
        showHandle
        showCloseButton
      >
        <>
          {/* Open Full Chart button */}
          <TouchableOpacity
            style={[styles.openFullButton, { borderColor: colors.border }]}
            onPress={handleOpenFull}
          >
            <ExternalLink size={16} color={colors.primary} />
            <Text style={[styles.openFullText, { color: colors.primary }]}>
              View Full Patient Chart
            </Text>
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error || !patientData ? (
            <View style={styles.centered}>
              <AlertTriangle size={32} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error || 'Patient not found'}
              </Text>
            </View>
          ) : (
            <>
              {/* Specialty Assignment */}
              {patientData.hasSpecialtyWithoutDoctors === false ? (
                <View
                  style={[
                    styles.specialtyCard,
                    { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' },
                  ]}
                >
                  <View style={styles.specialtyHeader}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.specialtyTitle, { color: colors.text }]}>
                      Resolved
                    </Text>
                  </View>
                  <Text style={[styles.specialtyDesc, { color: colors.textSecondary }]}>
                    This patient's specialty has been reassigned to{' '}
                    <Text style={{ fontWeight: '600' }}>
                      {patientData.specialties?.join(', ') || 'None'}
                    </Text>
                    . You can still change it below if needed.
                  </Text>
                  <TouchableOpacity
                    style={[styles.reassignButton, { backgroundColor: colors.primary }]}
                    onPress={() => setSpecialtyPickerOpen(true)}
                    disabled={isUpdatingSpecialty}
                  >
                    {isUpdatingSpecialty ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Stethoscope size={16} color={colors.textInverse} />
                        <Text style={[styles.reassignButtonText, { color: colors.textInverse }]}>Change Specialty</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.specialtyCard,
                    { backgroundColor: colors.error + '10', borderColor: colors.error + '40' },
                  ]}
                >
                  <View style={styles.specialtyHeader}>
                    <View style={[styles.pulseDot, { backgroundColor: colors.error }]} />
                    <Text style={[styles.specialtyTitle, { color: colors.text }]}>
                      Assign Specialty
                    </Text>
                  </View>
                  <Text style={[styles.specialtyDesc, { color: colors.textSecondary }]}>
                    Patient assigned to{' '}
                    <Text style={{ fontWeight: '600' }}>
                      {patientData.specialties?.join(', ') || 'a specialty'}
                    </Text>{' '}
                    with no available doctors. Please reassign.
                  </Text>
                  <TouchableOpacity
                    style={[styles.reassignButton, { backgroundColor: colors.primary }]}
                    onPress={() => setSpecialtyPickerOpen(true)}
                    disabled={isUpdatingSpecialty}
                  >
                    {isUpdatingSpecialty ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Stethoscope size={16} color={colors.textInverse} />
                        <Text style={[styles.reassignButtonText, { color: colors.textInverse }]}>
                          {patientData.specialties?.length ? 'Reassign Specialty' : 'Assign Specialty'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Patient Header */}
              <View style={[styles.patientHeader, { borderColor: colors.border }]}>
                <View style={styles.nameRow}>
                  <User size={20} color={colors.primary} />
                  <Text style={[styles.patientName, { color: colors.text }]}>
                    {patientData.firstName} {patientData.lastName}
                  </Text>
                </View>
                <View style={styles.badgesRow}>
                  {patientData.status && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {patientData.status}
                      </Text>
                    </View>
                  )}
                  {patientData.priority && patientData.priority !== 'Not Selected' && (
                    <View style={[styles.badge, { backgroundColor: colors.error + '15' }]}>
                      <Text style={[styles.badgeText, { color: colors.error }]}>
                        {patientData.priority}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Chief Complaint */}
              {patientData.chiefComplaint && (
                <View style={[styles.infoSection, { backgroundColor: colors.primary + '08' }]}>
                  <Text style={[styles.infoLabel, { color: colors.primary }]}>Chief Complaint</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {patientData.chiefComplaint}
                  </Text>
                </View>
              )}

              {/* Quick Info */}
              <View style={styles.infoGrid}>
                {patientData.country && (
                  <View style={styles.infoItem}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.infoItemText, { color: colors.textSecondary }]}>
                      {[patientData.city, patientData.country].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
                {patientData.language && (
                  <View style={styles.infoItem}>
                    <Globe size={14} color={colors.textSecondary} />
                    <Text style={[styles.infoItemText, { color: colors.textSecondary }]}>
                      {patientData.language}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ height: spacing.xxxl }} />
            </>
          )}
        </>
      </BottomSheet>

      {/* Specialty Picker — separate sheet on top */}
      <SpecialtyPickerSheet
        visible={specialtyPickerOpen}
        onClose={() => setSpecialtyPickerOpen(false)}
        selectedSpecialties={patientData?.specialties || []}
        onSelectionChange={handleSpecialtyChange}
        showAvailability
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  openFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  openFullText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  specialtyCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  specialtyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  specialtyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  specialtyDesc: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  reassignButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  patientHeader: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  patientName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.pill || 100,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  infoSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoItemText: {
    fontSize: typography.fontSize.sm,
  },
});
