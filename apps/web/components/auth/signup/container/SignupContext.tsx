import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { getFinalStep } from '@fajr/shared/signup';
import type { AccountType, Gender, TotpCredentialData, MedicalLicenseBase, PasskeyCredential } from '@fajr/shared/signup';

/** Web-specific medical license includes File object for upload */
export interface WebMedicalLicense extends MedicalLicenseBase {
    licenseUrl?: string;
    uploadedAt?: Date;
    file?: File;
}

interface FormData {
    accountType?: AccountType;
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    doctorSpecialty?: string[];
    languages?: string[];
    gender?: Gender;
    countries?: string[];
    medicalLicenses?: WebMedicalLicense[];
    twoFactorSetupCompleted?: boolean;
    totpCredentialData?: TotpCredentialData;
    passkeyEnabled?: boolean;
    passkeyCredential?: PasskeyCredential;
    missionIds?: string[];
}

interface SignupContextValue {
    // next/back button, progress bar, and form completion
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    currentStep: number;
    setCurrentStep: (step: number) => void;
    progress: number;
    updateProgress: () => void;
    handleNext: () => void;
    handleBack: () => void;
    answeredQuestions: number;
    setAnsweredQuestions: (count: number) => void;
    updateAnsweredQuestions: (step: number, count: number) => void;
    stepAnswers: number[];
    // userTypeForm
    accountType: AccountType | null;
    setAccountType: React.Dispatch<React.SetStateAction<AccountType | null>>;
    //PasswordEmailForm
    validEmail: boolean;
    setValidEmail: React.Dispatch<React.SetStateAction<boolean>>;
    emailExists: boolean;
    setEmailExists: React.Dispatch<React.SetStateAction<boolean>>;
    passwordsMatch: boolean;
    setPasswordsMatch: React.Dispatch<React.SetStateAction<boolean>>;
    agreedToTerms: boolean;
    setAgreedToTerms: React.Dispatch<React.SetStateAction<boolean>>;
    isDrawerOpen: boolean;
    setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    // TwoFactorSetup
    twoFactorSetupCompleted: boolean;
    setTwoFactorSetupCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    // DoctorSignupForm
    doctorSignupFormCompleted: boolean;
    setDoctorSignupFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    // TriageSignupForm
    triageSignupFormCompleted: boolean;
    setTriageSignupFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    // MedicalLicenseUpload
    medicalLicenseFormCompleted: boolean;
    setMedicalLicenseFormCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    // Multiple Medical Licenses
    addMedicalLicense: (specialty: string, file: File) => void;
    removeMedicalLicense: (specialty: string) => void;
    getMedicalLicenseForSpecialty: (specialty: string) => File | undefined;
    getRequiredSpecialties: () => string[];
    // Passkey enrollment
    passkeyEnabled: boolean;
    setPasskeyEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    passkeyCredential: FormData['passkeyCredential'] | null;
    setPasskeyCredential: React.Dispatch<React.SetStateAction<FormData['passkeyCredential'] | null>>;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export const useSignupContext = () => {
    const context = useContext(SignupContext);
    if (!context) {
        throw new Error('useSignupContext must be used within a SignupProvider');
    }
    return context;
};

export const SignupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [formData, setFormData] = useState<FormData>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [accountType, setAccountType] = useState<AccountType | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState(0);
    const [stepAnswers, setStepAnswers] = useState<number[]>(new Array(6).fill(0));
    // step 0: user type, 1: email/password, 2: 2FA, 3: doctor/triage profile, 4: license (Doctor) or missions (Triage), 5: missions (Doctor)
    const [validEmail, setValidEmail] = useState(false);
    const [emailExists, setEmailExists] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [twoFactorSetupCompleted, setTwoFactorSetupCompleted] = useState(false);
    const [doctorSignupFormCompleted, setDoctorSignupFormCompleted] = useState(false);
    const [triageSignupFormCompleted, setTriageSignupFormCompleted] = useState(false);
    const [medicalLicenseFormCompleted, setMedicalLicenseFormCompleted] = useState(false);

    // Passkey state
    const [passkeyEnabled, setPasskeyEnabled] = useState(false);
    const [passkeyCredential, setPasskeyCredential] = useState<FormData['passkeyCredential'] | null>(null);

    const totalQuestions = useMemo(() => {
        switch (accountType) {
            case 'Doctor':
                return 13; // 1 (user type) + 3 (email/password) + 1 (2FA setup) + 6 (doctor fields) + 1 (terms) + 1 (license)
            case 'Triage':
                return 11; // 1 (user type) + 3 (email/password) + 1 (2FA setup) + 5 (triage fields) + 1 (terms)
            default:
                return 4;
        }
    }, [accountType]);

    const updateProgress = useCallback(() => {
        const newProgress = (answeredQuestions / totalQuestions) * 100;// Log for debugging
        setProgress(newProgress);
    }, [answeredQuestions, totalQuestions]);

    // Use a ref to track if we are currently updating to avoid loop
    const isUpdatingRef = React.useRef(false);

    const updateAnsweredQuestions = useCallback((step: number, count: number) => {
        if (count < 0 || step >= 6) {
            console.warn(`Invalid step: ${step} or count: ${count}`);
            return;
        }

        setStepAnswers((prev) => {
            if (prev[step] === count) {
                return prev;
            }
            const newStepAnswers = [...prev];
            newStepAnswers[step] = count;
            return newStepAnswers;
        });
    }, []);

    // Combine the logic into a single effect to calculate answeredQuestions
    useEffect(() => {
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;

        const termsAgreementCount = agreedToTerms ? 1 : 0;
        const newTotal = stepAnswers.reduce((acc, curr) => acc + curr, 0) + termsAgreementCount;
        
        setAnsweredQuestions(prev => {
            if (prev !== newTotal) {
                return newTotal;
            }
            return prev;
        });
        
        // Use a timeout to reset the ref to allow future updates
        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 0);
        
    }, [agreedToTerms, stepAnswers]);

    useEffect(() => {
        console.log('Updating progress based on answered questions or total questions');
        updateProgress();
    }, [answeredQuestions, totalQuestions, updateProgress]);

    const handleNext = useCallback(() => {
        if (currentStep === 1 && emailExists) {
            return;
        }

        const maxSteps = getFinalStep(accountType);
        if (currentStep < maxSteps) {
            setCurrentStep((prev) => prev + 1);
        }
    }, [currentStep, emailExists, accountType]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    // Medical License Helper Functions
    const addMedicalLicense = useCallback((specialty: string, file: File) => {
        setFormData(prev => {
            const existingLicenses = prev.medicalLicenses || [];
            const filteredLicenses = existingLicenses.filter(license => license.specialty !== specialty);
            return {
                ...prev,
                medicalLicenses: [
                    ...filteredLicenses,
                    {
                        specialty,
                        file,
                        uploadedAt: new Date()
                    }
                ]
            };
        });
    }, []);

    const removeMedicalLicense = useCallback((specialty: string) => {
        setFormData(prev => ({
            ...prev,
            medicalLicenses: (prev.medicalLicenses || []).filter(license => license.specialty !== specialty)
        }));
    }, []);

    const getMedicalLicenseForSpecialty = useCallback((specialty: string) => {
        return formData.medicalLicenses?.find(license => license.specialty === specialty)?.file;
    }, [formData.medicalLicenses]);

    const getRequiredSpecialties = useCallback(() => {
        return formData.doctorSpecialty || [];
    }, [formData.doctorSpecialty]);

    return (
        <SignupContext.Provider
            value={{
                formData,
                setFormData,
                currentStep,
                setCurrentStep,
                progress,
                updateProgress,
                handleNext,
                handleBack,
                answeredQuestions,
                setAnsweredQuestions,
                updateAnsweredQuestions,
                stepAnswers,

                accountType,
                setAccountType,

                validEmail,
                setValidEmail,
                emailExists,
                setEmailExists,
                passwordsMatch,
                setPasswordsMatch,
                agreedToTerms,
                setAgreedToTerms,
                isDrawerOpen,
                setIsDrawerOpen,

                twoFactorSetupCompleted,
                setTwoFactorSetupCompleted,
                doctorSignupFormCompleted,
                setDoctorSignupFormCompleted,
                triageSignupFormCompleted,
                setTriageSignupFormCompleted,
                medicalLicenseFormCompleted,
                setMedicalLicenseFormCompleted,
                // Multiple Medical Licenses
                addMedicalLicense,
                removeMedicalLicense,
                getMedicalLicenseForSpecialty,
                getRequiredSpecialties,
                // Passkey enrollment
                passkeyEnabled,
                setPasskeyEnabled,
                passkeyCredential,
                setPasskeyCredential,
            }}
        >
            {children}
        </SignupContext.Provider>
    );
};

export { SignupContext };
