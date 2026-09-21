// apps/web/components/auth/forgotPassword/EmailStep.tsx
import React, { useState, useEffect } from 'react';
import { useForgotPasswordContext } from './ForgotPasswordContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Timer } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

interface EmailStepProps {
    onNext: () => void;
}

const EmailStep: React.FC<EmailStepProps> = ({ onNext }) => {
    const {
        form,
        loading,
        setLoading,
        setToast,
        canSendVerificationCode,
        updateRateLimit,
    } = useForgotPasswordContext();
    const { register, formState: { errors }, getValues } = form;

    const [countdown, setCountdown] = useState<number>(0);

    const startCountdown = () => {
        setCountdown(60); // Start a 60-second countdown
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (countdown > 0) {
            setToast({
                title: 'Error',
                description: `Please wait ${countdown} seconds before requesting another verification code.`,
                variant: 'error',
            });
            return;
        }

        setLoading(true);
        try {
            const email = getValues('email');
            const response = await fetch('/api/auth/forgot-password/send-verification-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                updateRateLimit();
                setToast({
                    title: 'Success',
                    description: data.message,
                    variant: 'success',
                });
                onNext(); // Move to the next step
                startCountdown(); // Start the countdown after a successful request
            } else {
                setToast({
                    title: 'Error',
                    description: data.message,
                    variant: 'error',
                });
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

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                            <p className="text-destructive text-sm mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || countdown > 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            </>
                        ) : countdown > 0 ? (
                            <>
                                <Timer className="mr-2 h-4 w-4" />
                                {countdown}s
                            </>
                        ) : (
                            'Send Verification Code'
                        )}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
};

export default EmailStep;
