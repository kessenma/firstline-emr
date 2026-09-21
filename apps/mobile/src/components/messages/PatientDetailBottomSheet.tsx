// apps/mobile/src/components/messages/PatientDetailBottomSheet.tsx
// Bottom sheet that shows patient details when tapping a patient card in messages
// Queries local PowerSync SQLite — works fully offline

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { Badge, BadgeVariant } from '../ui/Badge';
import { BottomSheet } from '../BottomSheet';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import { TABLES } from '../../db';

interface PatientDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
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

export const PatientDetailBottomSheet: React.FC<PatientDetailBottomSheetProps> = ({
  visible,
  onClose,
  patientId,
  onViewChart,
}) => {
  const colors = useThemeColors();

  const patientQuery = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.PATIENTS} WHERE id = ? LIMIT 1`,
    [patientId],
    { enabled: visible && !!patientId },
  );
  const notesQuery = usePowerSyncQuery<any>(
    `SELECT id, note_type, date, author_name, content, draft
     FROM ${TABLES.NOTES}
     WHERE patient_id = ?
       AND (draft = 0 OR draft IS NULL)
     ORDER BY date DESC
     LIMIT 3`,
    [patientId],
    { enabled: visible && !!patientId },
  );

  const patient = useMemo(() => {
    const row = patientQuery.data?.[0];
    if (!row) return null;

    let specialties: string[] | undefined;
    if (row.specialties) {
      try {
        specialties =
          typeof row.specialties === 'string'
            ? JSON.parse(row.specialties)
            : row.specialties;
      } catch {
        specialties = undefined;
      }
    }

    return {
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      status: row.status,
      priority: row.priority,
      specialties,
      chiefComplaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      gender: row.gender,
      country: row.country,
      city: row.city,
      language: row.language,
      dob: row.dob,
      phone: (() => {
        if (!row.phone) return '';
        if (typeof row.phone === 'string') {
          try {
            const parsed = JSON.parse(row.phone);
            if (parsed?.countryCode || parsed?.phoneNumber) {
              return `${parsed.countryCode || ''} ${parsed.phoneNumber || ''}`.trim();
            }
            return row.phone;
          } catch {
            return row.phone;
          }
        }
        if (row.phone.countryCode || row.phone.phoneNumber) {
          return `${row.phone.countryCode || ''} ${row.phone.phoneNumber || ''}`.trim();
        }
        return '';
      })(),
      email: row.email,
      telegramChatId: row.telegram_chat_id,
      createdAt: row.created_at,
      allergies: row.allergies,
    };
  }, [patientQuery.data]);
  const recentNotes = useMemo(() => {
    const rows = notesQuery.data || [];
    return rows.map((row: any) => {
      let content: any = row.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          content = row.content;
        }
      }

      let preview = 'No content';
      if (typeof content === 'string') {
        preview = content;
      } else if (content && typeof content === 'object') {
        if (row.note_type === 'subjective' && content.subjective) {
          preview = content.subjective;
        } else if (row.note_type === 'procedure' && content.procedureName) {
          preview = content.procedureName;
        } else if (row.note_type === 'blank' && content.noteField) {
          preview = content.noteField;
        } else if (row.note_type === 'triage' && content.triageDetails) {
          preview = content.triageDetails;
        } else if (row.note_type === 'patient_call') {
          const count = Array.isArray(content.segments) ? content.segments.length : 0;
          preview =
            count > 0
              ? `Call transcript · ${count} exchange${count === 1 ? '' : 's'}`
              : 'Call transcript — no speech captured';
        } else {
          preview = JSON.stringify(content);
        }
      }

      return {
        id: row.id,
        type: row.note_type || 'note',
        date: row.date,
        author: row.author_name || 'Unknown',
        preview,
      };
    });
  }, [notesQuery.data]);

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | undefined | null;
  }) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Patient Details"
      snapPoint={75}
    >
      {patientQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !patient ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Patient not found in local data
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Name + Badges */}
          <View style={styles.headerSection}>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {getAnonymizedName(patient.firstName, patient.lastName)}
            </Text>
            <View style={styles.badgeRow}>
              {patient.status ? (
                <Badge variant={getStatusVariant(patient.status)}>
                  {patient.status}
                </Badge>
              ) : null}
              {patient.priority && patient.priority !== 'Not Selected' ? (
                <Badge variant={getPriorityVariant(patient.priority)}>
                  {patient.priority}
                </Badge>
              ) : null}
              {patient.telegramChatId ? (
                <Badge variant="outline">Telegram</Badge>
              ) : null}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Personal Info */}
          <Section title="Quick Info">
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow
              label="Date of Birth"
              value={
                patient.dob
                  ? new Date(patient.dob).toLocaleDateString()
                  : undefined
              }
            />
            <InfoRow
              label="Location"
              value={
                [patient.city, patient.country].filter(Boolean).join(', ') ||
                undefined
              }
            />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Email" value={patient.email} />
            <InfoRow label="Language" value={patient.language} />
          </Section>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Clinical Snapshot */}
          <Section title="Clinical Snapshot">
            <InfoRow label="Chief Complaint" value={patient.chiefComplaint} />
            <InfoRow label="Diagnosis" value={patient.diagnosis} />
            <InfoRow label="Allergies" value={patient.allergies} />
            {patient.specialties && patient.specialties.length > 0 ? (
              <View style={styles.infoRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Specialties
                </Text>
                <View style={styles.specialtyRow}>
                  {patient.specialties.map((s: string) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </View>
              </View>
            ) : null}
          </Section>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <Section title="Recent Notes">
            {notesQuery.isLoading ? (
              <View style={styles.notesLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : recentNotes.length > 0 ? (
              <View style={styles.notesList}>
                {recentNotes.map((note) => (
                  <View
                    key={note.id}
                    style={[
                      styles.noteItem,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.noteHeader}>
                      <Text style={[styles.noteType, { color: colors.text }]}>
                        {note.type}
                      </Text>
                      <Text
                        style={[styles.noteDate, { color: colors.textSecondary }]}
                      >
                        {note.date ? new Date(note.date).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text
                      style={[styles.notePreview, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {note.preview}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No notes yet
              </Text>
            )}
          </Section>

          <InfoRow
            label="Added"
            value={
              patient.createdAt
                ? new Date(patient.createdAt).toLocaleDateString()
                : undefined
            }
          />

          {/* View Chart Button */}
          {onViewChart && (
            <TouchableOpacity
              style={[
                styles.viewChartButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  onViewChart(patient.id);
                }, 180);
              }}
              activeOpacity={0.8}
            >
              <ExternalLink size={16} color={colors.textInverse} />
              <Text style={[styles.viewChartButtonText, { color: colors.textInverse }]}>
                Open Full Patient Chart
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  content: {
    gap: spacing.md,
  },
  headerSection: {
    gap: spacing.sm,
  },
  patientName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  infoRow: {
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  notesLoading: {
    paddingVertical: spacing.sm,
  },
  notesList: {
    gap: spacing.sm,
  },
  noteItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteType: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  noteDate: {
    fontSize: typography.fontSize.xs,
  },
  notePreview: {
    fontSize: typography.fontSize.sm,
  },
  viewChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  viewChartButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default PatientDetailBottomSheet;
