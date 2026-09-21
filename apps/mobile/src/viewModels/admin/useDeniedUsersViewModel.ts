// apps/mobile/src/viewModels/admin/useDeniedUsersViewModel.ts
// ViewModel for Denied Users section - handles denied users management
// HYBRID APPROACH: Reads from PowerSync via reactive watch (offline-first), writes via API (reliable)

import { useState, useCallback } from 'react';
import { adminApi } from '../../utils/admin/adminApi';
import type { ExistingUserSummary } from '../../types/admin';
import { usePowerSyncPagedList } from '../../hooks/powersync';
import { useSelection } from '../../hooks/useSelection';

export interface DeniedUser extends ExistingUserSummary {
  denialDate?: string | Date;
}

interface UseDeniedUsersViewModelResult {
  // Data
  users: DeniedUser[];

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
  reinstateUsers: (userIds: string[]) => Promise<void>;
  reinstateSelected: () => Promise<void>;
}

const DENIED_COUNT_SQL =
  'SELECT COUNT(*) as count FROM users WHERE authorized = 0 AND denial_date IS NOT NULL';
const DENIED_USERS_SQL =
  'SELECT * FROM users WHERE authorized = 0 AND denial_date IS NOT NULL ORDER BY denial_date DESC LIMIT ?';

// Database row type from PowerSync
interface DeniedUserRow {
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
  authorized: number;
  approval_date: string | null;
  denial_date: string | null;
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

function mapRowToDeniedUser(row: DeniedUserRow): DeniedUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    accountType: row.account_type,
    countries: safeParseArray(row.countries),
    doctorSpecialty: safeParseArray(row.doctor_specialty),
    authorized: row.authorized === 1,
    approvalDate: row.approval_date ?? undefined,
    denialDate: row.denial_date ?? undefined,
  };
}

export function useDeniedUsersViewModel(): UseDeniedUsersViewModelResult {
  const [actionError, setActionError] = useState<string | null>(null);

  const list = usePowerSyncPagedList<DeniedUserRow, DeniedUser>({
    listSql: DENIED_USERS_SQL,
    countSql: DENIED_COUNT_SQL,
    mapRow: mapRowToDeniedUser,
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

  // Reinstate via API (hybrid approach). The reactive watch picks up the
  // server-side change when it syncs back; until then the rows are hidden
  // optimistically.
  const reinstateUsers = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) {
        throw new Error('No users selected for reinstatement');
      }

      try {
        await adminApi.reApproveUsers({ userIds });
        hideRows(userIds);
        clearSelection();
        setActionError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to reinstate users';
        setActionError(errorMessage);
        throw err;
      }
    },
    [hideRows, clearSelection],
  );

  const reinstateSelected = useCallback(async () => {
    await reinstateUsers(selection.selectedIds);
  }, [selection.selectedIds, reinstateUsers]);

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
    reinstateUsers,
    reinstateSelected,
  };
}
