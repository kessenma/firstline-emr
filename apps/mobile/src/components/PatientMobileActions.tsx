// apps/mobile/src/components/PatientMobileActions.tsx
// Action buttons for patient cards in the mobile dashboard
// Mirrors web PatientMobileActions.tsx functionality

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Merge,
  ArrowUpNarrowWide,
  NotebookPen,
  MessageSquare,
  Stethoscope,
  ExternalLink,
  Check,
  UserPlus,
  Hospital,
} from 'lucide-react-native';
import { BottomSheet, type BottomSheetHandle } from './BottomSheet';
import { RadioCardSelector } from './form/RadioCardSelector';
import { SpecialtyPickerSheet } from '../screens/user-profile/components/SpecialtyPickerSheet';
import type { PatientWithMessages, CareTeamRole } from '../types/patient';
import { spacing, borderRadius, typography } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAvailableSpecialties } from '../hooks/useAvailableSpecialties';
import { useMissions } from '../hooks/useMissions';
import { getRolesForAccountType, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_COLORS } from '@fajr/shared/care-team';

// Match web status/priority values
const STATUS_OPTIONS = [
  'Pre-Op / Not Cleared',
  'Pre-Op / Cleared',
  'Peri-Op / In Surgery',
  'Post-Op / In-Patient',
  'Post-Op / Discharged',
];

const PRIORITY_OPTIONS = [
  'Not Selected',
  'Routine',
  'Moderate',
  'Urgent',
  'Emergency',
];

export type ActionSheet = 'status' | 'priority' | 'notes' | 'specialty';

interface PatientMobileActionsProps {
  patient: PatientWithMessages;
  onStatusChange: (patientId: string, status: string) => Promise<void>;
  onPriorityChange: (patientId: string, priority: string) => Promise<void>;
  onNotesChange: (patientId: string, notes: string) => Promise<void>;
  onSpecialtyChange?: (patientId: string, specialties: string[]) => Promise<void>;
  onOpenPatient: (patient: PatientWithMessages) => void;
  onOpenChat?: (patient: PatientWithMessages) => void;
  onTakeCase?: (patientId: string, role: CareTeamRole) => Promise<void>;
  onHospitalChange?: (patientId: string, hospital: string | null) => Promise<void>;
  loadingStates?: Record<string, boolean>;
  /** Pre-open a specific sheet on mount (used by tablet cell taps) */
  initialSheet?: ActionSheet | null;
  /** Hide the buttons row (tablet uses table cells as entry points instead) */
  hideButtons?: boolean;
  /** Called when any sheet is dismissed (so tablet overlay can close) */
  onSheetClose?: () => void;
}

export const PatientMobileActions: React.FC<PatientMobileActionsProps> = ({
  patient,
  onStatusChange,
  onPriorityChange,
  onNotesChange,
  onSpecialtyChange,
  onOpenPatient,
  onOpenChat,
  onTakeCase,
  onHospitalChange,
  loadingStates = {},
  initialSheet,
  hideButtons = false,
  onSheetClose,
}) => {
  const { user } = useAuth();
  const colors = useThemeColors();
  const isTriage = user?.accountType === 'Triage';
  const isDoctor = user?.accountType === 'Doctor';
  const { hasSpecialty } = useAvailableSpecialties();

  const { missions } = useMissions();
  const patientMission = missions.find((m) => m.id === patient.missionId);
  const hospitalOptions = (patientMission?.hospitals || []).map((h) => typeof h === 'string' ? h : h.name);

  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [prioritySheetOpen, setPrioritySheetOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [specialtySheetOpen, setSpecialtySheetOpen] = useState(false);
  const [notesText, setNotesText] = useState(patient.dashboardNotes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [draftStatus, setDraftStatus] = useState(patient.status || STATUS_OPTIONS[0]);
  const [draftHospital, setDraftHospital] = useState(patient.hospital || 'not-assigned');
  const [savingStatusChanges, setSavingStatusChanges] = useState(false);
  const notesSheetRef = useRef<BottomSheetHandle>(null);

  const isLoading = loadingStates[patient.id] || false;

  // Auto-open a sheet when initialSheet is provided (tablet cell taps)
  useEffect(() => {
    if (!initialSheet) return;
    switch (initialSheet) {
      case 'status': setStatusSheetOpen(true); break;
      case 'priority': setPrioritySheetOpen(true); break;
      case 'notes':
        setNotesText(patient.dashboardNotes || '');
        setNotesSheetOpen(true);
        break;
      case 'specialty': setSpecialtySheetOpen(true); break;
    }
  }, [initialSheet]);

  // Business rules matching web
  const isPriorityDisabled = isTriage && patient.status === 'Pre-Op / Not Cleared';
  const isSpecialtyDisabled = !isTriage
    || !patient.status || patient.status === 'Pre-Op / Not Cleared'
    || !patient.priority || patient.priority === 'Not Selected';
  const hasNotes =
    patient.dashboardNotes && patient.dashboardNotes.trim().length > 0;

  // Filter options based on role (matching web business rules)
  const filteredStatuses = isDoctor
    ? STATUS_OPTIONS.filter(s => s !== 'Pre-Op / Not Cleared')
    : STATUS_OPTIONS;
  const filteredPriorities = isDoctor
    ? PRIORITY_OPTIONS.filter(p => p !== 'Not Selected')
    : PRIORITY_OPTIONS;

  const selectedStatusValue = useMemo(() => {
    if (patient.status && filteredStatuses.includes(patient.status)) {
      return patient.status;
    }
    return filteredStatuses[0];
  }, [filteredStatuses, patient.status]);

  const selectedHospitalValue = patient.hospital || 'not-assigned';

  const hasPendingStatusChanges =
    draftStatus !== selectedStatusValue || draftHospital !== selectedHospitalValue;

  useEffect(() => {
    if (!statusSheetOpen) return;
    setDraftStatus(selectedStatusValue);
    setDraftHospital(selectedHospitalValue);
    setSavingStatusChanges(false);
  }, [statusSheetOpen, selectedStatusValue, selectedHospitalValue]);

  const handleStatusSelect = (status: string) => {
    setDraftStatus(status);
  };

  const handleStatusConfirm = async () => {
    if (!hasPendingStatusChanges || savingStatusChanges) return;
    setSavingStatusChanges(true);
    try {
      if (draftHospital !== selectedHospitalValue) {
        const nextHospital = draftHospital === 'not-assigned' ? null : draftHospital;
        await onHospitalChange?.(patient.id, nextHospital);
      }

      if (draftStatus !== selectedStatusValue) {
        await onStatusChange(patient.id, draftStatus);
      }

      setStatusSheetOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to update patient status. Please try again.');
    } finally {
      setSavingStatusChanges(false);
    }
  };

  const handlePrioritySelect = async (priority: string) => {
    try {
      await onPriorityChange(patient.id, priority);
    } finally {
      setPrioritySheetOpen(false);
    }
  };

  const handlePriorityPress = () => {
    if (isPriorityDisabled) {
      Alert.alert(
        'Cannot Change Priority',
        "Please select a status other than 'Pre-Op / Not Cleared' before changing priority.",
      );
      return;
    }
    setPrioritySheetOpen(true);
  };

  const handleNotesSave = async () => {
    setSavingNotes(true);
    try {
      await onNotesChange(patient.id, notesText);
      setNotesSheetOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesOpen = () => {
    setNotesText(patient.dashboardNotes || '');
    setNotesSheetOpen(true);
  };

  const handleNotesInputFocus = () => {
    notesSheetRef.current?.snapToIndex(2);
  };

  const handleSpecialtyPress = () => {
    if (isSpecialtyDisabled) {
      if (!isTriage) {
        Alert.alert('Access Denied', 'Only triage users can change patient specialty.');
      } else {
        Alert.alert(
          'Cannot Change Specialty',
          'Please select status and priority before changing specialty.',
        );
      }
      return;
    }
    setSpecialtySheetOpen(true);
  };

  const handleSpecialtyChange = (specialties: string[]) => {
    // Check if any selected specialty has no available doctors
    const unavailable = specialties.filter(s => !hasSpecialty(s));
    if (unavailable.length > 0) {
      Alert.alert(
        'No Doctors Available',
        `There are currently no doctors with the "${unavailable[0]}" specialty. Do you want to proceed anyway? The triage team will be notified.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: async () => {
              try {
                await onSpecialtyChange?.(patient.id, specialties);
              } finally {
                setSpecialtySheetOpen(false);
              }
            },
          },
        ],
      );
      return;
    }

    const doChange = async () => {
      try {
        await onSpecialtyChange?.(patient.id, specialties);
      } finally {
        setSpecialtySheetOpen(false);
      }
    };
    doChange();
  };

  const handleChatPress = () => {
    if (!patient.telegramChatId) return;
    onOpenChat?.(patient);
  };

  const handleHospitalSelect = (hospital: string) => {
    setDraftHospital(hospital);
  };

  const availableRoles = getRolesForAccountType(user?.accountType || '');
  const canJoinTeam = availableRoles.length > 0;
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const handleJoinTeam = async (role: CareTeamRole) => {
    setRolePickerOpen(false);
    try {
      await onTakeCase?.(patient.id, role);
    } catch {
      Alert.alert('Error', 'Failed to join care team. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Action Buttons Row — hidden on tablet where table cells are the entry point */}
      {!hideButtons && (
        <View style={styles.buttonsRow}>
          {/* Status */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
              statusSheetOpen && [styles.actionButtonActive, { backgroundColor: colors.surfaceTertiary }],
            ]}
            onPress={() => setStatusSheetOpen(true)}
          >
            <View style={styles.rotatedIconWrapper}>
              <Merge size={22} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Priority */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
              prioritySheetOpen && styles.actionButtonActive,
              prioritySheetOpen && { backgroundColor: colors.surfaceTertiary },
              isPriorityDisabled && styles.actionButtonDisabled,
            ]}
            onPress={handlePriorityPress}
            disabled={isPriorityDisabled}
          >
            <View style={styles.rotatedIconWrapper}>
              <ArrowUpNarrowWide
                size={22}
                color={isPriorityDisabled ? colors.textTertiary : colors.primary}
              />
            </View>
          </TouchableOpacity>

          {/* Notes */}
          <View style={styles.actionButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
                notesSheetOpen && [styles.actionButtonActive, { backgroundColor: colors.surfaceTertiary }],
              ]}
              onPress={handleNotesOpen}
            >
              <NotebookPen size={22} color={colors.primary} />
            </TouchableOpacity>
            {hasNotes && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.textInverse }]}>!</Text>
              </View>
            )}
          </View>

          {/* Messages */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
              !patient.telegramChatId && styles.actionButtonDisabled,
            ]}
            onPress={handleChatPress}
            disabled={!patient.telegramChatId}
          >
            <MessageSquare
              size={22}
              color={!patient.telegramChatId ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>

          {/* Specialty - Triage only */}
          {isTriage && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
                specialtySheetOpen && styles.actionButtonActive,
                specialtySheetOpen && { backgroundColor: colors.surfaceTertiary },
                isSpecialtyDisabled && styles.actionButtonDisabled,
              ]}
              onPress={handleSpecialtyPress}
              disabled={isSpecialtyDisabled}
            >
              <Stethoscope
                size={22}
                color={isSpecialtyDisabled ? colors.textTertiary : colors.primary}
              />
            </TouchableOpacity>
          )}

          {/* Join Team - Show for users with available roles */}
          {canJoinTeam && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.takeCaseButton,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setRolePickerOpen(true)}
              disabled={isLoading}
            >
              <UserPlus size={22} color={colors.textInverse} />
            </TouchableOpacity>
          )}

          {/* Open Patient Chart */}
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary }]}
            onPress={() => onOpenPatient(patient)}
          >
            <ExternalLink size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Status Bottom Sheet */}
      <BottomSheet
        visible={statusSheetOpen}
        onClose={() => { setStatusSheetOpen(false); onSheetClose?.(); }}
        title="Change Status"
        snapPoint={60}
      >
        {hasPendingStatusChanges && (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary },
              savingStatusChanges && styles.saveButtonDisabled,
            ]}
            onPress={handleStatusConfirm}
            disabled={savingStatusChanges || isLoading}
          >
            {savingStatusChanges ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>Confirm Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Hospital Selector */}
        {hospitalOptions.length > 0 && (
          <View style={[styles.hospitalSection, { borderBottomColor: colors.border }]}>
            <View style={styles.hospitalLabelRow}>
              <Hospital size={12} color={colors.textTertiary} />
              <Text style={[styles.hospitalLabel, { color: colors.textTertiary }]}>Hospital</Text>
            </View>
            <RadioCardSelector
              options={[
                { label: 'Not Assigned', value: 'not-assigned' },
                ...hospitalOptions.map((h) => ({ label: h, value: h })),
              ]}
              value={draftHospital}
              onChange={handleHospitalSelect}
              direction="horizontal"
              size="small"
            />
          </View>
        )}

        {/* Status Options */}
        <View style={styles.statusLabelRow}>
          <Merge size={12} color={colors.textTertiary} />
          <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>Status</Text>
        </View>
        <View style={styles.optionsList}>
          {filteredStatuses.map(status => {
            const isSelected = draftStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.optionItem,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isSelected && [styles.optionItemSelected, { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary }],
                ]}
                onPress={() => handleStatusSelect(status)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    isSelected && [styles.optionTextSelected, { color: colors.primary }],
                  ]}
                >
                  {status}
                </Text>
                {isSelected && (
                  <Check size={20} color={colors.primary} />
                )}
                {isLoading && isSelected && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      {/* Priority Bottom Sheet */}
      <BottomSheet
        visible={prioritySheetOpen}
        onClose={() => { setPrioritySheetOpen(false); onSheetClose?.(); }}
        title="Change Priority"
        snapPoint={50}
      >
        <View style={styles.optionsList}>
          {filteredPriorities.map(priority => {
            const isSelected = patient.priority === priority;
            return (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.optionItem,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isSelected && [styles.optionItemSelected, { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary }],
                ]}
                onPress={() => handlePrioritySelect(priority)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    isSelected && [styles.optionTextSelected, { color: colors.primary }],
                  ]}
                >
                  {priority}
                </Text>
                {isSelected && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      {/* Notes Bottom Sheet */}
      <BottomSheet
        ref={notesSheetRef}
        visible={notesSheetOpen}
        onClose={() => { setNotesSheetOpen(false); onSheetClose?.(); }}
        title="Patient Notes"
        snapPoint={50}
      >
        <View style={styles.notesContainer}>
          <TextInput
            value={notesText}
            onChangeText={setNotesText}
            placeholder="Enter notes about this patient..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            onFocus={handleNotesInputFocus}
            style={[
              styles.notesInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surface,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              savingNotes && styles.saveButtonDisabled,
            ]}
            onPress={handleNotesSave}
            disabled={savingNotes}
          >
            {savingNotes ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Save Notes</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Specialty Picker Sheet */}
      <SpecialtyPickerSheet
        visible={specialtySheetOpen}
        onClose={() => { setSpecialtySheetOpen(false); onSheetClose?.(); }}
        selectedSpecialties={patient.specialties || []}
        onSelectionChange={handleSpecialtyChange}
        showAvailability={true}
      />

      {/* Role Picker Sheet */}
      <BottomSheet
        visible={rolePickerOpen}
        onClose={() => { setRolePickerOpen(false); onSheetClose?.(); }}
        title="Join Care Team"
        snapPoint={50}
      >
        <View style={styles.optionsList}>
          {availableRoles.map(role => {
            const badgeColor = ROLE_BADGE_COLORS[role];
            return (
              <TouchableOpacity
                key={role}
                style={styles.optionItem}
                onPress={() => handleJoinTeam(role)}
                disabled={isLoading}
              >
                <View>
                  <View style={styles.roleHeader}>
                    <View style={[styles.roleBadge, { backgroundColor: badgeColor.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>{role}</Text>
                    </View>
                    <Text style={[styles.optionText, { color: colors.text }]}>{ROLE_LABELS[role]}</Text>
                  </View>
                  <Text style={[styles.roleDescription, { color: colors.textTertiary }]}>{ROLE_DESCRIPTIONS[role]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionButtonActive: {
    opacity: 0.95,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  takeCaseButton: {
    borderWidth: 0,
  },
  actionButtonWrapper: {
    flex: 1,
    position: 'relative',
  },
  rotatedIconWrapper: {
    transform: [{ rotate: '90deg' }],
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    // color set inline via colors.textInverse
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  hospitalSection: {
    marginBottom: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
  },
  hospitalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  hospitalLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionItemSelected: {
    borderWidth: 1,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  optionTextSelected: {
    fontWeight: typography.fontWeight.semibold,
  },
  notesContainer: {
    gap: spacing.base,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    minHeight: 120,
  },
  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  confirmButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  roleBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  roleDescription: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
});
