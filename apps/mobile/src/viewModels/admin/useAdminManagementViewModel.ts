// apps/mobile/src/viewModels/admin/useAdminManagementViewModel.ts
// ViewModel for Admin Management section - handles admin list, search, add/remove actions
// HYBRID APPROACH: Reads from PowerSync via reactive watch (offline-first), writes via API (reliable)

import { useState, useCallback, useMemo } from 'react';
import { PowerSyncService } from '../../services/powersync/PowerSyncService';
import { usePowerSync, usePowerSyncQuery } from '../../hooks/powersync';
import { adminApi } from '../../utils/admin/adminApi';
import type { AdminUser } from '../../types/admin';

interface SearchResultUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface UseAdminManagementViewModelResult {
  // Admin list data
  admins: AdminUser[];
  isLoadingAdmins: boolean;
  adminsError: string | null;

  // User search data
  searchQuery: string;
  searchResults: SearchResultUser[];
  isSearching: boolean;
  searchError: string | null;
  hasSearched: boolean;

  // Action states
  isAddingAdmin: boolean;
  isRemovingAdmin: boolean;

  // Refresh state
  isRefreshing: boolean;

  // Actions
  fetchAdmins: () => Promise<void>;
  refreshAdmins: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  searchUsers: (email: string) => Promise<void>;
  clearSearch: () => void;
  addAdmin: (userId: string) => Promise<void>;
  removeAdmin: (adminId: string) => Promise<void>;

  // Helper computed values
  adminCount: number;
  isAdminEmail: (email: string) => boolean;
}

// Database row type from PowerSync
interface DbAdmin {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

interface DbUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const ADMINS_SQL = 'SELECT * FROM admins ORDER BY created_at DESC';

const NOT_READY_MESSAGE =
  'Offline sync not available. Please ensure you are logged in as an admin.';

function mapRowToAdminUser(row: DbAdmin): AdminUser {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    adminStartDate: row.created_at,
  };
}

export function useAdminManagementViewModel(): UseAdminManagementViewModelResult {
  // Admin list — reactive watch on PowerSync. Rows added/removed via the API
  // appear automatically once they sync back, no manual refetching.
  const { isInitialized } = usePowerSync();
  const adminsQuery = usePowerSyncQuery<DbAdmin>(ADMINS_SQL, [], {
    enabled: isInitialized,
  });

  const admins = useMemo(
    () => (adminsQuery.data ?? []).map(mapRowToAdminUser),
    [adminsQuery.data],
  );

  const isLoadingAdmins =
    isInitialized && adminsQuery.loading && adminsQuery.data === undefined;
  const isRefreshing = adminsQuery.isRefetching;
  const adminsError = !isInitialized
    ? NOT_READY_MESSAGE
    : (adminsQuery.error?.message ?? null);

  // Restarting the watch doubles as manual fetch/refresh for pull-to-refresh
  const { refetch: refetchAdmins } = adminsQuery;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Action states
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isRemovingAdmin, setIsRemovingAdmin] = useState(false);

  // Search users by email - imperative one-shot local PowerSync search with API fallback
  const searchUsers = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        setSearchError('Please enter an email to search');
        return;
      }

      try {
        setIsSearching(true);
        setSearchError(null);
        setHasSearched(true);

        const powerSync = PowerSyncService.getInstance();

        // Try local search first if PowerSync is ready
        if (powerSync.isReady()) {
          console.log('[AdminManagement] Searching users locally via PowerSync...');

          // Search users locally - case insensitive LIKE query
          const searchPattern = `%${email.toLowerCase()}%`;
          const dbUsers = await powerSync.query<DbUser>(
            'SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) LIKE ? AND authorized = 1 LIMIT 10',
            [searchPattern]
          );

          console.log('[AdminManagement] Local search results:', dbUsers.length);

          const transformedResults: SearchResultUser[] = dbUsers.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
          }));

          setSearchResults(transformedResults);

          if (transformedResults.length === 0) {
            setSearchError('No users found with that email');
          }
        } else {
          // Fallback to API if PowerSync not ready
          console.log('[AdminManagement] PowerSync not ready, falling back to API search');
          const response = await adminApi.searchUsersByEmail(email);
          setSearchResults(response.users);

          if (response.users.length === 0) {
            setSearchError('No users found with that email');
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search users';
        setSearchError(errorMessage);
        console.error('[AdminManagement] Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
  }, []);

  // Add admin via API (hybrid approach - writes go through API).
  // The watch on `admins` picks up the new row when it syncs back.
  const addAdmin = useCallback(
    async (userId: string) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      try {
        setIsAddingAdmin(true);

        console.log('[AdminManagement] Adding admin via API:', userId);

        await adminApi.addAdmin({ userId });

        console.log('[AdminManagement] Admin added successfully');

        // Clear search after successful add
        clearSearch();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add admin';
        console.error('[AdminManagement] Error adding admin:', err);
        throw new Error(errorMessage);
      } finally {
        setIsAddingAdmin(false);
      }
    },
    [clearSearch]
  );

  // Remove admin via API (hybrid approach - writes go through API).
  // The watch on `admins` drops the row when the deletion syncs back.
  const removeAdmin = useCallback(
    async (adminId: string) => {
      if (!adminId) {
        throw new Error('Admin ID is required');
      }

      try {
        setIsRemovingAdmin(true);

        console.log('[AdminManagement] Removing admin via API:', adminId);

        await adminApi.removeAdmin({ adminId });

        console.log('[AdminManagement] Admin removed successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove admin';
        console.error('[AdminManagement] Error removing admin:', err);
        throw new Error(errorMessage);
      } finally {
        setIsRemovingAdmin(false);
      }
    },
    []
  );

  // Computed: Admin count
  const adminCount = admins.length;

  // Computed: Check if email is already an admin
  const isAdminEmail = useCallback(
    (email: string): boolean => {
      return admins.some(
        admin => admin.email.toLowerCase() === email.toLowerCase()
      );
    },
    [admins]
  );

  return {
    // Admin list data
    admins,
    isLoadingAdmins,
    adminsError,

    // User search data
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    hasSearched,

    // Action states
    isAddingAdmin,
    isRemovingAdmin,

    // Refresh state
    isRefreshing,

    // Actions
    fetchAdmins: refetchAdmins,
    refreshAdmins: refetchAdmins,
    setSearchQuery,
    searchUsers,
    clearSearch,
    addAdmin,
    removeAdmin,

    // Helper computed values
    adminCount,
    isAdminEmail,
  };
}
