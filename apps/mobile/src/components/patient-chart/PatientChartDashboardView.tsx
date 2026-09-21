// apps/mobile/src/components/patient-chart/PatientChartDashboardView.tsx
// Dashboard layout: scrollable summary cards with BottomSheet drill-down into sections.
// Notes section expands inline to avoid nested BottomSheetModal conflicts.

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image as RNImage,
  TouchableOpacity,
} from 'react-native';
import {
  User,
  FileText,
  Pill,
  Image as ImageIcon,
  MessageSquare,
  Video,
  Plus,
  Edit2,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  NotebookPen,
} from 'lucide-react-native';
import { usePatientChart } from './PatientChartContext';
import PatientChartContext from './PatientChartContext';
import { MedicationsView } from './medications';
import { useSectionSummaries } from './hooks/useSectionSummaries';
import { SectionSummaryCard } from './SectionSummaryCard';
import { BottomSheet, type BottomSheetHandle } from '../BottomSheet';
import { PatientInfoView } from './patient-info/PatientInfoView';
import { MediaGalleryView } from './media-gallery';
import { TelegramMessagingContainer } from './messaging';
import { VideoCallContainer } from './video-call';
import { NoteCreationSheet } from './notes/NoteCreationSheet';
import { NoteContentDisplay } from './notes/NoteContentDisplay';
import { useNoteFormViewModel } from './notes/useNoteFormViewModel';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import type { Note } from '../../types/notes';
// Shared, not local copies: the previous duplicates were typed
// Record<string, string> and silently went stale whenever a note type was
// added, which is how 'triage' ended up half-supported.
import { NOTE_TYPE_LABELS } from '../../types/notes';
import { getNotePreview } from '@fajr/shared/patient-utils';

// Sections that open via BottomSheet (notes excluded — it expands inline)
type SheetSectionId = 'patient-info' | 'medications' | 'images' | 'messaging' | 'video';

const SECTION_CONFIG: Record<SheetSectionId, { snapPoint: number; title: string }> = {
  'patient-info': { snapPoint: 90, title: 'Patient Info' },
  medications: { snapPoint: 60, title: 'Medications' },
  images: { snapPoint: 90, title: 'Media' },
  messaging: { snapPoint: 90, title: 'Messages' },
  video: { snapPoint: 90, title: 'Video' },
};

interface PatientChartDashboardViewProps {
  contentInsetBottom?: number;
}

export const PatientChartDashboardView: React.FC<PatientChartDashboardViewProps> = ({
  contentInsetBottom,
}) => {
  const colors = useThemeColors();
  const chartContext = usePatientChart();
  const { notes, draftNotes, patientInfo } = chartContext;
  const summaries = useSectionSummaries();

  // Sheet sections (everything except notes)
  const [activeSection, setActiveSection] = useState<SheetSectionId | null>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);

  // Notes inline expansion
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());

  // Note creation sheet (standalone, no nesting)
  const [showNoteCreation, setShowNoteCreation] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const patientId = patientInfo?.id || '';
  const { handleDeleteNote, handlePublishNote } = useNoteFormViewModel(patientId);

  const allNotes = [...notes, ...draftNotes];

  const openSection = useCallback((id: SheetSectionId) => {
    setActiveSection(id);
    sheetRef.current?.snapToIndex(1);
  }, []);

  const closeSection = useCallback(() => {
    setActiveSection(null);
  }, []);

  const toggleNoteExpanded = useCallback((noteId: string) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const handleAddNote = useCallback(() => {
    setEditingNote(undefined);
    setShowNoteCreation(true);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setShowNoteCreation(true);
  }, []);

  const config = activeSection ? SECTION_CONFIG[activeSection] : null;

  const formatDate = (dateStr: Date | string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      // String(...) rather than the raw value: dateStr may be a Date, which is
      // not renderable as a React child.
      return String(dateStr);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { backgroundColor: colors.background },
          contentInsetBottom != null && { paddingBottom: contentInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <SectionSummaryCard
          icon={<User size={20} color={colors.primary} />}
          title="Patient Info"
          color={colors.primary}
          onPress={() => openSection('patient-info')}
        >
          <View style={styles.infoPreview}>
            {summaries.info.status ? (
              <View style={[styles.pill, { backgroundColor: getStatusColor(summaries.info.status) }]}>
                <Text style={[styles.pillText, { color: colors.textInverse }]}>{summaries.info.status}</Text>
              </View>
            ) : null}
            {summaries.info.priority ? (
              <View style={[styles.pill, { backgroundColor: getPriorityColor(summaries.info.priority) }]}>
                <Text style={[styles.pillText, { color: colors.textInverse }]}>{summaries.info.priority}</Text>
              </View>
            ) : null}
            {summaries.info.hospital ? (
              <Text style={[styles.previewMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {summaries.info.hospital}
              </Text>
            ) : null}
          </View>
          {summaries.info.chiefComplaint ? (
            <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={1}>
              CC: {summaries.info.chiefComplaint}
            </Text>
          ) : null}
        </SectionSummaryCard>

        {/* Notes Card — expands inline instead of opening a sheet */}
        <SectionSummaryCard
          icon={<FileText size={20} color="#2a3867" />}
          title="Notes"
          badgeCount={summaries.notes.publishedCount + summaries.notes.draftCount}
          color="#2a3867"
          onPress={() => setNotesExpanded(prev => !prev)}
        >
          {!notesExpanded ? (
            <Text style={[styles.previewText, { color: colors.textSecondary }]}>
              {summaries.notes.publishedCount} published
              {summaries.notes.draftCount > 0 ? `, ${summaries.notes.draftCount} draft` : ''}
              {summaries.notes.latestDate
                ? ` \u00B7 Latest: ${formatDate(summaries.notes.latestDate)}`
                : ''}
            </Text>
          ) : (
            <View style={styles.notesInline}>
              {/* Add Note button */}
              <TouchableOpacity
                style={[styles.addNoteButton, { backgroundColor: colors.primary }]}
                onPress={handleAddNote}
              >
                <Plus size={16} color={colors.textInverse} />
                <Text style={[styles.addNoteButtonText, { color: colors.textInverse }]}>Add Note</Text>
              </TouchableOpacity>

              {allNotes.length === 0 ? (
                <Text style={[styles.notesEmptyText, { color: colors.textTertiary }]}>
                  No notes yet. Tap "Add Note" to create one.
                </Text>
              ) : (
                allNotes.map(note => {
                  const isExpanded = expandedNoteIds.has(note.id);
                  const typeLabel = NOTE_TYPE_LABELS[note.noteType] || note.noteType;

                  return (
                    <View
                      key={note.id}
                      style={[styles.noteItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      {/* Note header — tap to expand/collapse */}
                      <TouchableOpacity
                        style={styles.noteItemHeader}
                        onPress={() => toggleNoteExpanded(note.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.noteItemHeaderLeft}>
                          <Text style={[styles.noteTypeLabel, { color: colors.text }]}>
                            {typeLabel}
                          </Text>
                          {note.draft && (
                            <View style={[styles.draftBadge, { backgroundColor: colors.warning + '30' }]}>
                              <Text style={[styles.draftBadgeText, { color: colors.warning }]}>
                                DRAFT
                              </Text>
                            </View>
                          )}
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={16} color={colors.textSecondary} />
                        ) : (
                          <ChevronDown size={16} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>

                      {/* Preview (collapsed) */}
                      {!isExpanded && (
                        <Text
                          style={[styles.notePreviewText, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {getNotePreview(note)}
                        </Text>
                      )}

                      {/* Full content (expanded) */}
                      {isExpanded && <NoteContentDisplay note={note} />}

                      {/* Date + actions footer */}
                      <View style={[styles.noteItemFooter, { borderTopColor: colors.border }]}>
                        <Text style={[styles.noteDateText, { color: colors.textTertiary }]}>
                          {formatDate(note.date || note.createdAt)}
                          {note.authorName ? ` · ${note.authorName}` : ''}
                        </Text>
                        <View style={styles.noteActions}>
                          <TouchableOpacity
                            style={[styles.noteActionBtn, { backgroundColor: colors.surfaceSecondary }]}
                            onPress={() => handleEditNote(note)}
                          >
                            <Edit2 size={12} color={colors.primary} />
                          </TouchableOpacity>
                          {note.draft && (
                            <TouchableOpacity
                              style={[styles.noteActionBtn, { backgroundColor: colors.surfaceSecondary }]}
                              onPress={() => handlePublishNote(note.id)}
                            >
                              <Send size={12} color={colors.success} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.noteActionBtn, { backgroundColor: colors.surfaceSecondary }]}
                            onPress={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 size={12} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </SectionSummaryCard>

        {/* Triage Dashboard Notes (read-only) */}
        {patientInfo?.dashboardNotes?.trim() ? (
          <SectionSummaryCard
            icon={<NotebookPen size={20} color="#d97706" />}
            title="Triage Notes"
            color="#d97706"
            onPress={() => {}}
          >
            <Text style={[styles.previewText, { color: colors.textSecondary }]}>
              {patientInfo.dashboardNotes}
            </Text>
          </SectionSummaryCard>
        ) : null}

        {/* Medications Card */}
        <SectionSummaryCard
          icon={<Pill size={20} color="#7ba5df" />}
          title="Medications"
          badgeCount={summaries.meds.rxCount + summaries.meds.medCount}
          color="#7ba5df"
          onPress={() => openSection('medications')}
        >
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            {summaries.meds.rxCount} Rx order{summaries.meds.rxCount !== 1 ? 's' : ''}
            {summaries.meds.medCount > 0
              ? `, ${summaries.meds.medCount} med order${summaries.meds.medCount !== 1 ? 's' : ''}`
              : ''}
          </Text>
        </SectionSummaryCard>

        {/* Images Card */}
        <SectionSummaryCard
          icon={<ImageIcon size={20} color="#374a96" />}
          title="Media"
          badgeCount={summaries.images.count}
          color="#374a96"
          onPress={() => openSection('images')}
        >
          {summaries.images.thumbnailUris.length > 0 ? (
            <View style={styles.thumbnailRow}>
              {summaries.images.thumbnailUris.map((uri, idx) => (
                <RNImage
                  key={idx}
                  source={{ uri }}
                  style={[styles.thumbnail, { backgroundColor: colors.border }]}
                  resizeMode="cover"
                />
              ))}
              {summaries.images.count > 4 && (
                <View style={[styles.thumbnailMore, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.thumbnailMoreText, { color: colors.textSecondary }]}>
                    +{summaries.images.count - 4}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.previewText, { color: colors.textSecondary }]}>
              No media yet
            </Text>
          )}
        </SectionSummaryCard>

        {/* Messages Card */}
        <SectionSummaryCard
          icon={<MessageSquare size={20} color="#2880e8" />}
          title="Messages"
          color="#2880e8"
          onPress={() => openSection('messaging')}
        >
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            {summaries.messages.hasChat ? 'Telegram connected' : 'No chat linked'}
          </Text>
        </SectionSummaryCard>

        {/* Video Card */}
        <SectionSummaryCard
          icon={<Video size={20} color={colors.primary} />}
          title="Video"
          badgeCount={summaries.video.callCount}
          color={colors.primary}
          onPress={() => openSection('video')}
        >
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            {summaries.video.callCount === 0
              ? 'No calls yet'
              : `${summaries.video.callCount} call${summaries.video.callCount !== 1 ? 's' : ''}` +
                (summaries.video.lastCallAt
                  ? ` · Last: ${formatDate(summaries.video.lastCallAt)}`
                  : '')}
          </Text>
        </SectionSummaryCard>
      </ScrollView>

      {/* Section Drill-Down Sheet (all sections except notes)
           BottomSheet uses a Portal which breaks the React context tree.
           Re-provide PatientChartContext so section views can access it. */}
      <BottomSheet
        ref={sheetRef}
        visible={activeSection !== null}
        onClose={closeSection}
        title={config?.title || ''}
        snapPoint={config?.snapPoint || 90}
        showHandle={true}
        showCloseButton={true}
        rawContent={activeSection === 'messaging' || activeSection === 'images' || activeSection === 'medications'}
        startExpanded={activeSection === 'images'}
      >
        <PatientChartContext.Provider value={chartContext}>
          {activeSection === 'patient-info' && <PatientInfoView />}
          {activeSection === 'medications' && <MedicationsView />}
          {activeSection === 'images' && <MediaGalleryView insideBottomSheet />}
          {activeSection === 'messaging' && <TelegramMessagingContainer />}
          {activeSection === 'video' && <VideoCallContainer />}
        </PatientChartContext.Provider>
      </BottomSheet>

      {/* Note Creation Sheet — standalone, no nesting inside another BottomSheet */}
      {showNoteCreation && (
        <NoteCreationSheet
          visible={showNoteCreation}
          onClose={() => {
            setShowNoteCreation(false);
            setEditingNote(undefined);
          }}
          patientId={patientId}
          editNote={editingNote}
        />
      )}
    </>
  );
};

// Helpers for status/priority pill colors
function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'active' || lower === 'in treatment') return '#16a34a';
  if (lower === 'discharged') return '#6b7280';
  if (lower === 'in surgery' || lower === 'pre-op') return '#dc2626';
  if (lower === 'post-op') return '#ea580c';
  if (lower === 'follow-up') return '#2563eb';
  return '#6b7280';
}

function getPriorityColor(priority: string): string {
  const lower = priority.toLowerCase();
  if (lower === 'urgent' || lower === 'emergent') return '#dc2626';
  if (lower === 'high') return '#ea580c';
  if (lower === 'medium' || lower === 'moderate') return '#f59e0b';
  if (lower === 'low' || lower === 'routine') return '#16a34a';
  return '#6b7280';
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  infoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pillText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  previewMeta: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
  },
  previewText: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },

  // Inline notes expansion
  notesInline: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addNoteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  notesEmptyText: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  noteItem: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  noteTypeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  draftBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  notePreviewText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  noteItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  noteDateText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 6,
  },
  noteActionBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Other cards
  thumbnailRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: undefined,
  },
  thumbnailMore: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailMoreText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholderContent: {
    padding: spacing.base,
  },
  placeholderTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.base,
  },
  placeholderText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: spacing.xxxl,
  },
});
