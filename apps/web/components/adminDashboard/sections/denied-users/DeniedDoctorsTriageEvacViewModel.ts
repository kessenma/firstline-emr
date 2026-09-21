// apps/web/components/auth/adminDashboard/sections/DeniedDoctorsTriageEvacViewModel.tsx
'use client';

import { useState } from 'react';
import { useQueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query'; // ✅ Updated import
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/hooks/useToast';

export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountType: 'Doctor' | 'Triage' | 'Evac';
    doctorSpecialty?: string;
    countries?: string[];
    denialDate?: string;
}

export function useDeniedDoctorsAndTriageViewModel() {
    const { data: session } = useSession();
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isCountryVisible, setIsCountryVisible] = useState(false);
    const [isDoctorSpecialtyVisible, setIsDoctorSpecialtyVisible] = useState(false);
    const queryClient = useQueryClient();
    const { setToast } = useToast();

    const fetchDeniedUsers = async ({ pageParam = 1 }) => {
        const res = await fetch(`/api/admin/GET/denied-users?page=${pageParam}&limit=20`, {
            headers: {
                Authorization: `Bearer ${session?.user.token}`,
            },
        });

        if (!res.ok) throw new Error('Failed to fetch denied users');
        const result = await res.json();

        return {
            users: result.users,
            nextPage: pageParam + 1,
            hasMore: result.totalPages > pageParam,
        };
    };

    const {
        data,
        isLoading: loadingDeniedUsers,
        fetchNextPage: nextDeniedUsers,
        hasNextPage: hasMoreDeniedUsers,
    } = useInfiniteQuery({
        queryKey: ['deniedUsers'], // ✅ Updated query key format
        queryFn: fetchDeniedUsers,
        initialPageParam: 1, // ✅ Required in v5
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
        enabled: !!session?.user.token,
    });

    const deniedUsers = data?.pages.flatMap((page) => page.users) || [];

    const reApproveMutation = useMutation({
        mutationFn: async (userIds: string[]) => {
            const res = await fetch('/api/admin/POST/re-approve-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user.token}`,
                },
                body: JSON.stringify({ userIds }),
            });

            if (!res.ok) throw new Error('Failed to re-approve users');
            return res.json();
        },
        onSuccess: () => {
            setToast({
                title: 'Success',
                description: 'Users re-approved successfully.',
                variant: 'default',
            });
            setSelectedUsers([]);
            queryClient.invalidateQueries({ queryKey: ['deniedUsers'] }); // ✅ Updated invalidateQueries format
        },
        onError: (error: any) => {
            setToast({
                title: 'Error',
                description: error.message || 'Failed to re-approve users.',
                variant: 'destructive',
            });
        },
    });

    const handleReApproveUsers = (userIds?: string[]) => {
        const idsToApprove = userIds || selectedUsers;
        if (idsToApprove.length === 0) {
            setToast({
                title: 'Error',
                description: 'No users selected for re-approval.',
                variant: 'destructive',
            });
            return;
        }
        reApproveMutation.mutate(idsToApprove);
    };

    const handleCheckboxChange = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const toggleCountryVisibility = () => setIsCountryVisible((prev) => !prev);
    const toggleDoctorSpecialtyVisibility = () => setIsDoctorSpecialtyVisible((prev) => !prev);

    return {
        deniedUsers,
        loadingDeniedUsers,
        hasMoreDeniedUsers,
        nextDeniedUsers,
        selectedUsers,
        isCountryVisible,
        isDoctorSpecialtyVisible,
        handleCheckboxChange,
        handleReApproveUsers,
        toggleCountryVisibility,
        toggleDoctorSpecialtyVisibility,
    };
}