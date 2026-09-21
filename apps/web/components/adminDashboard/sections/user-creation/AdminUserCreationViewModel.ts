// apps/web/components/adminDashboard/sections/user-creation/AdminUserCreationViewModel.ts
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAdminUserCreationContext } from './AdminUserCreationContext';

interface CreateUserRequest {
    accountType: 'Doctor' | 'Triage' | 'Evac';
    email: string;
    firstName: string;
    lastName: string;
    dob?: string;
    doctorSpecialty?: string[];
    languages?: string[];
    gender: 'Male' | 'Female';
    countries?: string[];
}

interface CreateUserResponse {
    success: boolean;
    message: string;
    userId?: string;
    confirmationToken?: string;
}

export const useAdminUserCreationViewModel = () => {
    const { data: session } = useSession();
    const {
        formData,
        setFormData,
        isFormComplete,
        setValidEmail,
        setEmailExists,
        setIsCreatingUser,
        setCreationSuccess,
        resetForm,
    } = useAdminUserCreationContext();
    
    const [error, setError] = useState<string | null>(null);
    const [isValidatingEmail, setIsValidatingEmail] = useState(false);
    
    // Email validation function
    const validateEmail = useCallback(async (email: string) => {
        if (!email || !email.includes('@')) {
            setValidEmail(false);
            return;
        }
        
        setIsValidatingEmail(true);
        setError(null);
        
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (session?.user && (session.user as any)?.token) {
                headers['Authorization'] = `Bearer ${(session.user as any).token}`;
            }
            
            const response = await fetch(`/api/auth/signup/email-check?email=${encodeURIComponent(email)}`, {
                method: 'GET',
                headers,
            });
            
            const data = await response.json();
            
            if (response.status === 200) {
                // Email is available
                setValidEmail(true);
                setEmailExists(false);
            } else if (response.status === 409) {
                // Email already exists
                setValidEmail(true);
                setEmailExists(true);
                setError('Email already exists. Please use a different email.');
            } else {
                setValidEmail(false);
                setError(data.error || 'Email validation failed');
            }
        } catch (err) {
            setValidEmail(false);
            setError('Failed to validate email');
        } finally {
            setIsValidatingEmail(false);
        }
    }, [setValidEmail, setEmailExists, session?.user]);
    
    // Send confirmation email function
    const sendConfirmationEmail = useCallback(async (userId: string): Promise<boolean> => {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if ((session?.user as any)?.token) {
                headers['Authorization'] = `Bearer ${(session?.user as any)?.token}`;
            }

            const response = await fetch('/api/admin-signup/send-follow-up', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return true;
            } else {
                setError(data.error || 'Failed to send confirmation email');
                return false;
            }
        } catch (err) {
            setError('Network error occurred while sending confirmation email');
            return false;
        }
    }, [session?.user]);
    
    // Create user function (without sending email)
    const createUserOnly = useCallback(async (): Promise<string | null> => {
        if (!isFormComplete) {
            setError('Please complete all required fields');
            return null;
        }

        setIsCreatingUser(true);
        setError(null);

        try {
            const requestData: CreateUserRequest = {
                accountType: formData.accountType!,
                email: formData.email!,
                firstName: formData.firstName!,
                lastName: formData.lastName!,
                gender: formData.gender!,
                ...(formData.dob && { dob: formData.dob }),
                ...(formData.accountType === 'Doctor' && {
                    doctorSpecialty: formData.doctorSpecialty,
                }),
                ...(formData.languages && { languages: formData.languages }),
                ...(formData.countries && { countries: formData.countries }),
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if ((session?.user as any)?.token) {
                headers['Authorization'] = `Bearer ${(session?.user as any)?.token}`;
            }

            const response = await fetch('/api/admin/POST/create-user', {
                method: 'POST',
                headers,
                body: JSON.stringify(requestData),
            });

            const data: CreateUserResponse = await response.json();

            if (response.ok && data.success) {
                return data.userId || null;
            } else {
                setError(data.message || 'Failed to create user');
                return null;
            }
        } catch (err) {
            setError('Network error occurred while creating user');
            return null;
        } finally {
            setIsCreatingUser(false);
        }
    }, [isFormComplete, formData, setIsCreatingUser, session?.user]);
    
    // Create user and send email function (legacy for backward compatibility)
    const createUser = useCallback(async (): Promise<boolean> => {
        const userId = await createUserOnly();
        if (userId) {
            const emailSent = await sendConfirmationEmail(userId);
            if (emailSent) {
                setCreationSuccess(true);
                return true;
            }
        }
        return false;
    }, [createUserOnly, sendConfirmationEmail, setCreationSuccess]);
    
    // Get pending users function
    const getPendingUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/admin-signup/pending-users');
            const data = await response.json();
            
            if (response.ok && data.success) {
                return data.pendingUsers;
            } else {
                setError(data.error || 'Failed to fetch pending users');
                return [];
            }
        } catch (err) {
            setError('Network error occurred while fetching pending users');
            return [];
        }
    }, []);
    
    // Update form field
    const updateFormField = useCallback((field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear error when user starts typing
        if (error) {
            setError(null);
        }
        
        // Validate email when email field changes
        if (field === 'email' && typeof value === 'string') {
            validateEmail(value);
        }
    }, [setFormData, error, validateEmail]);
    
    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);
    
    return {
        // Form data
        formData,
        isFormComplete,
        
        // Email validation
        isValidatingEmail,
        validateEmail,
        
        // User creation
        createUser,
        createUserOnly,
        sendConfirmationEmail,
        getPendingUsers,
        
        // Form management
        updateFormField,
        resetForm,
        
        // Error handling
        error,
        clearError,
    };
};
