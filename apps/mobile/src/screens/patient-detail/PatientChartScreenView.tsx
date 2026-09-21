// apps/mobile/src/screens/patient-detail/PatientChartScreenView.tsx
// Patient chart screen with expandable sections like web app

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  FileText,
  Pill,
  Image as ImageIcon,
  MessageCircle,
  Video,
  ChevronLeft,
} from 'lucide-react-native';
import { PatientDashboardProvider, usePatientDashboard } from '../../contexts/PatientViewModelContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  spacing,
  borderRadius,
  typography,
} from '../../utils/theme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { palette } from '../../utils/colors';
import { getNotePreview } from '@fajr/shared/patient-utils';

interface PatientChartScreenViewProps {
  patientId: string;
  onBack?: () => void;
}

const PatientChartContent: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const colors = useThemeColors();
  const {
    patientInfo,
    patientViewModel,
    loadingPatientInfo,
    notes,
    loadingNotes,
    rxOrders,
    medOrders,
    loadingMedications,
    photos,
  } = usePatientDashboard();

  if (loadingPatientInfo) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.easternBlue[600]} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading patient chart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!patientInfo || !patientViewModel) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Patient not found</Text>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={[styles.backButtonText, { color: colors.textInverse }]}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const primaryDetails = patientViewModel.getPrimaryDetails();
  const expandedDetails = patientViewModel.getExpandedDetails();

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
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{primaryDetails.patientName}</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Patient Info Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <User size={24} color={palette.easternBlue[600]} />
              <CardTitle>Patient Information</CardTitle>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            <View style={styles.patientHeader}>
              <Text style={[styles.patientName, { color: colors.text }]}>{primaryDetails.patientName}</Text>
              <Text style={[styles.patientId, { color: colors.textSecondary }]}>ID: {primaryDetails.patientID}</Text>
            </View>

            <View style={styles.patientDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DOB:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {expandedDetails.dob ? new Date(expandedDetails.dob).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gender:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.gender || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {patientInfo.phone ? `${patientInfo.phone.countryCode} ${patientInfo.phone.phoneNumber}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{patientInfo.email || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>City:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.city || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Country:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.country || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Language:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.language || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.status || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Priority:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.priority || 'N/A'}</Text>
              </View>
              {expandedDetails.chiefComplaint && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Chief Complaint:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{expandedDetails.chiefComplaint}</Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <FileText size={24} color={palette.easternBlue[600]} />
              <CardTitle>Clinical Notes</CardTitle>
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
                  <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.noteContent, { color: colors.text }]} numberOfLines={3}>
                    {/* Shared helper rather than sniffing content keys: this
                        branched on shape, so every new note type fell through
                        to raw JSON. */}
                    {getNotePreview(note)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes recorded</Text>
            )}
          </CardContent>
        </Card>

        {/* Medications Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <Pill size={24} color={palette.easternBlue[600]} />
              <CardTitle>Medications</CardTitle>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.addButton}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            {loadingMedications ? (
              <ActivityIndicator size="small" color={palette.easternBlue[600]} />
            ) : [...rxOrders, ...medOrders].length > 0 ? (
              [...rxOrders, ...medOrders].map((med) => {
                const isRx = 'prescriptions' in med;
                const label = isRx
                  ? 'Prescription Order'
                  : (med as import('../../types/medOrders').MedOrder).prescribingDr || 'Med Request';
                const detail = isRx ? 'Rx Order' : `${(med as import('../../types/medOrders').MedOrder).medications?.length || 0} medication(s)`;
                return (
                  <View key={med.id} style={[styles.medicationItem, { borderBottomColor: colors.divider }]}>
                    <Text style={[styles.medicationName, { color: colors.text }]}>
                      {label}
                    </Text>
                    <Text style={[styles.medicationDetail, { color: colors.textSecondary }]}>
                      {detail}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No medications recorded</Text>
            )}
          </CardContent>
        </Card>

        {/* Images Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <ImageIcon size={24} color={palette.easternBlue[600]} />
              <CardTitle>Images</CardTitle>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.addButton}>+ Upload</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>

          <CardContent>
            {photos.length > 0 ? (
              <View style={styles.imageGrid}>
                {photos.slice(0, 6).map((photo, index) => (
                  <View key={index} style={[styles.imageItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <ImageIcon size={40} color={colors.textSecondary} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No images uploaded</Text>
            )}
          </CardContent>
        </Card>

        {/* Messaging Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <MessageCircle size={24} color={palette.easternBlue[600]} />
              <CardTitle>Messaging</CardTitle>
            </View>
          </CardHeader>

          <CardContent>
            {patientInfo.telegramChatId ? (
              <View style={styles.messagingContainer}>
                <Text style={[styles.messagingText, { color: colors.text }]}>
                  Telegram chat active
                </Text>
                <TouchableOpacity style={styles.messagingButton}>
                  <Text style={[styles.messagingButtonText, { color: colors.textInverse }]}>Open Chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No messaging setup</Text>
            )}
          </CardContent>
        </Card>

        {/* Video Section */}
        <Card style={styles.card} variant="elevated">
          <CardHeader>
            <View style={styles.cardHeaderRow}>
              <Video size={24} color={palette.easternBlue[600]} />
              <CardTitle>Video Call</CardTitle>
            </View>
          </CardHeader>

          <CardContent>
            <View style={styles.videoContainer}>
              <Text style={[styles.videoText, { color: colors.text }]}>
                Start a video consultation
              </Text>
              <TouchableOpacity style={styles.videoButton}>
                <Text style={[styles.videoButtonText, { color: colors.textInverse }]}>Start Call</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export const PatientChartScreenView: React.FC<PatientChartScreenViewProps> = ({
  patientId,
  onBack,
}) => {
  console.log('PatientChartScreenView - patientId:', patientId);

  return (
    <PatientDashboardProvider patientId={patientId}>
      <PatientChartContent onBack={onBack} />
    </PatientDashboardProvider>
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
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
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
  editButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: palette.easternBlue[600],
  },
  addButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: palette.easternBlue[600],
  },
  patientHeader: {
    marginBottom: spacing.lg,
  },
  patientName: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  patientId: {
    fontSize: typography.fontSize.base,
  },
  patientDetails: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    flex: 2,
    textAlign: 'right',
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
  medicationItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  medicationName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  medicationDetail: {
    fontSize: typography.fontSize.sm,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  messagingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  messagingText: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  messagingButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.easternBlue[600],
    borderRadius: borderRadius.lg,
  },
  messagingButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  videoContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  videoText: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.md,
  },
  videoButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.easternBlue[600],
    borderRadius: borderRadius.lg,
  },
  videoButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
});

export default PatientChartScreenView;
