// apps/web/components/adminDashboard/sections/profile-update-requests/ProfileUpdateRequestsViewModel.ts
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/hooks/useToast';
import type { ProfileUpdateRequest } from '@fajr/shared/admin';

export type { ProfileUpdateRequest };

export function useProfileUpdateRequestsViewModel() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token;
  const isAdmin = (session?.user as any)?.isAdmin;
  const queryClient = useQueryClient();
  const { setToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ProfileUpdateRequest | null>(null);

  // Fetch profile update requests
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminProfileUpdateRequests', filterStatus],
    queryFn: async () => {
      const statusParam = filterStatus === 'all' ? '' : `?status=${filterStatus}`;
      const res = await fetch(`/api/admin/profile-update-requests${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch profile update requests');
      }
      return res.json();
    },
    enabled: !!token && !!isAdmin,
  });

  const requests: ProfileUpdateRequest[] = useMemo(() => data?.requests || [], [data]);

  // Filter requests by search term
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;

    const lowerSearch = searchTerm.toLowerCase();
    return requests.filter(
      (req) =>
        req.userName.toLowerCase().includes(lowerSearch) ||
        req.userEmail.toLowerCase().includes(lowerSearch) ||
        req.fieldName.toLowerCase().includes(lowerSearch)
    );
  }, [requests, searchTerm]);

  // Group requests by status
  const requestsByStatus = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending'),
      approved: requests.filter((r) => r.status === 'approved'),
      denied: requests.filter((r) => r.status === 'denied'),
    };
  }, [requests]);

  // Mutation for approving/denying requests
  const reviewRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      reviewNotes,
    }: {
      requestId: string;
      action: 'approve' | 'deny';
      reviewNotes?: string;
    }) => {
      const res = await fetch(`/api/admin/profile-update-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reviewNotes }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${action} request`);
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      setToast({
        title: 'Success',
        description: `Profile update request ${variables.action}d successfully.`,
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['adminProfileUpdateRequests'] });
      queryClient.invalidateQueries({ queryKey: ['existingUsers'] });
      setSelectedRequest(null);
    },
    onError: (error: any, variables) => {
      setToast({
        title: 'Error',
        description: error.message || `Failed to ${variables.action} request.`,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting requests
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/admin/profile-update-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete request');
      }

      return res.json();
    },
    onSuccess: () => {
      setToast({
        title: 'Success',
        description: 'Profile update request deleted successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['adminProfileUpdateRequests'] });
    },
    onError: (error: any) => {
      setToast({
        title: 'Error',
        description: error.message || 'Failed to delete request.',
        variant: 'destructive',
      });
    },
  });

  // Handle approve
  const handleApprove = useCallback(
    (requestId: string, reviewNotes?: string) => {
      if (!isAdmin) {
        setToast({
          title: 'Error',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
        return;
      }
      reviewRequestMutation.mutate({ requestId, action: 'approve', reviewNotes });
    },
    [isAdmin, setToast, reviewRequestMutation]
  );

  // Handle deny
  const handleDeny = useCallback(
    (requestId: string, reviewNotes?: string) => {
      if (!isAdmin) {
        setToast({
          title: 'Error',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
        return;
      }
      reviewRequestMutation.mutate({ requestId, action: 'deny', reviewNotes });
    },
    [isAdmin, setToast, reviewRequestMutation]
  );

  // Handle delete
  const handleDelete = useCallback(
    (requestId: string) => {
      if (!isAdmin) {
        setToast({
          title: 'Error',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
        return;
      }
      deleteRequestMutation.mutate(requestId);
    },
    [isAdmin, setToast, deleteRequestMutation]
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

  return {
    requests: filteredRequests,
    requestsByStatus,
    isLoading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedRequest,
    setSelectedRequest,
    handleApprove,
    handleDeny,
    handleDelete,
    formatValue,
    getFieldDisplayName,
    refetch,
    isProcessing: reviewRequestMutation.isPending || deleteRequestMutation.isPending,
  };
}
