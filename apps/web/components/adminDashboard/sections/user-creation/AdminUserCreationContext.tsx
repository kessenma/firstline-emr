// apps/web/components/adminDashboard/sections/user-creation/AdminUserCreationContext.tsx
import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';

interface FormData {
    accountType?: 'Doctor' | 'Triage' | 'Evac';
    email?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    doctorSpecialty?: string[];
    languages?: string[];
    gender?: 'Male' | 'Female';
    countries?: string[];
}

interface AdminUserCreationContextValue {
    // Form data and management
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    
    // Form completion tracking
    isFormComplete: boolean;
    
    // Account type
    accountType: 'Doctor' | 'Triage' | 'Evac' | null;
    setAccountType: React.Dispatch<React.SetStateAction<'Doctor' | 'Triage' | 'Evac' | null>>;
    
    // Email validation
    validEmail: boolean;
    setValidEmail: React.Dispatch<React.SetStateAction<boolean>>;
    emailExists: boolean;
    setEmailExists: React.Dispatch<React.SetStateAction<boolean>>;
    
    // Form completion states
    basicInfoCompleted: boolean;
    setBasicInfoCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    doctorFormCompleted: boolean;
    setDoctorFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    triageFormCompleted: boolean;
    setTriageFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    evacFormCompleted: boolean;
    setEvacFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    
    // User creation state
    isCreatingUser: boolean;
    setIsCreatingUser: React.Dispatch<React.SetStateAction<boolean>>;
    creationSuccess: boolean;
    setCreationSuccess: React.Dispatch<React.SetStateAction<boolean>>;
    
    // Reset function
    resetForm: () => void;
}

const AdminUserCreationContext = createContext<AdminUserCreationContextValue | null>(null);

export const useAdminUserCreationContext = () => {
    const context = useContext(AdminUserCreationContext);
    if (!context) {
        throw new Error('useAdminUserCreationContext must be used within an AdminUserCreationProvider');
    }
    return context;
};

export const AdminUserCreationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [formData, setFormData] = useState<FormData>({});
    const [accountType, setAccountType] = useState<'Doctor' | 'Triage' | 'Evac' | null>(null);
    
    // Email validation states
    const [validEmail, setValidEmail] = useState(false);
    const [emailExists, setEmailExists] = useState(false);
    
    // Form completion states
    const [basicInfoCompleted, setBasicInfoCompleted] = useState(false);
    const [doctorFormCompleted, setDoctorFormCompleted] = useState(false);
    const [triageFormCompleted, setTriageFormCompleted] = useState(false);
    const [evacFormCompleted, setEvacFormCompleted] = useState(false);
    
    // User creation states
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [creationSuccess, setCreationSuccess] = useState(false);
    
    // Calculate if form is complete based on account type
    const isFormComplete = useMemo(() => {
        if (!basicInfoCompleted || !validEmail || emailExists) {
            return false;
        }
        
        switch (accountType) {
            case 'Doctor':
                return doctorFormCompleted;
            case 'Triage':
                return triageFormCompleted;
            case 'Evac':
                return evacFormCompleted;
            default:
                return false;
        }
    }, [basicInfoCompleted, validEmail, emailExists, accountType, doctorFormCompleted, triageFormCompleted, evacFormCompleted]);
    
    // Reset form function
    const resetForm = useCallback(() => {
        setFormData({});
        setAccountType(null);
        setValidEmail(false);
        setEmailExists(false);
        setBasicInfoCompleted(false);
        setDoctorFormCompleted(false);
        setTriageFormCompleted(false);
        setEvacFormCompleted(false);
        setIsCreatingUser(false);
        setCreationSuccess(false);
    }, []);
    
    // Update account type in form data when it changes
    useEffect(() => {
        if (accountType) {
            setFormData(prev => ({ ...prev, accountType }));
        }
    }, [accountType]);
    
    return (
        <AdminUserCreationContext.Provider
            value={{
                formData,
                setFormData,
                isFormComplete,
                accountType,
                setAccountType,
                validEmail,
                setValidEmail,
                emailExists,
                setEmailExists,
                basicInfoCompleted,
                setBasicInfoCompleted,
                doctorFormCompleted,
                setDoctorFormCompleted,
                triageFormCompleted,
                setTriageFormCompleted,
                evacFormCompleted,
                setEvacFormCompleted,
                isCreatingUser,
                setIsCreatingUser,
                creationSuccess,
                setCreationSuccess,
                resetForm,
            }}
        >
            {children}
        </AdminUserCreationContext.Provider>
    );
};

export { AdminUserCreationContext };