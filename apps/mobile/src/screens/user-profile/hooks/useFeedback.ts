// apps/mobile/src/screens/user-profile/hooks/useFeedback.ts
// Hook for submitting and listing user feedback

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getApiUrl } from '../../../config';
import { TokenStorage } from '../../../services/TokenStorage';

export interface FeedbackAttachment {
  uri: string;
  name: string;
  type: string;
}

export interface FeedbackItem {
  id: string;
  category: string;
  title: string;
  description: string;
  attachments: Array<{
    filePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
  appSections: string[];
  platform: 'mobile' | 'web' | 'both';
  mobilePlatform: 'android' | 'ios' | null;
  status: string;
  adminNotes: string | null;
  appVersion?: string | null;
  createdAt: string;
}

export const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'question', label: 'Question' },
  { value: 'admin_assistance', label: 'Admin Assistance' },
  { value: 'ui_improvement', label: 'UI Improvement' },
  { value: 'praise', label: 'Praise' },
  { value: 'offline_access', label: 'Offline Access Issue' },
  { value: 'other', label: 'Other' },
] as const;

interface UseFeedbackReturn {
  isSubmitting: boolean;
  isLoadingFeedback: boolean;
  myFeedback: FeedbackItem[];
  submitFeedback: (data: {
    category: string;
    title: string;
    description: string;
    platform: string;
    mobilePlatform?: string;
    attachments: FeedbackAttachment[];
    appSections?: string[];
    syncDiagnostics?: object;
  }) => Promise<boolean>;
  fetchMyFeedback: () => Promise<void>;
}

export function useFeedback(): UseFeedbackReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);

  const submitFeedback = useCallback(
    async (data: {
      category: string;
      title: string;
      description: string;
      platform: string;
      mobilePlatform?: string;
      attachments: FeedbackAttachment[];
      appSections?: string[];
      syncDiagnostics?: object;
    }): Promise<boolean> => {
      try {
        setIsSubmitting(true);

        const token = TokenStorage.getAuthToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const formData = new FormData();
        formData.append('category', data.category);
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('platform', data.platform);
        if (data.mobilePlatform) {
          formData.append('mobilePlatform', data.mobilePlatform);
        }
        if (data.appSections && data.appSections.length > 0) {
          formData.append('appSections', JSON.stringify(data.appSections));
        }
        if (data.syncDiagnostics) {
          formData.append('syncDiagnostics', JSON.stringify(data.syncDiagnostics));
        }
        formData.append('appVersion', DeviceInfo.getVersion());

        for (const attachment of data.attachments) {
          formData.append('file', {
            uri:
              Platform.OS === 'ios'
                ? attachment.uri.replace('file://', '')
                : attachment.uri,
            type: attachment.type,
            name: attachment.name,
          } as any);
        }

        const url = getApiUrl('/feedback');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || 'Failed to submit feedback',
          );
        }

        Alert.alert('Success', 'Thank you for your feedback!');
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to submit feedback';
        Alert.alert('Error', errorMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const fetchMyFeedback = useCallback(async () => {
    try {
      setIsLoadingFeedback(true);

      const token = TokenStorage.getAuthToken();
      if (!token) return;

      const url = getApiUrl('/feedback');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyFeedback(data.feedback || []);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setIsLoadingFeedback(false);
    }
  }, []);

  return {
    isSubmitting,
    isLoadingFeedback,
    myFeedback,
    submitFeedback,
    fetchMyFeedback,
  };
}
