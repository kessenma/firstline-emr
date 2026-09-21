// apps/mobile/src/components/messages/PatientCardMessage.tsx
// Renders a patient card inline in a message thread (mobile)

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { User, ExternalLink } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import { parsePatientCard } from '@fajr/shared/patient-share';
import { useChartAccess } from '../../hooks/useChartAccess';
import { PowerSyncService } from '../../services/powersync/PowerSyncService';
import { TABLES } from '../../db/powerSyncSchema';
import { RequestChartAccessSheet } from '../patient-chart/RequestChartAccessSheet';

/** PowerSync stores JSON arrays as text; some rows already arrive parsed. */
function parseJsonArray(value: unknown): any[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
import { spacing, borderRadius, typography } from '../../utils/theme';
import { Badge, BadgeVariant } from '../ui/Badge';
import { PatientDetailBottomSheet } from './PatientDetailBottomSheet';
import { Dialog, DialogContent } from '../ui/Dialog';
import { PatientChartProvider } from '../patient-chart/PatientChartContext';
import { PatientChartView } from '../patient-chart/PatientChartView';

interface PatientCardMessageProps {
  messageText: string;
  isSelf?: boolean;
  onViewChart?: (patientId: string) => void;
}

function getStatusVariant(status: string): BadgeVariant {
  if (!status) return 'secondary';
  if (status.includes('Not Cleared')) return 'destructive';
  if (status.includes('Discharged')) return 'secondary';
  return 'default';
}

function getPriorityVariant(priority: string): BadgeVariant {
  if (!priority || priority === 'Not Selected') return 'secondary';
  if (priority === 'Emergency' || priority === 'Urgent') return 'destructive';
  if (priority === 'Moderate') return 'warning';
  return 'success';
}

export const PatientCardMessage: React.FC<PatientCardMessageProps> = ({
  messageText,
  isSelf,
  onViewChart,
}) => {
  const colors = useThemeColors();
  const checkChartAccess = useChartAccess();
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [blockedAccess, setBlockedAccess] = useState<{
    patientId: string;
    message: string | null;
  } | null>(null);

  const cardData = useMemo(() => parsePatientCard(messageText), [messageText]);

  if (!cardData) {
    return (
      <Text style={{ color: isSelf ? colors.textInverse : colors.text }}>
        [Invalid patient card]
      </Text>
    );
  }

  const openChart = (patientId: string) => {
    if (onViewChart) {
      onViewChart(patientId);
      return;
    }
    setChartVisible(true);
  };

  /**
   * Sharing a patient into a chat must not hand over chart access.
   *
   * This is the single choke point for both mobile paths (the card's own link
   * and the detail sheet's button). Web is covered by the gate on the chart
   * page itself; mobile mounts PatientChartView inline here, so it needs its own.
   *
   * The card payload deliberately carries no careTeam — it would be a stale
   * snapshot — so the live patient is resolved from PowerSync. If that row
   * isn't on the device, fall back to the payload's specialties rather than
   * stranding the user: an in-specialty doctor still passes, and anyone else
   * gets the join prompt.
   */
  const handleViewChart = async (patientId: string) => {
    let specialties: string[] | null = cardData?.specialties ?? null;
    let careTeam: any[] | null = null;

    try {
      const rows = await PowerSyncService.getInstance().query<any>(
        `SELECT specialties, care_team FROM ${TABLES.PATIENTS} WHERE id = ? LIMIT 1`,
        [patientId],
      );
      const row = rows?.[0];
      if (row) {
        specialties = parseJsonArray(row.specialties) ?? specialties;
        careTeam = parseJsonArray(row.care_team);
      }
    } catch (err) {
      console.warn('[PatientCardMessage] access lookup failed, using card payload', err);
    }

    const access = checkChartAccess({ specialties, careTeam } as any);
    if (!access.allowed) {
      setBlockedAccess({ patientId, message: access.message });
      return;
    }
    openChart(patientId);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isSelf
              ? colors.textInverse + '26'
              : colors.backgroundSecondary,
            borderColor: isSelf
              ? colors.textInverse + '40'
              : colors.border,
          },
        ]}
        onPress={() => setDetailSheetVisible(true)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isSelf
                  ? colors.textInverse + '33'
                  : colors.primary + '20',
              },
            ]}
          >
            <User
              size={16}
              color={isSelf ? colors.textInverse : colors.primary}
            />
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={[
                styles.patientName,
                { color: isSelf ? colors.textInverse : colors.text },
              ]}
              numberOfLines={1}
            >
              {getAnonymizedName(cardData.firstName, cardData.lastName)}
            </Text>
            {cardData.hospital ? (
              <Text
                style={[
                  styles.hospital,
                  {
                    color: isSelf
                      ? colors.textInverse + 'B3'
                      : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {cardData.hospital}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {cardData.status ? (
            <Badge variant={getStatusVariant(cardData.status)}>
              {cardData.status}
            </Badge>
          ) : null}
          {cardData.priority && cardData.priority !== 'Not Selected' ? (
            <Badge variant={getPriorityVariant(cardData.priority)}>
              {cardData.priority}
            </Badge>
          ) : null}
        </View>

        {/* Specialties */}
        {cardData.specialties && cardData.specialties.length > 0 ? (
          <View style={styles.specialtyRow}>
            {cardData.specialties.map((s) => (
              <View
                key={s}
                style={[
                  styles.specialtyTag,
                  {
                    backgroundColor: isSelf
                      ? colors.textInverse + '26'
                      : colors.backgroundSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.specialtyText,
                    {
                      color: isSelf
                        ? colors.textInverse + 'CC'
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {s}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Chief Complaint */}
        {cardData.chiefComplaint ? (
          <Text
            style={[
              styles.chiefComplaint,
              {
                color: isSelf
                  ? colors.textInverse + 'CC'
                  : colors.textSecondary,
              },
            ]}
            numberOfLines={2}
          >
            {cardData.chiefComplaint}
          </Text>
        ) : null}

        {/* View Chart link */}
        <TouchableOpacity
          style={styles.viewChartRow}
          onPress={(event) => {
            event.stopPropagation();
            handleViewChart(cardData.patientId);
          }}
        >
          <ExternalLink
            size={12}
            color={isSelf ? colors.textInverse + 'B3' : colors.primary}
          />
          <Text
            style={[
              styles.viewChartText,
              { color: isSelf ? colors.textInverse + 'B3' : colors.primary },
            ]}
          >
            View Full Chart
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      <PatientDetailBottomSheet
        visible={detailSheetVisible}
        onClose={() => setDetailSheetVisible(false)}
        patientId={cardData.patientId}
        onViewChart={handleViewChart}
      />

      <Dialog
        open={chartVisible}
        onOpenChange={(open) => setChartVisible(open)}
      >
        <DialogContent size="lg" scrollable={false} noPadding style={styles.chartDialogContent}>
          <View style={styles.chartContainer}>
            <PatientChartProvider patientId={cardData.patientId}>
              <PatientChartView
                onBack={() => setChartVisible(false)}
                onGoToChatAfterSend={() => setChartVisible(false)}
              />
            </PatientChartProvider>
          </View>
        </DialogContent>
      </Dialog>

      {/* Stays mounted, toggles `visible` — see the BottomSheet rules in
          patient-chart/CLAUDE.md. Renders nothing until presented. */}
      <RequestChartAccessSheet
        visible={!!blockedAccess}
        onClose={() => setBlockedAccess(null)}
        patientId={blockedAccess?.patientId || ''}
        message={blockedAccess?.message}
        onGranted={() => {
          const patientId = blockedAccess?.patientId;
          setBlockedAccess(null);
          if (patientId) openChart(patientId);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    minWidth: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  patientName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  hospital: {
    fontSize: typography.fontSize.xs,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specialtyTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
  },
  chiefComplaint: {
    fontSize: typography.fontSize.sm,
  },
  viewChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  viewChartText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  chartDialogContent: {
    width: '95%',
    maxHeight: '92%',
    minHeight: '82%',
  },
  chartContainer: {
    flex: 1,
    minHeight: 520,
  },
});

export default PatientCardMessage;
