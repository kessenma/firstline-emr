// apps/web/components/adminDashboard/sections/AdminManagementViewModel.tsx
import { useSession } from 'next-auth/react';
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/hooks/useToast';
import type { User } from "@/db/schema/users";

export function useAdminManagementViewModel() {
    const [adminsData, setAdminsData] = useState<User[]>([]);
    const { data: session } = useSession();
    const token = session?.user.token;
    const { setToast, api } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const fetchAllAdmins = useCallback(async () => {
        try {
            const data = await api.get('/api/admin/GET/existing-admins', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            setAdminsData((data as any)?.admins || []);
        } catch (error) {
            console.error('Error fetching admins:', error);
            setToast?.({
                title: 'Error',
                description: 'Failed to fetch admins.',
                variant: 'destructive',
            });
        }
    }, [token, setToast, api]);

    useEffect(() => {
        fetchAllAdmins();
    }, [fetchAllAdmins]);

    const searchUsers = async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            const data = await api.get(`/api/admin/GET/search-users?email=${encodeURIComponent(query)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            setSearchResults((data as any)?.users || []);
        } catch (error) {
            console.error('Error searching users:', error);
            setToast?.({
                title: 'Error',
                description: 'Failed to search users.',
                variant: 'destructive',
            });
        }
    };

    const handleAddAdmin = async (userId: string) => {
        try {
            await api.post(`/api/admin/POST/admin-mgmt-add`, { userId }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            setToast?.({
                title: 'Success',
                description: 'Admin added successfully.',
                variant: 'default',
            });

            await fetchAllAdmins();
        } catch (error) {
            console.error('Error adding admin:', error);
            setToast?.({
                title: 'Error',
                description: 'Failed to add admin.',
                variant: 'destructive',
            });
        }
    };

    const handleRemoveAdmin = async (adminId: string) => {
        try {
            await api.post(`/api/admin/POST/admin-mgmt-remove`, { adminId }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            setToast?.({
                title: 'Success',
                description: 'Admin removed successfully.',
                variant: 'default',
            });

            await fetchAllAdmins();
        } catch (error) {
            console.error('Error removing admin:', error);
            setToast?.({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to remove admin.',
                variant: 'destructive',
            });
        }
    };

    return {
        adminsData,
        searchQuery,
        setSearchQuery,
        searchResults,
        handleAddAdmin,
        handleRemoveAdmin,
        fetchAllAdmins,
        searchUsers,
    };
}

