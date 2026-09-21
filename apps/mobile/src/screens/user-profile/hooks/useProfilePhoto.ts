// apps/mobile/src/screens/user-profile/hooks/useProfilePhoto.ts
// Hook for managing profile photo upload

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { getApiUrl } from '../../../config';
import { TokenStorage } from '../../../services/TokenStorage';
import type { PhotoUploadResult } from '../types';

interface UseProfilePhotoReturn {
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
  uploadPhoto: (imageUri: string, fileName?: string) => Promise<PhotoUploadResult>;
  deletePhoto: () => Promise<boolean>;
  clearError: () => void;
}

export function useProfilePhoto(): UseProfilePhotoReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = useCallback(
    async (imageUri: string, fileName?: string): Promise<PhotoUploadResult> => {
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

        // Determine file type from URI
        const uriParts = imageUri.split('.');
        const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        const mimeType =
          fileExtension === 'png'
            ? 'image/png'
            : fileExtension === 'gif'
            ? 'image/gif'
            : 'image/jpeg';

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          type: mimeType,
          name: fileName || `profile_photo_${Date.now()}.${fileExtension}`,
        } as any);
        formData.append('userId', user.id);

        const url = getApiUrl('/user/upload-photo');
        console.log('📤 Uploading profile photo to:', url);

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
          console.error('❌ Failed to upload photo:', response.status, errorText);
          throw new Error('Failed to upload profile photo');
        }

        const data = await response.json();
        console.log('✅ Profile photo uploaded successfully');

        // Update local user data with new image URL
        if (data.imageUrl) {
          const storedUser = TokenStorage.getUser();
          if (storedUser) {
            TokenStorage.setUser({
              ...storedUser,
              image: data.imageUrl,
            });
          }
        }

        Alert.alert('Success', 'Profile photo updated successfully!');
        return { success: true, imageUrl: data.imageUrl };
      } catch (err) {
        console.error('❌ Error uploading photo:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to upload photo';
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const deletePhoto = useCallback(async (): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);

      const token = TokenStorage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const user = TokenStorage.getUser();
      if (!user?.id) {
        throw new Error('User not found');
      }

      const url = getApiUrl(`/user/${user.id}/photo`);
      console.log('🗑️ Deleting profile photo:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to delete photo:', response.status, errorText);
        throw new Error('Failed to delete profile photo');
      }

      console.log('✅ Profile photo deleted successfully');

      // Update local user data
      const storedUser = TokenStorage.getUser();
      if (storedUser) {
        TokenStorage.setUser({
          ...storedUser,
          image: undefined,
        });
      }

      Alert.alert('Success', 'Profile photo deleted successfully');
      return true;
    } catch (err) {
      console.error('❌ Error deleting photo:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete photo';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    isDeleting,
    error,
    uploadPhoto,
    deletePhoto,
    clearError,
  };
}
