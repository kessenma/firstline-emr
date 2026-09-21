// apps/mobile/src/components/patient-chart/RecipientPicker.tsx
// Tabbed staff picker for "send this patient to…".
//
// Reads the `users` table straight from PowerSync, so all three tabs work
// offline — the staff_directory bucket already syncs account_type,
// doctor_specialty AND missions, so no sync-rule change was needed.
//
// Tab config and filter predicates come from @fajr/shared/patient-share; the
// web picker uses the same ones. Only the rendering is written twice.

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Search, Users, Stethoscope, WifiOff } from 'lucide-react-native';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { TABLES } from '../../db/powerSyncSchema';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../utils/theme';
import { accountTypeLabel } from '../calls/accountTypeIcon';
import {
  getRecipientTabs,
  filterRecipients,
  type RecipientTabId,
  type RecipientUser,
} from '@fajr/shared/patient-share';

interface Props {
  currentUserId: string;
  missionId?: string | null;
  specialty?: string | null;
  selectedUserId?: string | null;
  onSelect: (user: RecipientUser) => void;
  /** Ids the current user already has a DM thread with — those can be sent to
   *  offline; anyone else needs a network call to create the thread. */
  existingThreadUserIds: ReadonlySet<string>;
  isOffline: boolean;
}

function parseJsonArray(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : null;
  } catch {
    return null;
  }
}

export const RecipientPicker: React.FC<Props> = ({
  currentUserId,
  missionId,
  specialty,
  selectedUserId,
  onSelect,
  existingThreadUserIds,
  isOffline,
}) => {
  const colors = useThemeColors();
  const tabs = getRecipientTabs(specialty);
  const firstEnabled = tabs.find(t => !t.disabled)?.id ?? 'triage';
  const [tab, setTab] = React.useState<RecipientTabId>(firstEnabled);
  const [query, setQuery] = React.useState('');

  const usersQuery = usePowerSyncQuery<any>(
    `SELECT id, email, first_name, last_name, account_type, doctor_specialty, missions, image
       FROM ${TABLES.USERS}
      WHERE authorized = 1 AND id != ?
      ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
    [currentUserId],
    { enabled: !!currentUserId },
  );

  const allUsers = React.useMemo<RecipientUser[]>(() => {
    return (usersQuery.data || []).map((row: any) => ({
      id: row.id,
      email: row.email || '',
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      accountType: row.account_type || '',
      image: row.image,
      doctorSpecialty: parseJsonArray(row.doctor_specialty),
      missions: parseJsonArray(row.missions),
    }));
  }, [usersQuery.data]);

  const visible = React.useMemo(() => {
    const byTab = filterRecipients(allUsers, tab, { missionId, specialty });
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter(u =>
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q),
    );
  }, [allUsers, tab, missionId, specialty, query]);

  return (
    <View style={styles.container}>
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {tabs.map(t => {
          const Icon = t.iconName === 'Stethoscope' ? Stethoscope : Users;
          const isActive = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => !t.disabled && setTab(t.id)}
              disabled={t.disabled}
              activeOpacity={0.7}
            >
              <Icon
                size={14}
                color={
                  t.disabled
                    ? colors.textTertiary
                    : isActive
                      ? colors.primary
                      : colors.textSecondary
                }
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: t.disabled
                      ? colors.textTertiary
                      : isActive
                        ? colors.primary
                        : colors.textSecondary,
                  },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.searchRow, { borderColor: colors.border }]}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search staff"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {visible.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {tabs.find(t => t.id === tab)?.disabled
            ? tabs.find(t => t.id === tab)?.disabledReason
            : 'No matching staff.'}
        </Text>
      ) : (
        visible.map(user => {
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
          const isSelected = selectedUserId === user.id;
          // A brand-new conversation needs the server to create the thread.
          const needsNetwork = !existingThreadUserIds.has(user.id);
          const unavailable = isOffline && needsNetwork;

          return (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.row,
                {
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                  backgroundColor: isSelected ? colors.primary + '14' : colors.surface,
                  opacity: unavailable ? 0.45 : 1,
                },
              ]}
              onPress={() => !unavailable && onSelect(user)}
              disabled={unavailable}
              activeOpacity={0.7}
            >
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {accountTypeLabel(user.accountType)}
                  {user.doctorSpecialty?.length
                    ? ` · ${user.doctorSpecialty.join(', ')}`
                    : ''}
                </Text>
              </View>
              {unavailable && <WifiOff size={14} color={colors.textTertiary} />}
            </TouchableOpacity>
          );
        })
      )}

      {isOffline && (
        <Text style={[styles.offlineHint, { color: colors.textTertiary }]}>
          Offline — you can only send to people you already have a chat with.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: typography.fontSize.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowBody: { flex: 1 },
  rowName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  rowSubtitle: { fontSize: typography.fontSize.xs },
  empty: { fontSize: typography.fontSize.sm, paddingVertical: spacing.lg, textAlign: 'center' },
  offlineHint: { fontSize: typography.fontSize.xs, textAlign: 'center' },
});
