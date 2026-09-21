// apps/web/components/auth/PasswordEmailForm.tsx

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { Form } from "@/components/ui/form";
import PasswordFormField from '@/components/ui/passwordFormField';
import { useSignupContext } from './container/SignupContext';
import EmailField from "@/components/ui/emailField";
import TermsAgreementDrawer from './policy-and-terms/TermsAgreementDrawer';
import { Switch } from "@/components/ui/switch";
import { Fingerprint, Info, ShieldCheck, Zap, RefreshCw, Lock } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { usePasskey } from "@/hooks/usePasskey";

const passwordEmailSchema = z.object({
    email: z.string().email("Invalid email address").transform(val => val.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type PasswordEmailFormValues = z.infer<typeof passwordEmailSchema>;


const PasswordEmailForm = () => {
    const {
        formData,
        setFormData,
        updateAnsweredQuestions,
        setValidEmail,
        setPasswordsMatch,
        agreedToTerms,
        setAgreedToTerms,
        passkeyEnabled,
        setPasskeyEnabled,
    } = useSignupContext();

    const [showPasskeyInfo, setShowPasskeyInfo] = useState(false);
    const { isSupported: passkeySupported } = usePasskey();

    const form = useForm<PasswordEmailFormValues>({
        resolver: zodResolver(passwordEmailSchema),
        defaultValues: {
            email: formData.email ? formData.email.toLowerCase() : '',
            password: formData.password || '',
            confirmPassword: formData.confirmPassword || '',
        },
        mode: 'onChange',
    });

    const email = form.watch('email');
    const password = form.watch('password');
    const confirmPassword = form.watch('confirmPassword');

    useEffect(() => {
        const emailFilled = !!email;
        const passwordFilled = !!password;
        const confirmPasswordFilled = !!confirmPassword;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailRegex.test(email);

        updateAnsweredQuestions(1, Number(emailFilled) + Number(passwordFilled) + Number(confirmPasswordFilled));

        setFormData((prevData) => ({
            ...prevData,
            email: email.toLowerCase(),
            password,
            confirmPassword,
        }));

        setPasswordsMatch(password === confirmPassword && passwordFilled);
        setValidEmail(isEmailValid);
    }, [email, password, confirmPassword, updateAnsweredQuestions, setFormData, setPasswordsMatch, setValidEmail]);

    const handleAgreementChange = (agreed: boolean) => {
        setAgreedToTerms(agreed);
    };

    return (
        <Form {...form}>
            <form className="h-full flex flex-col justify-between lg:space-y-8 lg:w-1/2 mx-auto py-8">
                <EmailField
                    form={form}
                    fieldName="email"
                    fieldLabel="Email"
                />
                <PasswordFormField
                    fieldName="password"
                    fieldLabel="Password"
                />
                <PasswordFormField
                    fieldName="confirmPassword"
                    fieldLabel="Confirm Password"
                />
                <TermsAgreementDrawer />

                {/* Passkey Enrollment Option */}
                {passkeySupported && (
                    <div className={`py-4 px-4 border rounded-lg mt-4 ${passkeyEnabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Fingerprint className={`h-5 w-5 ${passkeyEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">Enable Passkey Login</span>
                                    <span className="text-xs text-muted-foreground">Use Face ID, Touch ID, or fingerprint</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPasskeyInfo(true)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Learn more about passkeys"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                            <Switch
                                checked={passkeyEnabled}
                                onCheckedChange={setPasskeyEnabled}
                            />
                        </div>
                        {passkeyEnabled && (
                            <p className="text-xs text-primary mt-3 pl-8">
                                You&apos;ll be prompted to set up your passkey after your account is created. You can skip this step if needed.
                            </p>
                        )}
                    </div>
                )}
            </form>

            {/* Passkey Info Sheet */}
            <Sheet open={showPasskeyInfo} onOpenChange={setShowPasskeyInfo}>
                <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
                    <SheetHeader className="text-left">
                        <SheetTitle className="flex items-center gap-2 text-xl">
                            <Fingerprint className="h-6 w-6 text-primary" />
                            What are Passkeys?
                        </SheetTitle>
                        <SheetDescription>
                            A more secure and convenient way to sign in
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-6">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Passkeys are a modern replacement for passwords that use your device&apos;s
                            built-in security features like Face ID, Touch ID, fingerprint scanning,
                            or Windows Hello.
                        </p>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-foreground">Benefits:</h4>
                            <div className="grid gap-3">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-sm">More Secure</p>
                                        <p className="text-xs text-muted-foreground">Can&apos;t be phished, stolen, or guessed like passwords</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Zap className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-sm">Faster Sign-in</p>
                                        <p className="text-xs text-muted-foreground">Just use your face, fingerprint, or device PIN</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-sm">Syncs Across Devices</p>
                                        <p className="text-xs text-muted-foreground">Works on all your devices via iCloud or Google</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Lock className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-sm">Password Still Works</p>
                                        <p className="text-xs text-muted-foreground">Your password remains as a backup option</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">Note:</strong> You can add or remove passkeys
                                at any time from your account settings after signing up.
                            </p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </Form>
    );
};

export default PasswordEmailForm;