// apps/mobile/src/screens/user-profile/hooks/useProfileMedicalLicense.ts
// Hook for managing medical licenses in the profile screen

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { getApiUrl } from '../../../config';
import { TokenStorage } from '../../../services/TokenStorage';
import type { MedicalLicense } from '../types';

interface UseProfileMedicalLicenseReturn {
  licenses: MedicalLicense[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  fetchMedicalLicenses: (userId: string) => Promise<void>;
  uploadMedicalLicense: (
    fileUri: string,
    fileName: string,
    fileType: string,
    specialty: string
  ) => Promise<boolean>;
  clearError: () => void;
}

export function useProfileMedicalLicense(): UseProfileMedicalLicenseReturn {
  const [licenses, setLicenses] = useState<MedicalLicense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicalLicenses = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = TokenStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = getApiUrl(`/admin/get-medical-license?userId=${userId}`);
      console.log('📥 Fetching medical licenses from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No licenses found - that's okay
          setLicenses([]);
          return;
        }
        const errorText = await response.text();
        console.error('❌ Failed to fetch licenses:', response.status, errorText);
        throw new Error('Failed to fetch medical licenses');
      }

      const data = await response.json();
      console.log('✅ Medical licenses fetched:', data.length);
      setLicenses(Array.isArray(data) ? data : [data]);
    } catch (err) {
      console.error('❌ Error fetching medical licenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load medical licenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadMedicalLicense = useCallback(
    async (
      fileUri: string,
      fileName: string,
      fileType: string,
      specialty: string
    ): Promise<boolean> => {
      try {
        setIsUploading(true);
        setError(null);

        const token = TokenStorage.getAuthToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const user = TokenStorage.getUser();
        if (!user?.id) {
          throw new Error('User not found');
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
          type: fileType || 'application/pdf',
          name: fileName || 'medical_license.pdf',
        } as any);
        formData.append('specialty', specialty);
        formData.append('userId', user.id);

        const url = getApiUrl('/upload-license');
        console.log('📤 Uploading medical license to:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type - let fetch set it with boundary
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to upload license:', response.status, errorText);
          throw new Error('Failed to upload medical license');
        }

        console.log('✅ Medical license uploaded successfully');
        Alert.alert('Success', 'Medical license uploaded successfully!');

        // Refresh the list
        await fetchMedicalLicenses(user.id);
        return true;
      } catch (err) {
        console.error('❌ Error uploading medical license:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to upload medical license';
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [fetchMedicalLicenses]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    licenses,
    isLoading,
    isUploading,
    error,
    fetchMedicalLicenses,
    uploadMedicalLicense,
    clearError,
  };
}
