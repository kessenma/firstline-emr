// apps/mobile/src/viewModels/admin/useNotificationsViewModel.ts
// ViewModel for admin notifications functionality
// HYBRID APPROACH: Reads history from PowerSync via reactive watch (offline-first), sends via API (reliable)

import { useState, useCallback, useMemo } from 'react';
import { usePowerSync, usePowerSyncQuery } from '../../hooks/powersync';
import { TokenStorage } from '../../services/TokenStorage';
import { getBaseUrl } from '../../config';

interface AdminNotificationLink {
  url: string;
  displayName: string;
}

interface AdminNotificationImage {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

interface AdminNotification {
  id: string;
  message: string;
  type: 'announcement' | 'alert' | 'reminder';
  senderId: string;
  senderName?: string;
  notifyDoctors: boolean;
  notifyTriage: boolean;
  actionUrl?: string;
  description?: string;
  links?: AdminNotificationLink[];
  images?: AdminNotificationImage[];
  createdAt: string;
}

interface UseNotificationsViewModelReturn {
  // Form state
  message: string;
  setMessage: (message: string) => void;
  type: 'announcement' | 'alert' | 'reminder';
  setType: (type: 'announcement' | 'alert' | 'reminder') => void;
  notifyDoctors: boolean;
  setNotifyDoctors: (notify: boolean) => void;
  notifyTriage: boolean;
  setNotifyTriage: (notify: boolean) => void;
  actionUrl: string;
  setActionUrl: (url: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  links: AdminNotificationLink[];
  addLink: () => void;
  updateLink: (index: number, field: 'url' | 'displayName', value: string) => void;
  removeLink: (index: number) => void;
  images: AdminNotificationImage[];
  uploadImage: (file: { uri: string; name: string; type: string }) => Promise<void>;
  removeImage: (index: number) => void;
  isUploadingImage: boolean;

  // Notification history
  notifications: AdminNotification[];

  // Loading states
  isSending: boolean;
  isLoadingHistory: boolean;
  isRefreshing: boolean;

  // Error state
  error: Error | null;

  // Actions
  sendNotification: () => Promise<void>;
  fetchNotificationHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearForm: () => void;

  // Validation
  canSend: boolean;
}

// Database row type from PowerSync
interface DbAdminNotification {
  id: string;
  title: string | null;
  message: string;
  type: string;
  sender_id: string;
  notify_doctors: number;
  notify_triage: number;
  action_url: string | null;
  description: string | null;
  links: string | null;
  images: string | null;
  created_at: string;
}

const HISTORY_SQL =
  'SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50';

const NOT_READY_ERROR = new Error('Offline sync not available.');

// JSON columns arrive as text from PowerSync; a single malformed value must not
// blank the whole list
function safeParseArray<T>(value: string | null): T[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

function mapRowToAdminNotification(row: DbAdminNotification): AdminNotification {
  return {
    id: row.id,
    message: row.message,
    type: row.type as 'announcement' | 'alert' | 'reminder',
    senderId: row.sender_id,
    notifyDoctors: row.notify_doctors === 1,
    notifyTriage: row.notify_triage === 1,
    actionUrl: row.action_url ?? undefined,
    description: row.description ?? undefined,
    links: safeParseArray<AdminNotificationLink>(row.links),
    images: safeParseArray<AdminNotificationImage>(row.images),
    createdAt: row.created_at,
  };
}

export function useNotificationsViewModel(): UseNotificationsViewModelReturn {
  // Form state
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'alert' | 'reminder'>('announcement');
  const [notifyDoctors, setNotifyDoctors] = useState(false);
  const [notifyTriage, setNotifyTriage] = useState(false);
  const [actionUrl, setActionUrl] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<AdminNotificationLink[]>([]);
  const [images, setImages] = useState<AdminNotificationImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Mutation states
  const [isSending, setIsSending] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  // Notification history — reactive watch on PowerSync. New rows (including
  // notifications sent from this device once they sync back) appear
  // automatically without manual refetching.
  const { isInitialized } = usePowerSync();
  const historyQuery = usePowerSyncQuery<DbAdminNotification>(HISTORY_SQL, [], {
    enabled: isInitialized,
  });

  const notifications = useMemo(
    () => (historyQuery.data ?? []).map(mapRowToAdminNotification),
    [historyQuery.data],
  );

  const isLoadingHistory =
    isInitialized && historyQuery.loading && historyQuery.data === undefined;
  const isRefreshing = historyQuery.isRefetching;
  const historyError = !isInitialized ? NOT_READY_ERROR : historyQuery.error;
  const error = mutationError ?? historyError;

  // Restarting the watch doubles as manual fetch/refresh for pull-to-refresh
  const { refetch: refetchHistory } = historyQuery;

  // Get API auth headers for sending notifications
  const getAuthHeaders = useCallback(() => {
    const token = TokenStorage.getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Get current user ID
  const getUserId = useCallback(() => {
    const user = TokenStorage.getUser();
    return user?.id;
  }, []);

  // Validation
  const canSend = message.trim().length > 0 && (notifyDoctors || notifyTriage);

  // Clear form
  const clearForm = useCallback(() => {
    setMessage('');
    setType('announcement');
    setNotifyDoctors(false);
    setNotifyTriage(false);
    setActionUrl('');
    setDescription('');
    setLinks([]);
    setImages([]);
    setMutationError(null);
  }, []);

  // Send notification via API (must go through server for push notifications).
  // The reactive watch picks up the new row once it syncs back — no manual
  // refetch needed.
  const sendNotification = useCallback(async () => {
    if (!canSend) {
      setMutationError(new Error('Please enter a message and select at least one recipient type'));
      return;
    }

    try {
      setIsSending(true);
      setMutationError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();
      const senderId = getUserId();

      console.log('[Notifications] Sending notification via API...');

      const response = await fetch(`${baseUrl}/api/notifications/admin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message.trim(),
          type,
          notifyDoctors,
          notifyTriage,
          senderId,
          actionUrl: actionUrl || null,
          description: description || null,
          links: links.length > 0 ? links : null,
          images: images.length > 0 ? images : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.status}`);
      }

      console.log('[Notifications] Notification sent successfully');

      // Clear form on success
      clearForm();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to send notification');
      setMutationError(errorObj);
      console.error('[Notifications] Error sending notification:', err);
      throw errorObj;
    } finally {
      setIsSending(false);
    }
  }, [
    canSend,
    message,
    type,
    notifyDoctors,
    notifyTriage,
    actionUrl,
    description,
    links,
    images,
    getAuthHeaders,
    getUserId,
    clearForm,
  ]);

  // Image upload
  const uploadImage = useCallback(async (file: { uri: string; name: string; type: string }) => {
    setIsUploadingImage(true);
    try {
      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      const response = await fetch(`${baseUrl}/api/notifications/admin/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': headers.Authorization,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const result = await response.json();
      setImages(prev => [...prev, result]);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to upload image');
      setMutationError(errorObj);
      console.error('[Notifications] Image upload error:', err);
    } finally {
      setIsUploadingImage(false);
    }
  }, [getAuthHeaders]);

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
    notifications,
    isSending,
    isLoadingHistory,
    isRefreshing,
    error,
    sendNotification,
    fetchNotificationHistory: refetchHistory,
    refreshHistory: refetchHistory,
    clearForm,
    canSend,
  };
}
