// apps/mobile/src/viewModels/admin/useAnalyticsViewModel.ts
// ViewModel for analytics dashboard functionality

import { useState, useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

interface UseAnalyticsViewModelReturn {
  // Analytics URL
  analyticsUrl: string;
  
  // Loading state
  isOpening: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  openAnalytics: () => Promise<void>;
  copyUrlToClipboard: () => void;
}

export function useAnalyticsViewModel(): UseAnalyticsViewModelReturn {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get analytics URL from environment or use default
  // TODO: Get from config/environment
  const analyticsUrl = 'https://analytics.fajrmission.org/login';

  // Open analytics dashboard in browser
  const openAnalytics = useCallback(async () => {
    try {
      setIsOpening(true);
      setError(null);

      const supported = await Linking.canOpenURL(analyticsUrl);
      
      if (!supported) {
        throw new Error('Cannot open analytics URL');
      }

      await Linking.openURL(analyticsUrl);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error opening analytics:', error);
      Alert.alert('Error', 'Failed to open analytics dashboard. Please try again.');
    } finally {
      setIsOpening(false);
    }
  }, [analyticsUrl]);

  // Copy URL to clipboard
  const copyUrlToClipboard = useCallback(() => {
    try {
      Clipboard.setString(analyticsUrl);
      Alert.alert('Copied', 'Analytics URL copied to clipboard');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      Alert.alert('Error', 'Failed to copy URL to clipboard');
    }
  }, [analyticsUrl]);

  return {
    analyticsUrl,
    isOpening,
    error,
    openAnalytics,
    copyUrlToClipboard,
  };
}
