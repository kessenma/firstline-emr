// apps/mobile/src/components/calls/CallDirectoryModal.tsx
// Recents + searchable Contacts, for picking who to call.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Search,
  TriangleAlert,
  UserRound,
} from 'lucide-react-native';
import {
  type CallRecent,
  type DirectoryUser,
  displayName,
  formatCallTime,
  formatDuration,
  initialsOf,
  isMissedCall,
} from '@fajr/shared/calls';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { getStoredToken } from '../../utils/storage';
import { useStaffDirectory } from './useStaffDirectory';
import { useCallDirectoryStore } from '../../stores/useCallDirectoryStore';
import { AccountTypeIcon, accountTypeLabel } from './accountTypeIcon';

type DirectoryTab = 'recents' | 'contacts';

/**
 * Why the directory has no data. 'not-deployed' is a 404 — the server is on a
 * build without /api/calls/* — and must not be reported as a failure.
 */
type CallsUnavailable = 'not-deployed' | 'failed';

interface CallDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: DirectoryUser) => void;
  /** Set while a call is being placed, to disable further taps. */
  placingUserId?: string | null;
}

export function CallDirectoryModal({
  visible,
  onClose,
  onSelect,
  placingUserId,
}: CallDirectoryModalProps) {
  const colors = useThemeColors();
  const [tab, setTab] = useState<DirectoryTab>('recents');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Call</Text>
          {/* Balances the Cancel button so the title stays centred. */}
          <View style={styles.headerButton} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(['recents', 'contacts'] as DirectoryTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tab,
                tab === t && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === t ? colors.primary : colors.textSecondary,
                    fontWeight: tab === t ? '600' : '400',
                  },
                ]}
              >
                {t === 'recents' ? 'Recents' : 'Contacts'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'recents' ? (
          <RecentsTab
            active={visible}
            onSelect={onSelect}
            placingUserId={placingUserId}
          />
        ) : (
          <ContactsTab onSelect={onSelect} placingUserId={placingUserId} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

function RecentsTab({
  active,
  onSelect,
  placingUserId,
}: {
  active: boolean;
  onSelect: (user: DirectoryUser) => void;
  placingUserId?: string | null;
}) {
  const colors = useThemeColors();
  const calls = useCallDirectoryStore(s => s.recents);
  const setRecents = useCallDirectoryStore(s => s.setRecents);
  const isStale = useCallDirectoryStore(s => s.isRecentsStale);
  const fetchedAt = useCallDirectoryStore(s => s.recentsFetchedAt);

  // Never loaded on this device. Distinct from "loaded and empty", which is
  // what let the old spinner run forever.
  const neverLoaded = fetchedAt === null;
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<CallsUnavailable | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!isStale()) return; // cached data is fresh — don't touch the network
    let cancelled = false;

    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = await getStoredToken();
        const res = await fetch(getApiUrl('/calls/recents?limit=30'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        // A 404 means the server predates staff calling — that is a deployment
        // state, not a fault, and saying "failed" sends people debugging.
        if (res.status === 404) throw new Error('not-deployed');
        if (!res.ok) throw new Error('request-failed');
        const data = await res.json();
        if (!cancelled) setRecents(data.calls ?? []);
      } catch (err) {
        if (cancelled) return;
        const notDeployed =
          err instanceof Error && err.message === 'not-deployed';
        console.warn('[Calls] recents unavailable:', err);
        setError(notDeployed ? 'not-deployed' : 'failed');
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // isStale/setRecents are stable zustand selectors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Spinner only when there is genuinely nothing to show. A refresh over
  // existing rows happens silently.
  if (neverLoaded && isFetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={
          error ? (
            <TriangleAlert size={56} color={colors.textSecondary} />
          ) : (
            <Phone size={56} color={colors.textSecondary} />
          )
        }
        title={
          error === 'not-deployed'
            ? "Calling isn't available on this server yet"
            : error
              ? 'Could not load recent calls'
              : 'No recent calls'
        }
        subtitle={
          error === 'not-deployed'
            ? 'The server is running a build without staff calling. Contacts still works.'
            : error
              ? 'Contacts still works offline.'
              : 'Find someone in Contacts to place your first call.'
        }
      />
    );
  }

  return (
    <FlashList
      data={calls}
      keyExtractor={item => item.callId}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const other = item.counterparties[0];
        if (!other) return null;

        const extra = item.counterparties.length - 1;
        const missed = isMissedCall(item);
        const DirectionIcon = missed
          ? PhoneMissed
          : item.direction === 'incoming'
            ? PhoneIncoming
            : PhoneOutgoing;

        return (
          <PersonRow
            image={other.image}
            initials={initialsOf(other)}
            title={
              extra > 0 ? `${displayName(other)} +${extra}` : displayName(other)
            }
            subtitleIcon={
              <DirectionIcon
                size={12}
                color={missed ? colors.error : colors.textSecondary}
              />
            }
            subtitle={
              formatCallTime(item.startedAt) +
              (item.durationSeconds
                ? ` · ${formatDuration(item.durationSeconds)}`
                : '')
            }
            subtitleColor={missed ? colors.error : colors.textSecondary}
            email={other.email}
            accountType={other.accountType}
            busy={placingUserId === other.id}
            disabled={!!placingUserId}
            onPress={() =>
              onSelect({
                id: other.id,
                email: other.email,
                firstName: other.firstName,
                lastName: other.lastName,
                accountType: other.accountType,
                image: other.image,
              })
            }
          />
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

function ContactsTab({
  onSelect,
  placingUserId,
}: {
  onSelect: (user: DirectoryUser) => void;
  placingUserId?: string | null;
}) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const { users, loading, source } = useStaffDirectory(query);
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name or email"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {/* Only while there is nothing to show. Revalidating over an
              existing list is silent — a permanently-spinning indicator next
              to the placeholder is what this replaced. */}
          {loading && users.length === 0 && (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          )}
        </View>
        {source === 'powersync' && (
          <Text style={[styles.offlineHint, { color: colors.textSecondary }]}>
            Available offline
          </Text>
        )}
      </View>

      {users.length === 0 && !loading ? (
        <EmptyState
          icon={<UserRound size={56} color={colors.textSecondary} />}
          title={query ? 'No matches' : 'No colleagues found'}
          subtitle={
            query
              ? 'Try a different name or email.'
              : 'Staff will appear here once they sync.'
          }
        />
      ) : (
        <FlashList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <PersonRow
              image={item.image}
              initials={initialsOf(item)}
              title={displayName(item)}
              subtitle={
                accountTypeLabel(item.accountType) +
                (item.doctorSpecialty?.length
                  ? ` · ${item.doctorSpecialty.join(', ')}`
                  : '')
              }
              subtitleColor={colors.textSecondary}
              email={item.email}
              accountType={item.accountType}
              busy={placingUserId === item.id}
              disabled={!!placingUserId}
              onPress={() => onSelect(item)}
            />
          )}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function PersonRow({
  image,
  initials,
  title,
  subtitle,
  subtitleIcon,
  subtitleColor,
  email,
  accountType,
  onPress,
  busy,
  disabled,
}: {
  image?: string | null;
  initials: string;
  title: string;
  subtitle: string;
  subtitleIcon?: React.ReactNode;
  subtitleColor: string;
  /** Third line. Recents rows carry it too, so both tabs read the same. */
  email?: string;
  /** Drives the role icon beside the name. */
  accountType?: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        disabled && !busy && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {initials}
          </Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          {accountType ? (
            <AccountTypeIcon
              accountType={accountType}
              size={13}
              color={colors.textSecondary}
            />
          ) : null}
          <Text
            style={[styles.rowTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={styles.rowSubtitle}>
          {subtitleIcon}
          <Text
            style={[styles.rowSubtitleText, { color: subtitleColor }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        {email ? (
          <Text
            style={[styles.rowEmail, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        ) : null}
      </View>

      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Phone size={18} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: { minWidth: 60 },
  headerButtonText: { fontSize: typography.fontSize.base },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  tabText: { fontSize: typography.fontSize.base },
  searchWrapper: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, padding: 0 },
  offlineHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  listContent: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowDisabled: { opacity: 0.5 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  rowBody: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowEmail: {
    fontSize: typography.fontSize.xs,
    marginTop: 1,
  },
  rowTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  rowSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  rowSubtitleText: { fontSize: typography.fontSize.sm, flexShrink: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
});

export default CallDirectoryModal;
