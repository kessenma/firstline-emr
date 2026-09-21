// apps/web/components/auth/ForgotPasswordForm.tsx
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ForgotPasswordProvider, useForgotPasswordContext } from './ForgotPasswordContext';
import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const EmailStep = dynamic(() => import('./EmailStep'), { ssr: false });
const VerificationStep = dynamic(() => import('./VerificationStep'), { ssr: false });
const ResetPasswordStep = dynamic(() => import('./ResetPasswordStep'), { ssr: false });
const ResetPasswordSuccessStep = dynamic(() => import('./ResetPasswordSuccessStep'), { ssr: false });

function ForgotPasswordFormContent() {
    const { step, handleNextStep, form } = useForgotPasswordContext();

    return (
        <FormProvider {...form}>
            <div className="w-full max-w-md space-y-4 flex flex-col items-center justify-center text-center mt-12">
                {step === 1 && <EmailStep onNext={handleNextStep} />}
                {step === 2 && <VerificationStep onNext={handleNextStep} />}
                {step === 4 && <ResetPasswordStep />}
                {step === 5 && <ResetPasswordSuccessStep />}
            </div>
        </FormProvider>
    );
}

export function ForgotPasswordForm() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    return (
        <>
            <Button
                variant="link"
                onClick={() => {
                    setIsOpening(true);
                    setIsDialogOpen(true);
                }}
                disabled={isOpening}
            >
                {isOpening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Forgot Password?
            </Button>

            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (open) setIsOpening(false);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Forgot Password</DialogTitle>
                        <DialogDescription>Enter your email to reset your password.</DialogDescription>
                    </DialogHeader>
                    <ForgotPasswordProvider>
                        <ForgotPasswordFormContent />
                    </ForgotPasswordProvider>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default ForgotPasswordForm;
