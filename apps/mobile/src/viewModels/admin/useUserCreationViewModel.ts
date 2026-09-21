// apps/mobile/src/viewModels/admin/useUserCreationViewModel.ts
// ViewModel for creating new users in admin dashboard

import { useState, useCallback, useEffect } from 'react';
import { TokenStorage } from '../../services/TokenStorage';
import { getBaseUrl } from '../../config';

export type AccountType = 'Doctor' | 'Triage';
export type Gender = 'Male' | 'Female';

interface FormData {
  accountType: AccountType | null;
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  dob: string;
  doctorSpecialty: string[];
  languages: string[];
  countries: string[];
}

interface UseUserCreationViewModelReturn {
  // Form data
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  
  // Validation
  isEmailValid: boolean;
  emailExists: boolean;
  isValidatingEmail: boolean;
  validateEmail: (email: string) => Promise<void>;
  
  // Form completion
  isBasicInfoComplete: boolean;
  isAccountSpecificComplete: boolean;
  isFormComplete: boolean;
  
  // Actions
  createUser: () => Promise<boolean>;
  resetForm: () => void;
  
  // Loading and error states
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

const initialFormData: FormData = {
  accountType: null,
  email: '',
  firstName: '',
  lastName: '',
  gender: null,
  dob: '',
  doctorSpecialty: [],
  languages: [],
  countries: [],
};

export function useUserCreationViewModel(): UseUserCreationViewModelReturn {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get API base URL and token
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

  // Update form field
  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Validate email
  const validateEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setIsEmailValid(false);
      setEmailExists(false);
      return;
    }

    try {
      setIsValidatingEmail(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(
        `${baseUrl}/api/auth/signup/email-check?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (response.status === 200) {
        // Email is available
        setIsEmailValid(true);
        setEmailExists(false);
      } else if (response.status === 409) {
        // Email already exists
        setIsEmailValid(true);
        setEmailExists(true);
        setError('Email already exists. Please use a different email.');
      } else {
        setIsEmailValid(false);
        setError('Email validation failed');
      }
    } catch (err) {
      setIsEmailValid(false);
      setError('Failed to validate email');
      console.error('Error validating email:', err);
    } finally {
      setIsValidatingEmail(false);
    }
  }, [getAuthHeaders]);

  // Check if basic info is complete
  const isBasicInfoComplete = useCallback(() => {
    return !!(
      formData.accountType &&
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.gender &&
      isEmailValid &&
      !emailExists
    );
  }, [formData, isEmailValid, emailExists])();

  // Check if account-specific info is complete
  const isAccountSpecificComplete = useCallback(() => {
    if (!formData.accountType) return false;

    // Doctor requires specialty
    if (formData.accountType === 'Doctor') {
      return formData.doctorSpecialty.length > 0;
    }

    // Triage requires countries
    if (formData.accountType === 'Triage') {
      return formData.countries.length > 0;
    }

    return true;
  }, [formData])();

  // Check if entire form is complete
  const isFormComplete = isBasicInfoComplete && isAccountSpecificComplete;

  // Create user
  const createUser = useCallback(async (): Promise<boolean> => {
    if (!isFormComplete) {
      setError('Please complete all required fields');
      return false;
    }

    try {
      setIsCreating(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const requestData = {
        accountType: formData.accountType,
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        ...(formData.dob && { dob: formData.dob }),
        ...(formData.accountType === 'Doctor' && {
          doctorSpecialty: formData.doctorSpecialty,
        }),
        ...(formData.languages.length > 0 && { languages: formData.languages }),
        ...(formData.countries.length > 0 && { countries: formData.countries }),
      };

      const response = await fetch(`${baseUrl}/api/admin-signup/create-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      const data = await response.json();

      if (data.success && data.userId) {
        // Send confirmation email
        await sendConfirmationEmail(data.userId);
        return true;
      }

      throw new Error('User creation failed');
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('Error creating user:', error);
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [formData, isFormComplete, getAuthHeaders]);

  // Send confirmation email
  const sendConfirmationEmail = useCallback(async (userId: string) => {
    try {
      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/admin-signup/send-follow-up`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        console.error('Failed to send confirmation email');
      }
    } catch (err) {
      console.error('Error sending confirmation email:', err);
    }
  }, [getAuthHeaders]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsEmailValid(false);
    setEmailExists(false);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Validate email when it changes
  useEffect(() => {
    if (formData.email && formData.email.includes('@')) {
      const timeoutId = setTimeout(() => {
        validateEmail(formData.email);
      }, 500); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setIsEmailValid(false);
      setEmailExists(false);
    }
  }, [formData.email, validateEmail]);

  return {
    formData,
    updateField,
    isEmailValid,
    emailExists,
    isValidatingEmail,
    validateEmail,
    isBasicInfoComplete,
    isAccountSpecificComplete,
    isFormComplete,
    createUser,
    resetForm,
    isCreating,
    error,
    clearError,
  };
}
