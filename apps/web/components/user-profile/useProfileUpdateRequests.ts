// components/user-profile/useProfileUpdateRequests.ts
'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { ProfileUpdateRequest } from '@fajr/shared/admin';

export type { ProfileUpdateRequest };

interface CreateRequestParams {
  fieldName: 'doctorSpecialty' | 'accountType';
  currentValue: any;
  requestedValue: any;
}

export function useProfileUpdateRequests() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token;
  const queryClient = useQueryClient();

  // Fetch user's profile update requests
  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profileUpdateRequests', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/profile-update-requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch profile update requests');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const requests: ProfileUpdateRequest[] = requestsData?.requests || [];

  // Get pending requests by field
  const getPendingRequestByField = useCallback(
    (fieldName: 'doctorSpecialty' | 'accountType'): ProfileUpdateRequest | undefined => {
      return requests.find(
        (req) => req.fieldName === fieldName && req.status === 'pending'
      );
    },
    [requests]
  );

  // Check if field has pending request
  const hasPendingRequest = useCallback(
    (fieldName: 'doctorSpecialty' | 'accountType'): boolean => {
      return !!getPendingRequestByField(fieldName);
    },
    [getPendingRequestByField]
  );

  // Create a new profile update request
  const createRequestMutation = useMutation({
    mutationFn: async (params: CreateRequestParams) => {
      const res = await fetch('/api/profile-update-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create profile update request');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profileUpdateRequests'] });
    },
  });

  // Create request wrapper with error handling
  const createRequest = useCallback(
    async (params: CreateRequestParams) => {
      try {
        const result = await createRequestMutation.mutateAsync(params);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    [createRequestMutation]
  );

  return {
    requests,
    isLoading,
    error,
    refetch,
    getPendingRequestByField,
    hasPendingRequest,
    createRequest,
    isCreating: createRequestMutation.isPending,
  };
}
