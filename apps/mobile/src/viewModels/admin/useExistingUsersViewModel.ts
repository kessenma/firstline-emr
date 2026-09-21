// apps/mobile/src/viewModels/admin/useExistingUsersViewModel.ts
// ViewModel for managing existing users in the admin dashboard
// HYBRID APPROACH: Reads from PowerSync via reactive watch (offline-first), writes via API (reliable)

import { useState, useCallback, useMemo } from 'react';
import { adminApi } from '../../utils/admin/adminApi';
import type { ExistingUserSummary } from '../../types/admin';
import { usePowerSync, usePowerSyncQuery } from '../../hooks/powersync';

export type AccountTypeFilter = 'All' | 'Doctor' | 'Triage';

interface UseExistingUsersViewModelReturn {
  // Data
  users: ExistingUserSummary[];
  filteredUsers: ExistingUserSummary[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;

  // Error state
  error: Error | null;

  // Filter state
  accountTypeFilter: AccountTypeFilter;
  searchQuery: string;

  // Actions
  setAccountTypeFilter: (filter: AccountTypeFilter) => void;
  setSearchQuery: (query: string) => void;
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  moveUserToDenied: (userId: string) => Promise<void>;
  updateUser: (
    userId: string,
    data: Partial<ExistingUserSummary>,
  ) => Promise<void>;

  // Computed
  doctorCount: number;
  triageCount: number;
}

// SQLite 3.30+ supports NULLS LAST — keep the ordering identical to the
// previous one-shot query.
const AUTHORIZED_USERS_SQL =
  'SELECT * FROM users WHERE authorized = 1 ORDER BY approval_date DESC NULLS LAST';

const NOT_READY_MESSAGE =
  'Offline sync not available. Please ensure you are logged in as an admin.';

interface AuthorizedUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  city: string | null;
  countries: string | null;
  doctor_specialty: string | null;
  medical_license: string | null;
  created_at: string;
  authorized: number | null;
  approval_date: string | null;
}

// Extra columns kept for the details modal even though they are not part of
// the shared AdminUserSummary type.
type ExistingUserRecord = ExistingUserSummary & {
  city?: string;
  medicalLicense?: string;
  createdAt?: string;
};

// JSON columns arrive as text from PowerSync; a single malformed value must not
// blank the whole list
function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToExistingUser(row: AuthorizedUserRow): ExistingUserRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    accountType: row.account_type as 'Doctor' | 'Triage',
    city: row.city ?? undefined,
    countries: safeParseArray(row.countries),
    doctorSpecialty: safeParseArray(row.doctor_specialty),
    medicalLicense: row.medical_license ?? undefined,
    createdAt: row.created_at,
    authorized: row.authorized === 1,
    approvalDate: row.approval_date ?? undefined,
  };
}

export function useExistingUsersViewModel(): UseExistingUsersViewModelReturn {
  const [accountTypeFilter, setAccountTypeFilter] =
    useState<AccountTypeFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { isInitialized } = usePowerSync();

  // Reactive watch — re-emits whenever the users table changes locally or via
  // sync, so no manual refresh loops are needed.
  const usersQuery = usePowerSyncQuery<AuthorizedUserRow>(
    AUTHORIZED_USERS_SQL,
    [],
    { enabled: isInitialized },
  );

  const users = useMemo<ExistingUserSummary[]>(
    () => (usersQuery.data ?? []).map(mapRowToExistingUser),
    [usersQuery.data],
  );

  const error = useMemo<Error | null>(
    () => (isInitialized ? usersQuery.error : new Error(NOT_READY_MESSAGE)),
    [isInitialized, usersQuery.error],
  );

  // Move user to denied status (via API - hybrid approach). The reactive
  // watch drops the row automatically once the authorized flag change syncs
  // back from the server.
  const moveUserToDenied = useCallback(async (userId: string) => {
    try {
      await adminApi.denyUsers({ userIds: [userId] });
    } catch (err) {
      const denyError = err as Error;
      console.error('[ExistingUsers] Error denying user:', denyError);
      throw denyError;
    }
  }, []);

  // Update user (via API - hybrid approach)
  // TODO: Replace with adminApi.updateUser when update endpoint is added.
  // The reactive watch will pick up the change once it syncs back.
  const updateUser = useCallback(
    async (_userId: string, _data: Partial<ExistingUserSummary>) => {},
    [],
  );

  // Filter users by account type and search query
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by account type
    if (accountTypeFilter !== 'All') {
      filtered = filtered.filter(
        user => user.accountType === accountTypeFilter,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const specialty = user.doctorSpecialty?.join(' ').toLowerCase() || '';

        return (
          fullName.includes(query) ||
          email.includes(query) ||
          specialty.includes(query)
        );
      });
    }

    return filtered;
  }, [users, accountTypeFilter, searchQuery]);

  // Computed counts
  const doctorCount = useMemo(
    () => users.filter(u => u.accountType === 'Doctor').length,
    [users],
  );

  const triageCount = useMemo(
    () => users.filter(u => u.accountType === 'Triage').length,
    [users],
  );

  return {
    users,
    filteredUsers,
    isLoading: usersQuery.isLoading,
    isRefreshing: usersQuery.isRefetching,
    error,
    accountTypeFilter,
    searchQuery,
    setAccountTypeFilter,
    setSearchQuery,
    loadUsers: usersQuery.refetch,
    refreshUsers: usersQuery.refetch,
    moveUserToDenied,
    updateUser,
    doctorCount,
    triageCount,
  };
}
