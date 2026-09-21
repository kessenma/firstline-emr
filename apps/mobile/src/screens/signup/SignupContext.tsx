import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { SignupFormDataBase, MedicalLicenseBase } from '@fajr/shared/signup';
import { getTotalSteps } from '@fajr/shared/signup';

/** Mobile-specific medical license includes file URI info */
export interface MobileMedicalLicense extends MedicalLicenseBase {
  uri: string;
  name: string;
  type: string;
}

/** Mobile signup form extends the shared base with mobile-specific fields */
export interface SignupFormData extends SignupFormDataBase {
  totpSetupToken: string;
  totpVerified: boolean;
  medicalLicenses: MobileMedicalLicense[];
}

interface SignupState {
  currentStep: number;
  formData: SignupFormData;
  isSubmitting: boolean;
  emailExists: boolean;
}

type SignupAction =
  | { type: 'UPDATE_FORM'; payload: Partial<SignupFormData> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_EMAIL_EXISTS'; payload: boolean }
  | { type: 'RESET' };

const initialFormData: SignupFormData = {
  accountType: null,
  email: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
  passkeyEnabled: false,
  twoFactorSetupCompleted: false,
  totpSetupToken: '',
  totpVerified: false,
  totpCredentialData: null,
  firstName: '',
  lastName: '',
  dob: '',
  doctorSpecialty: [],
  languages: [],
  countries: [],
  gender: null,
  medicalLicenses: [],
  missionIds: [],
};

const initialState: SignupState = {
  currentStep: 0,
  formData: initialFormData,
  isSubmitting: false,
  emailExists: false,
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case 'UPDATE_FORM': {
      const newFormData = { ...state.formData, ...action.payload };

      // Keep doctor specialties constrained and keep licenses aligned to selected specialties.
      if (action.payload.doctorSpecialty !== undefined) {
        const normalizedSpecialties = Array.from(
          new Set(action.payload.doctorSpecialty),
        ).slice(0, 2);
        newFormData.doctorSpecialty = normalizedSpecialties;
        newFormData.medicalLicenses = newFormData.medicalLicenses.filter((license) =>
          normalizedSpecialties.includes(license.specialty),
        );
      }

      // If account type changed, clear type-specific fields
      if (
        action.payload.accountType !== undefined &&
        action.payload.accountType !== state.formData.accountType
      ) {
        newFormData.doctorSpecialty = [];
        newFormData.gender = null;
        newFormData.medicalLicenses = [];
        newFormData.firstName = '';
        newFormData.lastName = '';
        newFormData.dob = '';
        newFormData.languages = [];
        newFormData.countries = [];
      }
      return { ...state, formData: newFormData };
    }
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP': {
      const maxStep = getTotalSteps(state.formData.accountType) - 1;
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, maxStep),
      };
    }
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_EMAIL_EXISTS':
      return { ...state, emailExists: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface SignupContextValue {
  state: SignupState;
  formData: SignupFormData;
  currentStep: number;
  isSubmitting: boolean;
  emailExists: boolean;
  totalSteps: number;
  progress: number;
  isLastStep: boolean;
  updateFormData: (data: Partial<SignupFormData>) => void;
  goNext: () => void;
  goBack: () => void;
  setStep: (step: number) => void;
  setSubmitting: (value: boolean) => void;
  setEmailExists: (value: boolean) => void;
  reset: () => void;
  isStepValid: (step: number) => boolean;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export function useSignupContext() {
  const context = useContext(SignupContext);
  if (!context) {
    throw new Error('useSignupContext must be used within a SignupProvider');
  }
  return context;
}

export const SignupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(signupReducer, initialState);

  const updateFormData = useCallback((data: Partial<SignupFormData>) => {
    dispatch({ type: 'UPDATE_FORM', payload: data });
  }, []);

  const goNext = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const setSubmitting = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: value });
  }, []);

  const setEmailExists = useCallback((value: boolean) => {
    dispatch({ type: 'SET_EMAIL_EXISTS', payload: value });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const totalSteps = getTotalSteps(state.formData.accountType);
  const progress = totalSteps > 0 ? ((state.currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = state.currentStep === totalSteps - 1;

  const isStepValid = useCallback(
    (step: number): boolean => {
      const { formData } = state;
      switch (step) {
        case 0:
          return formData.accountType !== null;
        case 1: {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return (
            emailRegex.test(formData.email) &&
            formData.password.length >= 8 &&
            formData.password === formData.confirmPassword &&
            formData.agreedToTerms &&
            !state.emailExists
          );
        }
        case 2:
          return formData.twoFactorSetupCompleted;
        case 3: {
          const baseValid =
            !!formData.firstName &&
            !!formData.lastName &&
            !!formData.dob &&
            formData.languages.length > 0 &&
            formData.countries.length > 0;

          if (formData.accountType === 'Doctor') {
            return (
              baseValid &&
              formData.doctorSpecialty.length > 0 &&
              formData.gender !== null
            );
          }
          return baseValid; // Triage
        }
        case 4: {
          // Doctor: medical license upload. Triage: mission selection (optional).
          if (formData.accountType !== 'Doctor') return true;
          return formData.doctorSpecialty.every((specialty) =>
            formData.medicalLicenses.some((l) => l.specialty === specialty),
          );
        }
        case 5:
          // Doctor mission selection — optional, always valid
          return true;
        default:
          return false;
      }
    },
    [state],
  );

  const value = useMemo(
    () => ({
      state,
      formData: state.formData,
      currentStep: state.currentStep,
      isSubmitting: state.isSubmitting,
      emailExists: state.emailExists,
      totalSteps,
      progress,
      isLastStep,
      updateFormData,
      goNext,
      goBack,
      setStep,
      setSubmitting,
      setEmailExists,
      reset,
      isStepValid,
    }),
    [state, totalSteps, progress, isLastStep, updateFormData, goNext, goBack, setStep, setSubmitting, setEmailExists, reset, isStepValid],
  );

  return (
    <SignupContext.Provider value={value}>
      {children}
    </SignupContext.Provider>
  );
};
