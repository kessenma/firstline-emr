// apps/web/components/adminDashboard/sections/notifications/AdminNotificationsViewModel.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/hooks/useToast';
import type { AdminNotificationLink, AdminNotificationImage } from '@/db/schema/adminNotifications';

export function useAdminNotifications() {
    const { data: session } = useSession();
    const token = session?.user?.token;
    const { setToast } = useToast();

    const [message, setMessage] = useState('');
    const [type, setType] = useState('announcement');
    const [notifyDoctors, setNotifyDoctors] = useState(false);
    const [notifyTriage, setNotifyTriage] = useState(false);
    const [actionUrl, setActionUrl] = useState('');
    const [description, setDescription] = useState('');
    const [links, setLinks] = useState<AdminNotificationLink[]>([]);
    const [images, setImages] = useState<AdminNotificationImage[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // ✅ Fetch previous admin notifications
    const { data: notifications, refetch } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: async () => {
            const response = await fetch('/api/admin/GET/admin-notifications', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to fetch admin notifications');
            return response.json();
        },
        enabled: !!token,
    });

    // ✅ Sending a notification
    const sendNotification = useMutation({
        mutationFn: async () => {
            if (!message) throw new Error('Message cannot be empty');
            if (!notifyDoctors && !notifyTriage) throw new Error('Select at least one recipient type.');

            const response = await fetch('/api/notifications/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message,
                    type,
                    notifyDoctors,
                    notifyTriage,
                    senderId: session?.user?.id,
                    actionUrl: actionUrl || null,
                    description: description || null,
                    links: links.length > 0 ? links : null,
                    images: images.length > 0 ? images : null,
                }),
            });

            if (!response.ok) throw new Error('Failed to send notification');
            return response.json();
        },
        onSuccess: () => {
            setMessage('');
            setActionUrl('');
            setDescription('');
            setLinks([]);
            setImages([]);
            setToast({
                title: 'Success',
                description: 'Notification sent successfully!',
                variant: 'default',
            });
            refetch();
        },
        onError: (error: any) => {
            setToast({
                title: 'Error',
                description: error.message || 'Failed to send notification.',
                variant: 'destructive',
            });
        },
    });

    const uploadImage = useCallback(async (file: File) => {
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/notifications/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to upload image');
            }

            const result = await response.json();
            setImages(prev => [...prev, result]);
        } catch (error: any) {
            setToast({
                title: 'Upload Error',
                description: error.message || 'Failed to upload image.',
                variant: 'destructive',
            });
        } finally {
            setIsUploadingImage(false);
        }
    }, [token, setToast]);

    const removeImage = useCallback((index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addLink = useCallback(() => {
        setLinks(prev => [...prev, { url: '', displayName: '' }]);
    }, []);

    const updateLink = useCallback((index: number, field: 'url' | 'displayName', value: string) => {
        setLinks(prev => prev.map((link, i) => i === index ? { ...link, [field]: value } : link));
    }, []);

    const removeLink = useCallback((index: number) => {
        setLinks(prev => prev.filter((_, i) => i !== index));
    }, []);

    return {
        message,
        setMessage,
        type,
        setType,
        notifyDoctors,
        setNotifyDoctors,
        notifyTriage,
        setNotifyTriage,
        actionUrl,
        setActionUrl,
        description,
        setDescription,
        links,
        addLink,
        updateLink,
        removeLink,
        images,
        uploadImage,
        removeImage,
        isUploadingImage,
        sendNotification: () => sendNotification.mutate(),
        loading: sendNotification.isPending,
        success: sendNotification.isSuccess,
        error: sendNotification.error ? sendNotification.error.message : null,
        notifications,
    };
}