// apps/web/components/auth/adminDashboard/sections/ExistingDoctorsTriageEvacViewModel.tsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
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
    approvalDate?: string;
    gender: 'Male' | 'Female';
    dob: string;
    languages: string[];
    googleId?: string;
    googleEmail?: string;
    googleImage?: string;
    isAdminCreated?: boolean;
    accountConfirmed?: boolean;
    emailSentDate?: string;
    confirmationToken?: string;
    confirmationTokenExpiry?: Date;
}

export function useExistingDoctorsAndTriageViewModel() {
    const { data: session } = useSession();
    const token = (session?.user as any)?.token;
    const isAdmin = (session?.user as any)?.isAdmin;
    const [isCountryVisible, setIsCountryVisible] = useState(false);
    const [isDoctorSpecialtyVisible, setIsDoctorSpecialtyVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchedUsers, setSearchedUsers] = useState([]);
    const queryClient = useQueryClient();
    const { setToast } = useToast();

    // Fetch existing users
    const { data, isLoading: loadingExistingUsers } = useQuery({
        queryKey: ['existingUsers'],
        queryFn: async () => {
            const res = await fetch(`/api/admin/GET/existing-users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch existing users');
            return res.json();
        },
        enabled: !!(session?.user as any)?.token,
    });

    const existingUsers = useMemo(() => data?.users || [], [data]);

    // Fetch pending users (admin-created accounts not yet confirmed)
    const { data: pendingData, isLoading: loadingPendingUsers } = useQuery({
        queryKey: ['pendingUsers'],
        queryFn: async () => {
            const res = await fetch(`/api/admin-signup/pending-users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch pending users');
            return res.json();
        },
        enabled: !!(session?.user as any)?.token,
    });

    const pendingUsers = useMemo(() => pendingData?.users || [], [pendingData]);

    useEffect(() => {
        if (!searchTerm) {
            setSearchedUsers([]);
            return;
        }

        const fetchUsers = async () => {
            try {
                const response = await fetch(
                    `/api/admin/GET/search-users?email=${encodeURIComponent(searchTerm)}`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const data = await response.json();
                setSearchedUsers(data.users || []);
            } catch (error) {
                console.error('Error fetching users:', error);
                setSearchedUsers([]);
            }
        };

        fetchUsers();
    }, [searchTerm, token]);

    // Mutation for moving users to denied status
    const moveToDeniedMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch('/api/admin/POST/deny-existing-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userIds: [userId] }),
            });
            if (!res.ok) throw new Error('Failed to move user to denied status');
            return res.json();
        },
        onSuccess: () => {
            setToast({
                title: 'Success',
                description: 'User moved to denied status successfully.',
                variant: 'default',
            });
            queryClient.invalidateQueries({ queryKey: ['existingUsers'] }); // ✅ Updated invalidateQueries format
        },
        onError: (error: any) => {
            setToast({
                title: 'Error',
                description: error.message || 'Failed to move user to denied status.',
                variant: 'destructive',
            });
        },
    });

    const handleMoveToDenied = useCallback(
        (userId: string) => {
            if (!isAdmin) {
                setToast({
                    title: 'Error',
                    description: 'You do not have permission to perform this action.',
                    variant: 'destructive',
                });
                return;
            }
            moveToDeniedMutation.mutate(userId);
        },
        [isAdmin, setToast, moveToDeniedMutation]
    );

    const toggleCountryVisibility = useCallback(() => setIsCountryVisible((prev) => !prev), []);
    const toggleDoctorSpecialtyVisibility = useCallback(() => setIsDoctorSpecialtyVisible((prev) => !prev), []);

    // Mutation for editing users
    const editUserMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
            const res = await fetch(`/api/user/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update user');
            return res.json();
        },
        onSuccess: () => {
            setToast({
                title: 'Success',
                description: 'User updated successfully.',
                variant: 'default',
            });
            queryClient.invalidateQueries({ queryKey: ['existingUsers'] });
            setEditingUser(null);
        },
        onError: (error: any) => {
            setToast({
                title: 'Error',
                description: error.message || 'Failed to update user.',
                variant: 'destructive',
            });
        },
    });

    const handleEditUser = useCallback(
        async (userId: string, data: Partial<User>) => {
            if (!isAdmin) {
                setToast({
                    title: 'Error',
                    description: 'You do not have permission to perform this action.',
                    variant: 'destructive',
                });
                return;
            }
            editUserMutation.mutate({ userId, data });
        },
        [isAdmin, setToast, editUserMutation]
    );

    const exportToCSV = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/user/retrieve-all', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error(`Error fetching users: ${response.statusText}`);

            const authorizedUsers: User[] = await response.json();

            if (!Array.isArray(authorizedUsers)) throw new Error('Invalid data format received from the server.');

            const headers = ['Name', 'Email', 'User Type', 'Approval Date', 'Doctor Specialty', 'Country'];
            const csvContent = [
                headers.join(','),
                ...authorizedUsers.map((user: User) =>
                    [`${user.firstName} ${user.lastName}`, user.email, user.accountType, user.approvalDate || 'N/A', user.doctorSpecialty || 'N/A', user.countries?.join(', ') || 'N/A']
                        .map((value) => `"${value.replace(/"/g, '""')}"`)
                        .join(',')
                ),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'existing_users.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
            console.error('Error exporting CSV:', error);
            setToast({
                title: 'Error',
                description: error.message || 'Failed to export CSV.',
                variant: 'destructive',
            });
        }
    }, [token, setToast]);

    // Mutation for sending follow-up emails
    const sendFollowUpMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch('/api/admin-signup/send-follow-up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error('Failed to send follow-up email');
            return res.json();
        },
        onSuccess: () => {
            setToast({
                title: 'Success',
                description: 'Follow-up email sent successfully.',
                variant: 'default',
            });
            queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
        },
        onError: (error: any) => {
            setToast({
                title: 'Error',
                description: error.message || 'Failed to send follow-up email.',
                variant: 'destructive',
            });
        },
    });

    const handleSendFollowUp = useCallback(
        (userId: string) => {
            if (!isAdmin) {
                setToast({
                    title: 'Error',
                    description: 'You do not have permission to perform this action.',
                    variant: 'destructive',
                });
                return;
            }
            sendFollowUpMutation.mutate(userId);
        },
        [isAdmin, setToast, sendFollowUpMutation]
    );

    return {
        existingUsers,
        searchedUsers,
        loadingExistingUsers,
        pendingUsers,
        loadingPendingUsers,
        isCountryVisible,
        isDoctorSpecialtyVisible,
        toggleCountryVisibility,
        toggleDoctorSpecialtyVisibility,
        handleMoveToDenied,
        handleEditUser,
        handleSendFollowUp,
        searchTerm,
        setSearchTerm,
        exportToCSV,
        editingUser,
        setEditingUser,
    };
}