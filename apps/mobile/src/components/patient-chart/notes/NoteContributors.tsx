// apps/mobile/src/components/patient-chart/notes/NoteContributors.tsx
// Shows distinct contributors who edited a published note, ordered from least to most contributions.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { usePowerSyncQuery } from '../../../hooks/powersync';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { TABLES } from '../../../db/powerSyncSchema';

interface Contributor {
  editorId: string;
  editorName: string;
  editorAccountType: string | null;
  editorCareTeamRole: string | null;
  editCount: number;
}

interface NoteContributorsProps {
  noteId: string;
}

export const NoteContributors: React.FC<NoteContributorsProps> = React.memo(({ noteId }) => {
  const colors = useThemeColors();

  const query = usePowerSyncQuery<any>(
    `SELECT editor_id, editor_name, editor_account_type, editor_care_team_role, COUNT(*) as edit_count
     FROM ${TABLES.NOTE_EDITS}
     WHERE note_id = ? AND editor_id IS NOT NULL
     GROUP BY editor_id
     ORDER BY edit_count ASC`,
    [noteId],
  );

  const contributors = useMemo((): Contributor[] => {
    if (!query.data) return [];
    return query.data.map((row: any) => ({
      editorId: row.editor_id,
      editorName: row.editor_name || 'Unknown',
      editorAccountType: row.editor_account_type || null,
      editorCareTeamRole: row.editor_care_team_role || null,
      editCount: row.edit_count,
    }));
  }, [query.data]);

  if (contributors.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <Users size={13} color={colors.textTertiary} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          Contributors ({contributors.length})
        </Text>
      </View>
      <View style={styles.list}>
        {contributors.map((c) => (
          <View key={c.editorId} style={styles.row}>
            <Text style={[styles.name, { color: colors.text }]}>
              {c.editorName}
              {(c.editorAccountType || c.editorCareTeamRole) && (
                <Text style={[styles.role, { color: colors.textSecondary }]}>
                  {' '}({[c.editorAccountType, c.editorCareTeamRole].filter(Boolean).join(' / ')})
                </Text>
              )}
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {c.editCount}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

NoteContributors.displayName = 'NoteContributors';

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 4,
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  role: {
    fontSize: 11,
    fontWeight: '400',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
