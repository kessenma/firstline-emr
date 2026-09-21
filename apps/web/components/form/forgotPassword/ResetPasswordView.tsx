// apps/web/components/form/forgotPassword/ResetPasswordView.tsx

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useResetPasswordViewModel } from './ResetPasswordViewModel';
import { Button } from '@/components/ui/button';
import PasswordFormField from '@/components/ui/passwordFormField';

interface ResetPasswordViewProps {
    code: string;
    onSuccess?: () => void;
}

interface ResetPasswordFormData {
    newPassword: string;
    confirmNewPassword: string;
}

export default function ResetPasswordView({ code, onSuccess }: ResetPasswordViewProps) {
    const { resetPassword, submitting, isValidLink, loading } = useResetPasswordViewModel(code, onSuccess);
    const methods = useForm<ResetPasswordFormData>();

    const onSubmit = (data: ResetPasswordFormData) => {
        if (data.newPassword === data.confirmNewPassword) {
            resetPassword(data);
        }
    };

    if (loading) return <p>Loading...</p>;

    if (!isValidLink)
        return <p className={'shadow-lg shadow-destructive text-destructive border-l-2 border-destructive m-10 p-10 rounded-lg text-center text-xl mt-24'}>Invalid or expired reset link. Password reset links expire after 24 hours. Please contact an admin for a new reset link if you need one.</p>;

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                <PasswordFormField
                    fieldName="newPassword"
                    fieldLabel="New Password"
                />
                <PasswordFormField
                    fieldName="confirmNewPassword"
                    fieldLabel="Confirm New Password"
                />
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Resetting...' : 'Reset Password'}
                </Button>
            </form>
        </FormProvider>
    );
}
