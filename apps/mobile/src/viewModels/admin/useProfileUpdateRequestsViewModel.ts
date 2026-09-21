// apps/mobile/src/viewModels/admin/useProfileUpdateRequestsViewModel.ts
// ViewModel for profile update requests management
// HYBRID APPROACH: Reads from PowerSync via reactive watch (offline-first), writes via API (reliable)

import { useState, useCallback, useMemo } from 'react';
import { TokenStorage } from '../../services/TokenStorage';
import { getBaseUrl } from '../../config';
import { usePowerSync, usePowerSyncQuery } from '../../hooks/powersync';
import type { ProfileUpdateRequest } from '../../types/admin';

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

interface UseProfileUpdateRequestsViewModelReturn {
  // Data
  requests: ProfileUpdateRequest[];
  requestsByStatus: {
    pending: ProfileUpdateRequest[];
    approved: ProfileUpdateRequest[];
    denied: ProfileUpdateRequest[];
  };

  // Filter & Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;

  // Selected request
  selectedRequest: ProfileUpdateRequest | null;
  setSelectedRequest: (request: ProfileUpdateRequest | null) => void;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isProcessing: boolean;

  // Error
  error: string | null;

  // Actions
  fetchRequests: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  handleApprove: (requestId: string, reviewNotes?: string) => Promise<void>;
  handleDeny: (requestId: string, reviewNotes?: string) => Promise<void>;
  handleDelete: (requestId: string) => Promise<void>;

  // Helpers
  formatValue: (value: any) => string;
  getFieldDisplayName: (fieldName: string) => string;
}

const REQUESTS_SQL =
  'SELECT * FROM user_profile_update_requests ORDER BY requested_at DESC';

const NOT_READY_MESSAGE =
  'Offline sync not available. Please ensure you are logged in as an admin.';

interface ProfileUpdateRequestRow {
  id: string;
  user_id: string;
  field_name: string;
  current_value: string | null;
  requested_value: string | null;
  status: string;
  user_email: string;
  user_name: string;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
}

// JSON columns arrive as text from PowerSync; a single malformed value must
// not blank the whole list
function safeParseJson(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapRowToProfileUpdateRequest(
  row: ProfileUpdateRequestRow,
): ProfileUpdateRequest {
  return {
    id: row.id,
    userId: row.user_id,
    fieldName: row.field_name as 'doctorSpecialty' | 'accountType',
    currentValue: safeParseJson(row.current_value),
    requestedValue: safeParseJson(row.requested_value),
    status: row.status as 'pending' | 'approved' | 'denied',
    userEmail: row.user_email,
    userName: row.user_name,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedByEmail: row.reviewed_by_email ?? undefined,
    reviewedByName: row.reviewed_by_name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useProfileUpdateRequestsViewModel(): UseProfileUpdateRequestsViewModelReturn {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [selectedRequest, setSelectedRequest] =
    useState<ProfileUpdateRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { isInitialized } = usePowerSync();

  // Reactive watch — re-emits whenever the table changes locally or via sync,
  // so approvals/denials show up without manual refresh loops.
  const requestsQuery = usePowerSyncQuery<ProfileUpdateRequestRow>(
    REQUESTS_SQL,
    [],
    { enabled: isInitialized },
  );

  const allRequests = useMemo(
    () => (requestsQuery.data ?? []).map(mapRowToProfileUpdateRequest),
    [requestsQuery.data],
  );

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(() => {
    const token = TokenStorage.getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  // Filter requests by search term
  const filteredRequests = useMemo(() => {
    let filtered = allRequests;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        req =>
          req.userName.toLowerCase().includes(lowerSearch) ||
          req.userEmail.toLowerCase().includes(lowerSearch) ||
          req.fieldName.toLowerCase().includes(lowerSearch),
      );
    }

    return filtered;
  }, [allRequests, filterStatus, searchTerm]);

  // Group requests by status
  const requestsByStatus = useMemo(() => {
    return {
      pending: allRequests.filter(r => r.status === 'pending'),
      approved: allRequests.filter(r => r.status === 'approved'),
      denied: allRequests.filter(r => r.status === 'denied'),
    };
  }, [allRequests]);

  // Approve request (via API - hybrid approach). The reactive watch picks up
  // the status change once it syncs back from the server.
  const handleApprove = useCallback(
    async (requestId: string, reviewNotes?: string) => {
      try {
        setIsProcessing(true);
        setActionError(null);

        const headers = getAuthHeaders();
        const baseUrl = getBaseUrl();

        const response = await fetch(
          `${baseUrl}/api/admin/profile-update-requests/${requestId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ action: 'approve', reviewNotes }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to approve request');
        }

        setSelectedRequest(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to approve request';
        setActionError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAuthHeaders],
  );

  // Deny request (via API - hybrid approach)
  const handleDeny = useCallback(
    async (requestId: string, reviewNotes?: string) => {
      try {
        setIsProcessing(true);
        setActionError(null);

        const headers = getAuthHeaders();
        const baseUrl = getBaseUrl();

        const response = await fetch(
          `${baseUrl}/api/admin/profile-update-requests/${requestId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ action: 'deny', reviewNotes }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to deny request');
        }

        setSelectedRequest(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to deny request';
        setActionError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAuthHeaders],
  );

  // Delete request (via API - hybrid approach)
  const handleDelete = useCallback(
    async (requestId: string) => {
      try {
        setIsProcessing(true);
        setActionError(null);

        const headers = getAuthHeaders();
        const baseUrl = getBaseUrl();

        const response = await fetch(
          `${baseUrl}/api/admin/profile-update-requests/${requestId}`,
          {
            method: 'DELETE',
            headers,
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete request');
        }

        setSelectedRequest(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete request';
        setActionError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAuthHeaders],
  );

  // Format value for display
  const formatValue = useCallback((value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value || 'None');
  }, []);

  // Get field display name
  const getFieldDisplayName = useCallback((fieldName: string): string => {
    const displayNames: Record<string, string> = {
      doctorSpecialty: 'Doctor Specialty',
      accountType: 'Account Type',
    };
    return displayNames[fieldName] || fieldName;
  }, []);

  const error = !isInitialized
    ? NOT_READY_MESSAGE
    : (actionError ?? requestsQuery.error?.message ?? null);

  return {
    requests: filteredRequests,
    requestsByStatus,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedRequest,
    setSelectedRequest,
    isLoading: requestsQuery.isLoading,
    isRefreshing: requestsQuery.isRefetching,
    isProcessing,
    error,
    fetchRequests: requestsQuery.refetch,
    refreshRequests: requestsQuery.refetch,
    handleApprove,
    handleDeny,
    handleDelete,
    formatValue,
    getFieldDisplayName,
  };
}
