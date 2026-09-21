// apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts
// ViewModel for New Signups section - handles state, data fetching, and user actions
// HYBRID APPROACH: Reads from PowerSync via reactive watch (offline-first), writes via API (reliable)

import { useState, useCallback } from 'react';
import { adminApi } from '../../utils/admin/adminApi';
import type { ExistingUserSummary } from '../../types/admin';
import { usePowerSyncPagedList } from '../../hooks/powersync';
import { useSelection } from '../../hooks/useSelection';

export interface NewSignupUser extends ExistingUserSummary {
  // Additional fields specific to new signups
  city?: string;
  medicalLicense?: string;
  createdAt?: string;
}

interface UseNewSignupsViewModelResult {
  // Data
  users: NewSignupUser[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;

  // Pagination
  currentPage: number;
  totalPages: number;
  hasMore: boolean;

  // Selection
  selectedUserIds: string[];
  isAllSelected: boolean;

  // Error handling
  error: string | null;

  // Actions
  fetchUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Selection actions
  toggleUserSelection: (userId: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;

  // User actions
  approveUsers: (userIds: string[]) => Promise<void>;
  denyUsers: (userIds: string[]) => Promise<void>;
  approveSelected: () => Promise<void>;
  denySelected: () => Promise<void>;
}

// Match web API logic: new signups have authorized = NULL or authorized = 0 (false)
const PENDING_COUNT_SQL =
  'SELECT COUNT(*) as count FROM users WHERE authorized IS NULL OR authorized = 0';
const PENDING_USERS_SQL =
  'SELECT * FROM users WHERE (authorized IS NULL OR authorized = 0) ORDER BY created_at DESC LIMIT ?';

interface PendingUserRow {
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
}

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

function mapRowToNewSignupUser(row: PendingUserRow): NewSignupUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    accountType: row.account_type as 'doctor' | 'triage' | 'coordinator',
    city: row.city ?? undefined,
    countries: safeParseArray(row.countries),
    doctorSpecialty: safeParseArray(row.doctor_specialty),
    medicalLicense: row.medical_license ?? undefined,
    createdAt: row.created_at,
    authorized: row.authorized === 1,
  };
}

export function useNewSignupsViewModel(): UseNewSignupsViewModelResult {
  const [actionError, setActionError] = useState<string | null>(null);

  const list = usePowerSyncPagedList<PendingUserRow, NewSignupUser>({
    listSql: PENDING_USERS_SQL,
    countSql: PENDING_COUNT_SQL,
    mapRow: mapRowToNewSignupUser,
    notReadyMessage:
      'Offline sync not available. Please ensure you are logged in as an admin.',
  });

  const selection = useSelection(list.items.map(user => user.id));

  const { hideRows, refresh: refreshList } = list;
  const { clear: clearSelection } = selection;

  const refreshUsers = useCallback(async () => {
    setActionError(null);
    clearSelection();
    await refreshList();
  }, [clearSelection, refreshList]);

  // Approve/deny via API (hybrid approach). The reactive watch picks up the
  // server-side change when it syncs back; until then the rows are hidden
  // optimistically.
  const approveUsers = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) {
        throw new Error('No users selected for approval');
      }

      try {
        await adminApi.approveUsers({ userIds });
        hideRows(userIds);
        clearSelection();
        setActionError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to approve users';
        setActionError(errorMessage);
        throw err;
      }
    },
    [hideRows, clearSelection],
  );

  const denyUsers = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) {
        throw new Error('No users selected for denial');
      }

      try {
        await adminApi.denyUsers({ userIds });
        hideRows(userIds);
        clearSelection();
        setActionError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to deny users';
        setActionError(errorMessage);
        throw err;
      }
    },
    [hideRows, clearSelection],
  );

  const approveSelected = useCallback(async () => {
    await approveUsers(selection.selectedIds);
  }, [selection.selectedIds, approveUsers]);

  const denySelected = useCallback(async () => {
    await denyUsers(selection.selectedIds);
  }, [selection.selectedIds, denyUsers]);

  return {
    // Data
    users: list.items,

    // Loading states
    isLoading: list.isLoading,
    isRefreshing: list.isRefreshing,
    isLoadingMore: list.isLoadingMore,

    // Pagination
    currentPage: list.currentPage,
    totalPages: list.totalPages,
    hasMore: list.hasMore,

    // Selection
    selectedUserIds: selection.selectedIds,
    isAllSelected: selection.isAllSelected,

    // Error handling
    error: actionError ?? list.error,

    // Actions
    fetchUsers: refreshUsers,
    refreshUsers,
    loadMore: list.loadMore,

    // Selection actions
    toggleUserSelection: selection.toggle,
    toggleSelectAll: selection.toggleAll,
    clearSelection: selection.clear,

    // User actions
    approveUsers,
    denyUsers,
    approveSelected,
    denySelected,
  };
}
