// apps/mobile/src/components/patient-chart/video-call/components/PreviousTranscriptsList.tsx
//
// "Previous call transcripts" for the Video section.
//
// Collapsed by default and expanded one at a time: a 25-minute consult is a lot
// of text, and the useful action here is finding one call, not scrolling all of
// them. The full transcript also lives in the Notes tab as a Patient Call note
// — this view exists so a clinician looking at the call log can get to it
// without leaving the section.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronRight, FileText, CircleAlert } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { TranscriptView } from './TranscriptView';
import type { CallTranscript } from '../hooks/useCallTranscripts';

interface PreviousTranscriptsListProps {
  transcripts: CallTranscript[];
  loading: boolean;
  patientName: string;
}

function formatCallDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export const PreviousTranscriptsList: React.FC<PreviousTranscriptsListProps> = ({
  transcripts,
  loading,
  patientName,
}) => {
  const colors = useThemeColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <Text style={[styles.muted, { color: colors.textSecondary }]}>
        Loading transcripts…
      </Text>
    );
  }

  if (transcripts.length === 0) {
    return (
      <Text style={[styles.muted, { color: colors.textSecondary }]}>
        No call transcripts yet.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {transcripts.map(transcript => {
        const isExpanded = expandedId === transcript.noteId;
        const duration = formatDuration(transcript.content.durationSeconds);
        const segmentCount = transcript.content.segments?.length ?? 0;

        return (
          <View
            key={transcript.noteId}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.header}
              onPress={() => setExpandedId(isExpanded ? null : transcript.noteId)}
              activeOpacity={0.7}
            >
              <FileText size={16} color={colors.primary} />
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {formatCallDate(transcript.date)}
                  {duration ? ` · ${duration}` : ''}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {segmentCount > 0
                    ? `${segmentCount} exchange${segmentCount === 1 ? '' : 's'}`
                    : 'No speech captured'}
                  {transcript.draft ? ' · Draft' : ''}
                </Text>
              </View>
              {transcript.content.languageSupported === false && (
                <CircleAlert size={16} color={colors.warning} />
              )}
              {isExpanded ? (
                <ChevronDown size={18} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.body}>
                <TranscriptView
                  content={transcript.content}
                  patientName={patientName}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  muted: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  subtitle: { fontSize: typography.fontSize.xs },
  body: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});

export default PreviousTranscriptsList;
