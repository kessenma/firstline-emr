// apps/mobile/src/components/patient-chart/video-call/components/CallHistoryList.tsx
//
// Past consults for this patient. Reads from PowerSync via PatientChartContext,
// so it still renders with no connectivity.
//
// Duration and status labels come from @fajr/shared/video-call — the same
// formatters the web chart uses, so the two never drift.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Video as VideoIcon, PhoneMissed } from 'lucide-react-native';
import {
  VIDEO_CALL_STATUS_LABELS,
  formatCallDuration,
  type VideoCallSession,
} from '@fajr/shared/video-call';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';

interface CallHistoryListProps {
  sessions: VideoCallSession[];
  loading: boolean;
  onSaveNotes: (sessionId: string, notes: string) => Promise<boolean>;
}

const formatWhen = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const CallHistoryList: React.FC<CallHistoryListProps> = ({
  sessions,
  loading,
  onSaveNotes,
}) => {
  const colors = useThemeColors();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (sessionId: string) => {
    setSaving(true);
    const ok = await onSaveNotes(sessionId, draft);
    setSaving(false);
    if (ok) setEditingId(null);
  };

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textTertiary }]}>
        No video calls with this patient yet.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {sessions.map((session) => {
        const missed = session.status === 'missed';
        const isEditing = editingId === session.id;

        return (
          <View
            key={session.id}
            style={[
              styles.item,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.itemRow}>
              {missed ? (
                <PhoneMissed size={16} color={colors.error} />
              ) : (
                <VideoIcon size={16} color={colors.primary} />
              )}

              <View style={styles.itemBody}>
                <Text style={[styles.when, { color: colors.text }]}>
                  {formatWhen(session.startedAt ?? session.createdAt)}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {missed
                    ? VIDEO_CALL_STATUS_LABELS[session.status]
                    : formatCallDuration(session.durationSeconds)}
                </Text>
              </View>

              {session.status !== 'pending' && (
                <TouchableOpacity
                  onPress={() => {
                    if (isEditing) {
                      setEditingId(null);
                    } else {
                      setEditingId(session.id);
                      setDraft(session.callNotes ?? '');
                    }
                  }}
                >
                  <Text style={[styles.link, { color: colors.primary }]}>
                    {session.callNotes ? 'Edit' : 'Note'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editor}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="What was discussed?"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                    },
                  ]}
                />
                <View style={styles.editorActions}>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => void save(session.id)}
                    disabled={saving}
                  >
                    <Text
                      style={[styles.saveText, { color: colors.textInverse }]}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={[styles.link, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              !!session.callNotes && (
                <Text style={[styles.notes, { color: colors.textSecondary }]}>
                  {session.callNotes}
                </Text>
              )
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  centered: { paddingVertical: spacing.lg, alignItems: 'center' },
  empty: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  item: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemBody: { flex: 1 },
  when: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  meta: { fontSize: typography.fontSize.xs, marginTop: 1 },
  link: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  notes: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    paddingLeft: spacing.lg,
  },
  editor: { marginTop: spacing.xs, gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: typography.fontSize.sm,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.sm,
  },
  saveText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default CallHistoryList;
