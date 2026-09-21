// apps/mobile/src/screens/patient-detail/PatientDetailScreenView.tsx
// View component for patient detail screen - handles UI rendering

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  FileText,
  Pill,
  Image as ImageIcon,
  AlertCircle,
  ChevronLeft,
  Edit,
  MoreVertical,
} from 'lucide-react-native';
import { usePatientDetailViewModel } from './usePatientDetailViewModel';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Accordion, AccordionItem } from '../../components/ui/Accordion';
import {
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../utils/theme';
import { palette } from '../../utils/colors';
import { useThemeColors } from '../../contexts/ThemeContext';

interface PatientDetailScreenViewProps {
  patientId: string;
  onBack?: () => void;
}

export const PatientDetailScreenView: React.FC<PatientDetailScreenViewProps> = ({
  patientId,
  onBack,
}) => {
  const viewModel = usePatientDetailViewModel(patientId);
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);

  const {
    patientInfo,
    loadingPatientInfo,
    patientError,
    medications,
    loadingMedications,
    notes,
    loadingNotes,
    media,
    loadingMedia,
    refresh,
  } = viewModel;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return palette.red[600];
      case 'medium':
        return palette.orange[600];
      case 'low':
        return palette.green[600];
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in progress':
        return palette.easternBlue[600];
      case 'completed':
        return palette.green[600];
      case 'pending':
        return palette.orange[600];
      default:
        return colors.textSecondary;
    }
  };

  if (loadingPatientInfo) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.easternBlue[600]} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading patient...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (patientError || !patientInfo) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {patientError || 'Patient not found'}
          </Text>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={[styles.backButtonText, { color: colors.textInverse }]}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Patient Chart</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientInfo.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <MoreVertical size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.easternBlue[600]}
          />
        }
      >
        {/* Patient Info Card */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadge}>
                <User size={20} color={palette.easternBlue[600]} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Patient Information</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Edit size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.name || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>DOB:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(patientInfo.dob)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.phone || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.email || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>City:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.city || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Country:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.country || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Priority:</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: getPriorityColor(patientInfo.priority) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: getPriorityColor(patientInfo.priority) },
                    ]}
                  >
                    {patientInfo.priority || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: getStatusColor(patientInfo.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: getStatusColor(patientInfo.status) },
                    ]}
                  >
                    {patientInfo.status || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {patientInfo.chiefComplaint && (
              <View style={[styles.section, { borderTopColor: colors.divider }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Chief Complaint</Text>
                <Text style={[styles.sectionText, { color: colors.text }]}>{patientInfo.chiefComplaint}</Text>
              </View>
            )}

            {patientInfo.diagnosis && (
              <View style={[styles.section, { borderTopColor: colors.divider }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
                <Text style={[styles.sectionText, { color: colors.text }]}>{patientInfo.diagnosis}</Text>
              </View>
            )}

            {patientInfo.allergies && (
              <View style={[styles.section, { borderTopColor: colors.divider }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Allergies</Text>
                <Text style={[styles.sectionText, styles.alertText]}>
                  {patientInfo.allergies}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Medical History Accordion */}
        <Card style={styles.card} variant="elevated">
          <Accordion allowMultiple>
            <AccordionItem
              title="Past Medical History"
              icon={<FileText size={20} color={palette.easternBlue[600]} />}
            >
              <Text style={[styles.accordionContent, { color: colors.text }]}>
                {patientInfo.pmhx || 'No past medical history recorded'}
              </Text>
            </AccordionItem>

            <AccordionItem
              title="Past Surgical History"
              icon={<FileText size={20} color={palette.easternBlue[600]} />}
            >
              <Text style={[styles.accordionContent, { color: colors.text }]}>
                {patientInfo.pshx || 'No past surgical history recorded'}
              </Text>
            </AccordionItem>

            <AccordionItem
              title="Family History"
              icon={<FileText size={20} color={palette.easternBlue[600]} />}
            >
              <Text style={[styles.accordionContent, { color: colors.text }]}>
                {patientInfo.famhx || 'No family history recorded'}
              </Text>
            </AccordionItem>

            <AccordionItem
              title="Social History"
              icon={<FileText size={20} color={palette.easternBlue[600]} />}
            >
              <View style={styles.socialHistory}>
                <Text style={[styles.accordionContent, { color: colors.text }]}>
                  Smoking: {patientInfo.smokeCount || 'None'}
                </Text>
                <Text style={[styles.accordionContent, { color: colors.text }]}>
                  Alcohol: {patientInfo.drinkCount || 'None'}
                </Text>
                {patientInfo.otherDrugs && (
                  <Text style={[styles.accordionContent, { color: colors.text }]}>
                    Other: {patientInfo.otherDrugs}
                  </Text>
                )}
              </View>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Medications Card */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadge}>
                <Pill size={20} color={palette.easternBlue[600]} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Medications</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.addButton}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            {loadingMedications ? (
              <ActivityIndicator size="small" color={palette.easternBlue[600]} />
            ) : medications.length > 0 ? (
              medications.map((med, _index) => (
                <View key={med.id} style={[styles.medicationItem, { borderBottomColor: colors.divider }]}>
                  <View style={styles.medicationHeader}>
                    <Text style={[styles.medicationName, { color: colors.text }]}>{med.name}</Text>
                    {med.status && (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: colors.backgroundSecondary },
                          med.status === 'active' && styles.statusActive,
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: colors.text }]}>{med.status}</Text>
                      </View>
                    )}
                  </View>
                  {med.dosage && (
                    <Text style={[styles.medicationDetail, { color: colors.textSecondary }]}>Dosage: {med.dosage}</Text>
                  )}
                  {med.frequency && (
                    <Text style={[styles.medicationDetail, { color: colors.textSecondary }]}>
                      Frequency: {med.frequency}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No medications recorded</Text>
            )}
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadge}>
                <FileText size={20} color={palette.easternBlue[600]} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Clinical Notes</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.addButton}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            {loadingNotes ? (
              <ActivityIndicator size="small" color={palette.easternBlue[600]} />
            ) : notes.length > 0 ? (
              notes.slice(0, 5).map((note) => (
                <View key={note.id} style={[styles.noteItem, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.noteDate, { color: colors.textSecondary }]}>{formatDate(note.createdAt)}</Text>
                  <Text style={[styles.noteContent, { color: colors.text }]} numberOfLines={3}>
                    {note.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes recorded</Text>
            )}
          </CardContent>
        </Card>

        {/* Media Card */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBadge}>
                <ImageIcon size={20} color={palette.easternBlue[600]} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Media & Documents</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.addButton}>+ Upload</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            {loadingMedia ? (
              <ActivityIndicator size="small" color={palette.easternBlue[600]} />
            ) : media.length > 0 ? (
              <View style={styles.mediaGrid}>
                {media.map((item) => (
                  <View key={item.id} style={[styles.mediaItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <ImageIcon size={40} color={colors.textSecondary} />
                    <Text style={[styles.mediaType, { color: colors.textSecondary }]}>{item.type}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No media uploaded</Text>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.easternBlue[600],
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.massive,
  },
  card: {
    marginBottom: spacing.base,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: palette.easternBlue[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  addButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: palette.easternBlue[600],
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    flex: 2,
    textAlign: 'right',
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
  },
  alertText: {
    color: palette.red[600],
    fontWeight: typography.fontWeight.medium,
  },
  accordionContent: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
  },
  socialHistory: {
    gap: spacing.sm,
  },
  medicationItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medicationName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  medicationDetail: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: palette.green[100],
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  noteItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  noteDate: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  noteContent: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mediaItem: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  mediaType: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
});
