// apps/mobile/src/screens/user-profile/useProfileViewModel.ts
import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config';
import { TokenStorage } from '../../services/TokenStorage';
import type { ProfileFormValuesBase } from '@fajr/shared/user';

export interface ProfileFormValues extends ProfileFormValuesBase {
  city?: string;
  isAdmin?: boolean;
  googleId?: string;
  googleEmail?: string;
  googleImage?: string;
}

export interface UseProfileViewModelReturn {
  // State
  profile: ProfileFormValues | null;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  error: string | null;

  // Form state
  formData: ProfileFormValues | null;

  // Actions
  setIsEditing: (editing: boolean) => void;
  updateFormData: (field: keyof ProfileFormValues, value: any) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  refreshProfile: () => Promise<void>;

  // Specialty management
  addSpecialty: (specialty: string) => void;
  removeSpecialty: (specialty: string) => void;

  // Language management
  addLanguage: (language: string) => void;
  removeLanguage: (language: string) => void;

  // Country management
  addCountry: (country: string) => void;
  removeCountry: (country: string) => void;
}

export function useProfileViewModel(userId: string): UseProfileViewModelReturn {
  // State
  const [profile, setProfile] = useState<ProfileFormValues | null>(null);
  const [formData, setFormData] = useState<ProfileFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use auth token for API calls (not PowerSync token!)
      const token = TokenStorage.getAuthToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('📥 Fetching profile for user:', userId);
      const url = getApiUrl(`/user/${userId}`);
      console.log('🌐 Profile API URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          '❌ Failed to fetch profile:',
          response.status,
          errorText,
        );
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Profile fetched successfully');

      setProfile(data);
      setFormData(data); // Initialize form data with profile data
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update form data field
  const updateFormData = useCallback(
    (field: keyof ProfileFormValues, value: any) => {
      if (!formData) return;

      setFormData(prev => ({
        ...prev!,
        [field]: value,
      }));
    },
    [formData],
  );

  // Save profile changes
  const handleSave = useCallback(async () => {
    if (!formData || !profile) return;

    try {
      setIsSaving(true);
      setError(null);

      // Use auth token for API calls (not PowerSync token!)
      const token = TokenStorage.getAuthToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('💾 Saving profile changes...');

      const patchUrl = getApiUrl(`/user/${userId}`);
      console.log('💾 Saving to API URL:', patchUrl);
      const response = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dob: formData.dob,
          gender: formData.gender,
          countries: formData.countries,
          languages: formData.languages,
          doctorSpecialty: formData.doctorSpecialty,
          accountType: formData.accountType,
          city: formData.city,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save profile:', response.status, errorText);
        throw new Error(`Failed to save profile: ${response.statusText}`);
      }

      const updatedProfile = await response.json();
      console.log('✅ Profile saved successfully');

      setProfile(updatedProfile);
      setFormData(updatedProfile);
      setIsEditing(false);

      // Update stored user data in TokenStorage
      const storedUser = TokenStorage.getUser();
      if (storedUser) {
        TokenStorage.setUser({
          ...storedUser,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          dob: updatedProfile.dob,
          gender: updatedProfile.gender,
          countries: updatedProfile.countries,
          languages: updatedProfile.languages,
          doctorSpecialty: updatedProfile.doctorSpecialty,
          accountType: updatedProfile.accountType,
          city: updatedProfile.city,
        });
        console.log('✅ Local storage updated');
      }
    } catch (err) {
      console.error('❌ Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [formData, profile, userId]);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setFormData(profile); // Reset form data to original profile
    setIsEditing(false);
    setError(null);
  }, [profile]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Specialty management
  const addSpecialty = useCallback(
    (specialty: string) => {
      if (!formData) return;

      const currentSpecialties = formData.doctorSpecialty || [];
      if (!currentSpecialties.includes(specialty)) {
        updateFormData('doctorSpecialty', [...currentSpecialties, specialty]);
      }
    },
    [formData, updateFormData],
  );

  const removeSpecialty = useCallback(
    (specialty: string) => {
      if (!formData) return;

      const currentSpecialties = formData.doctorSpecialty || [];
      updateFormData(
        'doctorSpecialty',
        currentSpecialties.filter(s => s !== specialty),
      );
    },
    [formData, updateFormData],
  );

  // Language management
  const addLanguage = useCallback(
    (language: string) => {
      if (!formData) return;

      const currentLanguages = formData.languages || [];
      if (!currentLanguages.includes(language)) {
        updateFormData('languages', [...currentLanguages, language]);
      }
    },
    [formData, updateFormData],
  );

  const removeLanguage = useCallback(
    (language: string) => {
      if (!formData) return;

      const currentLanguages = formData.languages || [];
      if (currentLanguages.length > 1) {
        // Ensure at least one language remains
        updateFormData(
          'languages',
          currentLanguages.filter(l => l !== language),
        );
      }
    },
    [formData, updateFormData],
  );

  // Country management
  const addCountry = useCallback(
    (country: string) => {
      if (!formData) return;

      const currentCountries = formData.countries || [];
      if (!currentCountries.includes(country)) {
        updateFormData('countries', [...currentCountries, country]);
      }
    },
    [formData, updateFormData],
  );

  const removeCountry = useCallback(
    (country: string) => {
      if (!formData) return;

      const currentCountries = formData.countries || [];
      if (currentCountries.length > 1) {
        // Ensure at least one country remains
        updateFormData(
          'countries',
          currentCountries.filter(c => c !== country),
        );
      }
    },
    [formData, updateFormData],
  );

  return {
    // State
    profile,
    isLoading,
    isEditing,
    isSaving,
    error,
    formData,

    // Actions
    setIsEditing,
    updateFormData,
    handleSave,
    handleCancel,
    refreshProfile,

    // Specialty management
    addSpecialty,
    removeSpecialty,

    // Language management
    addLanguage,
    removeLanguage,

    // Country management
    addCountry,
    removeCountry,
  };
}
