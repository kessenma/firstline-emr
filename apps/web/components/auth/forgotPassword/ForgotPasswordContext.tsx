// apps/web/components/auth/forgotPassword/ForgotPasswordContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordFormValues, forgotPasswordSchema, SecurityQuestionData } from './forgotPasswordSchema';
import { useToast, ToastProps } from '../../hooks/useToast';
import bcrypt from "bcryptjs";

interface ForgotPasswordContextType {
    step: number;
    setStep: (step: number) => void;
    form: UseFormReturn<ForgotPasswordFormValues>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    submitting: boolean;
    setSubmitting: (submitting: boolean) => void;
    setToast: (toast: ToastProps | null) => void;
    handleNextStep: () => Promise<void>;
    handleVerificationStep: (tempCode: string) => Promise<void>;
    canSendVerificationCode: () => boolean;
    updateRateLimit: () => void;
    handleResetPassword: (data: ForgotPasswordFormValues) => Promise<void>;
}

const ForgotPasswordContext = createContext<ForgotPasswordContextType | undefined>(undefined);

export const useForgotPasswordContext = () => {
    const context = useContext(ForgotPasswordContext);
    if (!context) {
        throw new Error('useForgotPasswordContext must be used within a ForgotPasswordProvider');
    }
    return context;
};

export const ForgotPasswordProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { setToast } = useToast();
    const [rateLimit, setRateLimit] = useState({ lastRequestTime: 0, requestCount: 0 });

    const form = useForm<ForgotPasswordFormValues>({
        defaultValues: {
            email: '',
            tempCode: '',
            securityAnswer: '',
            newPassword: '',
            confirmNewPassword: '',
        },
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onChange',
    });

    const handleNextStep = async () => {
        try {
            setLoading(true);
            if (step === 1) {
                setStep(2);
            } else if (step === 2) {
                await form.trigger('tempCode');
                if (form.formState.isValid) {
                    const email = form.getValues('email');
                    const code = form.getValues('tempCode');
                    const verifyResponse = await fetch('/api/auth/forgot-password/verify-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, code }),
                    });

                    if (verifyResponse.ok) {
                        setStep(4); // Skip step 3 and go directly to password reset
                    } else {
                        setToast({
                            title: 'Error',
                            description: 'Invalid verification code.',
                            variant: 'error',
                        });
                    }
                }
            }
        } catch (error) {
            setToast({
                title: 'Error',
                description: 'An error occurred. Please try again.',
                variant: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const canSendVerificationCode = () => {
        const now = Date.now();
        const timeSinceLastRequest = now - rateLimit.lastRequestTime;
        const cooldownPeriod = 60 * 1000; // 1 minute cooldown
        const maxRequests = 3; // Max 3 requests per cooldown period

        if (timeSinceLastRequest > cooldownPeriod) {
            return true;
        }

        return rateLimit.requestCount < maxRequests;
    };

    const updateRateLimit = () => {
        const now = Date.now();
        const timeSinceLastRequest = now - rateLimit.lastRequestTime;
        const cooldownPeriod = 60 * 1000; // 1 minute cooldown

        if (timeSinceLastRequest > cooldownPeriod) {
            setRateLimit({ lastRequestTime: now, requestCount: 1 });
        } else {
            setRateLimit(prev => ({
                lastRequestTime: now,
                requestCount: prev.requestCount + 1,
            }));
        }
    };

    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

    const handleVerificationStep = async (tempCode: string) => {
        try {
            setLoading(true);
            const email = form.getValues('email');

            if (!email) {
                throw new Error("Email is missing in the verification step.");
            }

            const verifyResponse = await fetch('/api/auth/forgot-password/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, tempCode }),
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.error || 'Invalid verification code.');
            }

            setVerifiedEmail(email);
            setStep(4);
        } catch (error) {
            setToast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred. Please try again.',
                variant: 'error',
            });
        } finally {
            setLoading(false);
        }
    };


    const handleResetPassword = async (data: ForgotPasswordFormValues) => {
        try {
            setSubmitting(true);

            if (!verifiedEmail || !data.newPassword) {
                setToast({
                    title: 'Error',
                    description: 'Something went wrong. Please restart the reset process.',
                    variant: 'error'
                });
                return;
            }


            const response = await fetch('/api/auth/forgot-password/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: verifiedEmail, newPassword: data.newPassword }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            setToast({
                title: 'Success',
                description: 'Password reset successfully.',
                variant: 'success'
            });
            setStep(5);
        } catch (error) {
            setToast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An error occurred. Please try again.',
                variant: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <ForgotPasswordContext.Provider
            value={{
                step,
                setStep,
                handleNextStep,
                form,
                loading,
                setLoading,
                submitting,
                setSubmitting,
                setToast,
                handleVerificationStep,
                canSendVerificationCode,
                updateRateLimit,
                handleResetPassword
            }}
        >
            {children}
        </ForgotPasswordContext.Provider>
    );
};
