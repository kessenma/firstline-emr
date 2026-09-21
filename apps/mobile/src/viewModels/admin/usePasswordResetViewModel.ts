// apps/mobile/src/viewModels/admin/usePasswordResetViewModel.ts
// ViewModel for password reset functionality in admin dashboard

import { useState, useCallback } from 'react';
import { TokenStorage } from '../../services/TokenStorage';
import { getBaseUrl } from '../../config';
import type { ForgotPasswordUserSearchResponse } from '../../types/admin';

interface UsePasswordResetViewModelReturn {
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // User state
  selectedUser: ForgotPasswordUserSearchResponse['user'] | null;
  
  // Loading states
  isSearching: boolean;
  isGeneratingLink: boolean;
  isSendingEmail: boolean;
  isClearingLinks: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  searchUser: () => Promise<void>;
  generateResetLink: () => Promise<void>;
  sendResetEmail: () => Promise<void>;
  clearExpiredLinks: () => Promise<void>;
  clearSelectedUser: () => void;
  
  // Computed
  isLinkExpired: boolean;
}

export function usePasswordResetViewModel(): UsePasswordResetViewModelReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ForgotPasswordUserSearchResponse['user'] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isClearingLinks, setIsClearingLinks] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  // Search for user by email
  const searchUser = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError(new Error('Please enter an email address'));
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(
        `${baseUrl}/api/admin/GET/forgot-password/user-search?email=${encodeURIComponent(searchQuery.trim())}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(`Failed to search user: ${response.status}`);
      }

      const data = await response.json();
      setSelectedUser(data.user || null);
      
      if (!data.user) {
        setError(new Error('User not found'));
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      setSelectedUser(null);
      console.error('Error searching user:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, getAuthHeaders]);

  // Generate password reset link
  const generateResetLink = useCallback(async () => {
    if (!selectedUser) {
      setError(new Error('No user selected'));
      return;
    }

    try {
      setIsGeneratingLink(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/admin/POST/forgot-password-link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate reset link: ${response.status}`);
      }

      const data = await response.json();
      
      // Update selected user with new reset link
      setSelectedUser(prev => prev ? {
        ...prev,
        resetLink: data.resetLink,
        resetLinkExpiration: data.resetLinkExpiration,
      } : null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error generating reset link:', error);
      throw error;
    } finally {
      setIsGeneratingLink(false);
    }
  }, [selectedUser, getAuthHeaders]);

  // Send password reset email
  const sendResetEmail = useCallback(async () => {
    if (!selectedUser) {
      setError(new Error('No user selected'));
      return;
    }

    try {
      setIsSendingEmail(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/admin/POST/send-password-reset-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send reset email: ${response.status}`);
      }

      // Increment password reset count
      setSelectedUser(prev => prev ? {
        ...prev,
        passwordResetCount: (prev.passwordResetCount || 0) + 1,
      } : null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error sending reset email:', error);
      throw error;
    } finally {
      setIsSendingEmail(false);
    }
  }, [selectedUser, getAuthHeaders]);

  // Clear expired password reset links
  const clearExpiredLinks = useCallback(async () => {
    try {
      setIsClearingLinks(true);
      setError(null);

      const headers = getAuthHeaders();
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/api/admin/POST/clear-expired-password-links`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to clear expired links: ${response.status}`);
      }

      const data = await response.json();
      
      // If current user's link was expired, clear it
      if (selectedUser?.resetLinkExpiration) {
        const expiryDate = new Date(selectedUser.resetLinkExpiration);
        if (expiryDate < new Date()) {
          setSelectedUser(prev => prev ? {
            ...prev,
            resetLink: undefined,
            resetLinkExpiration: undefined,
          } : null);
        }
      }

      return data.modifiedCount || 0;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error clearing expired links:', error);
      throw error;
    } finally {
      setIsClearingLinks(false);
    }
  }, [selectedUser, getAuthHeaders]);

  // Clear selected user
  const clearSelectedUser = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
    setError(null);
  }, []);

  // Check if reset link is expired
  const isLinkExpired = useCallback(() => {
    if (!selectedUser?.resetLinkExpiration) return false;
    return new Date(selectedUser.resetLinkExpiration) < new Date();
  }, [selectedUser])();

  return {
    searchQuery,
    setSearchQuery,
    selectedUser,
    isSearching,
    isGeneratingLink,
    isSendingEmail,
    isClearingLinks,
    error,
    searchUser,
    generateResetLink,
    sendResetEmail,
    clearExpiredLinks,
    clearSelectedUser,
    isLinkExpired,
  };
}
