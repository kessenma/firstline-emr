// apps/mobile/src/components/MobilePatientDashboardTable.tsx
// Mobile-optimized patient dashboard table component for React Native

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Globe,
  Stethoscope,
  MessageSquare,
  User,
  UserPlus,
  StickyNote,
  Clipboard,
  Hospital,
} from 'lucide-react-native';
import { Skeleton } from './ui/Skeleton';
import type { PatientWithMessages } from '../types/patient';
import {
  dobToAge,
  formatLocation,
  getStatusColor,
  getPriorityColor,
  formatSpecialties,
} from '../utils/patientUtils';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import { spacing, borderRadius, typography } from '../utils/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { palette } from '../utils/colors';

interface MobilePatientDashboardTableProps {
  data: PatientWithMessages[];
  onRowClick?: (patient: PatientWithMessages) => void;
  renderActions?: (patient: PatientWithMessages) => React.ReactNode;
  activePatientId?: string | null;
  isLoading?: boolean;
}

const ICON_COLOR = palette.orange[700];

export const MobilePatientDashboardTable: React.FC<
  MobilePatientDashboardTableProps
> = ({
  data,
  onRowClick,
  renderActions,
  activePatientId,
  isLoading = false,
}) => {
  const colors = useThemeColors();
  const [navigatingPatientId, setNavigatingPatientId] = useState<string | null>(
    null,
  );

  const handleCardPress = async (patient: PatientWithMessages) => {
    const patientId = patient.id;
    setNavigatingPatientId(patientId);

    try {
      await onRowClick?.(patient);
    } finally {
      setTimeout(() => setNavigatingPatientId(null), 1000);
    }
  };

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Clipboard
          size={48}
          color={colors.textTertiary}
          style={styles.emptyIcon}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No patients found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Check your filters or try refreshing
        </Text>
      </View>
    ),
    [colors],
  );

  const renderItem = useCallback(
    ({ item: patient }: { item: PatientWithMessages }) => {
      const lastName = patient.lastName || '';
      const age = patient.dob ? dobToAge(patient.dob) : '';
      const location = formatLocation(
        patient.city || '',
        patient.country || '',
      );
      const language = patient.language || '';
      const chiefComplaint = patient.chiefComplaint || '';
      const patientId = patient.id || '';
      const status = patient.status || 'Pre-Op / Not Cleared';
      const priority = patient.priority || 'Not Selected';
      const specialty = formatSpecialties(patient.specialties);
      const notes = patient.dashboardNotes || '';
      const hasNotes = notes && notes.trim().length > 0;
      const unreadMessages = patient.unreadMessages || 0;

      const triagedBy =
        patient.triagedBy && typeof patient.triagedBy === 'object'
          ? `${patient.triagedBy.firstName || ''} ${
              patient.triagedBy.lastName || ''
            }`.trim() || 'N/A'
          : 'N/A';

      const leadSurgeon = Array.isArray(patient.careTeam)
        ? patient.careTeam.find((m: any) => m.isLead && m.role === 'surgeon')
        : null;
      const doctor = leadSurgeon
        ? `${leadSurgeon.firstName || ''} ${leadSurgeon.lastName || ''}`.trim() || 'N/A'
        : 'N/A';

      const isActive = activePatientId === patientId;
      const isNavigating = navigatingPatientId === patientId;
      const hasNoTelegram = !patient.telegramChatId;

      const statusColors = getStatusColor(status);
      const priorityColors = getPriorityColor(priority);

      return (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            hasNoTelegram && [styles.cardDisabled, { backgroundColor: colors.surfaceSecondary }],
            isActive && styles.cardActive,
          ]}
          onPress={() => handleCardPress(patient)}
          activeOpacity={0.7}
        >
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              {isNavigating ? (
                <View style={styles.loadingIcon}>
                  <ActivityIndicator size="small" color={ICON_COLOR} />
                </View>
              ) : (
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {lastName.charAt(0).toUpperCase() || 'P'}
                  </Text>
                </View>
              )}
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>{getAnonymizedName(patient.firstName, patient.lastName)}</Text>
                <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
                  {age && `${age} years`}
                  {location && ` • ${location}`}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors.background },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: statusColors.text },
                  ]}
                >
                  {status}
                </Text>
              </View>
              {priority !== 'Not Selected' && (
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: priorityColors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityBadgeText,
                      { color: priorityColors.text },
                    ]}
                  >
                    {priority}
                  </Text>
                </View>
              )}
              {patient.hospital && (
                <View style={styles.hospitalBadge}>
                  <Hospital size={10} color={palette.cello[700]} />
                  <Text style={styles.hospitalBadgeText}>
                    {patient.hospital}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chief Complaint */}
          {chiefComplaint && (
            <View style={styles.chiefComplaintSection}>
              <Text style={styles.chiefComplaintLabel}>Chief Complaint</Text>
              <Text style={styles.chiefComplaintText}>{chiefComplaint}</Text>
            </View>
          )}

          {/* Patient Details Grid */}
          <View style={styles.detailsSection}>
            {/* Row 1 */}
            <View style={styles.detailsRow}>
              <View style={styles.detailsColumn}>
                <View style={styles.detailItem}>
                  <Hospital size={16} color={ICON_COLOR} />
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {patient.hospital || 'Not Assigned'}
                  </Text>
                </View>
                {language && (
                  <View style={styles.detailItem}>
                    <Globe size={16} color={ICON_COLOR} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{language}</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsColumn}>
                <View style={styles.detailItem}>
                  <Stethoscope size={16} color={ICON_COLOR} />
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {specialty}
                  </Text>
                </View>
                {unreadMessages > 0 && (
                  <View style={styles.detailItem}>
                    <MessageSquare size={16} color={ICON_COLOR} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {unreadMessages} unread
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Row 2 - Medical Team */}
            <View style={styles.detailsRow}>
              <View style={styles.detailsColumn}>
                <View style={styles.detailItem}>
                  <User size={16} color={ICON_COLOR} />
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {triagedBy}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsColumn}>
                <View style={styles.detailItem}>
                  <UserPlus size={16} color={ICON_COLOR} />
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {doctor}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notes Section */}
            {hasNotes && (
              <View style={[styles.notesSection, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.notesHeader}>
                  <StickyNote size={16} color={ICON_COLOR} />
                  <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
                </View>
                <Text style={[styles.notesText, { color: colors.text }]}>{notes}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {renderActions && (
            <View style={[styles.actionsSection, { borderTopColor: colors.divider }]}>
              {renderActions(patient)}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [activePatientId, navigatingPatientId, handleCardPress, renderActions, colors],
  );

  if (isLoading) {
    return (
      <View style={styles.contentContainer}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header: avatar + name + badges */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Skeleton width="55%" height={16} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
              </View>
              <View style={styles.headerRight}>
                <Skeleton width={72} height={22} borderRadius={12} />
                <Skeleton width={52} height={22} borderRadius={12} />
              </View>
            </View>
            {/* Chief complaint placeholder */}
            <Skeleton width="85%" height={40} borderRadius={8} style={{ marginBottom: spacing.md }} />
            {/* Details grid */}
            <View style={styles.detailsRow}>
              <View style={styles.detailsColumn}>
                <Skeleton width="70%" height={14} borderRadius={4} />
                <Skeleton width="50%" height={14} borderRadius={4} />
              </View>
              <View style={styles.detailsColumn}>
                <Skeleton width="65%" height={14} borderRadius={4} />
                <Skeleton width="45%" height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      ListEmptyComponent={renderEmptyState}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.massive,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.massive,
  },
  emptyIcon: {
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  cardActive: {
    borderColor: palette.orange[700],
    borderWidth: 2,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.cello[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: palette.cello[700],
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  patientMeta: {
    fontSize: typography.fontSize.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  priorityBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    backgroundColor: palette.cello[50],
    borderWidth: 1,
    borderColor: palette.cello[200],
  },
  hospitalBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: palette.cello[700],
  },
  chiefComplaintSection: {
    backgroundColor: palette.cello[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  chiefComplaintLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: palette.cello[800],
    marginBottom: spacing.xs,
  },
  chiefComplaintText: {
    fontSize: typography.fontSize.base,
    color: palette.cello[900],
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  detailsSection: {
    gap: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailsColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  notesSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  notesLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  notesText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  actionsSection: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
});

export default MobilePatientDashboardTable;
