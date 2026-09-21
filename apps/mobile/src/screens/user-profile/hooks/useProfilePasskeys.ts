// apps/mobile/src/screens/user-profile/hooks/useProfilePasskeys.ts
// Hook for managing passkeys in the profile screen

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getApiUrl } from '../../../config';
import { TokenStorage } from '../../../services/TokenStorage';
import { usePasskey } from '../../../hooks/usePasskey';
import type { PasskeyCredential } from '../types';

interface UseProfilePasskeysReturn {
  passkeys: PasskeyCredential[];
  isLoading: boolean;
  isAdding: boolean;
  error: string | null;
  fetchPasskeys: () => Promise<void>;
  handleAddPasskey: (email: string) => Promise<boolean>;
  handleDeletePasskey: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useProfilePasskeys(): UseProfilePasskeysReturn {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, isSupported } = usePasskey();

  const fetchPasskeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = TokenStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = getApiUrl('/auth/webauthn/passkeys');
      console.log('📥 Fetching passkeys from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch passkeys:', response.status, errorText);
        throw new Error('Failed to fetch passkeys');
      }

      const data = await response.json();
      console.log('✅ Passkeys fetched:', data.passkeys?.length ?? 0);
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error('❌ Error fetching passkeys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load passkeys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddPasskey = useCallback(
    async (email: string): Promise<boolean> => {
      if (!isSupported) {
        Alert.alert(
          'Not Supported',
          'Passkeys are not supported on this device. Please ensure you are using iOS 16+ or Android API 28+.'
        );
        return false;
      }

      try {
        setIsAdding(true);
        setError(null);

        const user = TokenStorage.getUser();
        if (!user?.id) {
          throw new Error('User not found');
        }

        console.log('🔐 Registering new passkey for:', email);
        await register(email, user.id);

        console.log('✅ Passkey registered successfully');
        Alert.alert('Success', 'Passkey added successfully!');

        // Refresh the list
        await fetchPasskeys();
        return true;
      } catch (err) {
        console.error('❌ Error adding passkey:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add passkey';

        // Don't show alert for user cancellation
        if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
          return false;
        }

        setError(errorMessage);
        Alert.alert('Passkey Registration Failed', errorMessage);
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [isSupported, register, fetchPasskeys]
  );

  const handleDeletePasskey = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const token = TokenStorage.getAuthToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const url = getApiUrl(`/auth/webauthn/passkeys/${id}`);
        console.log('🗑️ Deleting passkey:', id);

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to delete passkey:', response.status, errorText);
          throw new Error('Failed to delete passkey');
        }

        console.log('✅ Passkey deleted successfully');
        Alert.alert('Success', 'Passkey deleted successfully');

        // Refresh the list
        await fetchPasskeys();
        return true;
      } catch (err) {
        console.error('❌ Error deleting passkey:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete passkey';
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPasskeys]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    passkeys,
    isLoading,
    isAdding,
    error,
    fetchPasskeys,
    handleAddPasskey,
    handleDeletePasskey,
    clearError,
  };
}
