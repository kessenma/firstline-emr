// apps/web/components/auth/Submit.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { useSignupContext } from "@/components/auth/signup/container/SignupContext"
import { SendHorizonal } from "lucide-react";
import { ClipLoader } from 'react-spinners'
import { useRouter } from "next/navigation";
import { usePasskey } from "@/hooks/usePasskey";

export default function Submit() {
    const router = useRouter();
    const { formData, accountType, doctorSignupFormCompleted, triageSignupFormCompleted, medicalLicenseFormCompleted, passkeyEnabled } = useSignupContext();
    const { register: registerPasskey, isSupported: passkeySupported } = usePasskey();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [animateFlyOff, setAnimateFlyOff] = useState(false);
    const [iconPosition, setIconPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isSuccess && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            setIconPosition({
                top: buttonRect.top + buttonRect.height / 2 - 10,
                left: buttonRect.left + buttonRect.width / 2 - 10,
            });
        }
    }, [isSuccess]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // First, create the user account
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    accountType,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    dob: formData.dob,
                    languages: formData.languages,
                    countries: formData.countries,
                    ...(accountType === 'Doctor' && {
                        doctorSpecialty: formData.doctorSpecialty || [],
                        gender: formData.gender,
                    }),
                    // 2FA credentials from signup setup
                    totpCredentialData: formData.totpCredentialData || undefined,
                    passkeyCredentialData: formData.passkeyCredential || undefined,
                    // Optional mission join requests picked on the final step
                    missionIds: formData.missionIds || [],
                }),
            });
    
            const result = await response.json();
    
            if (response.ok) {
                // If user creation successful and there are medical licenses to upload
                if (accountType === 'Doctor' && formData.medicalLicenses && formData.medicalLicenses.length > 0) {
                    try {
                        // Upload each medical license
                        for (const license of formData.medicalLicenses) {
                            if (license.file) {
                                const licenseFormData = new FormData();
                                licenseFormData.append('file', license.file);
                                licenseFormData.append('firstName', formData.firstName || '');
                                licenseFormData.append('lastName', formData.lastName || '');
                                licenseFormData.append('specialty', license.specialty);
                                licenseFormData.append('userId', result.userId);

                                const uploadResponse = await fetch('/api/upload-license', {
                                    method: 'POST',
                                    body: licenseFormData,
                                });

                                if (!uploadResponse.ok) {
                                    console.error(`Failed to upload license for ${license.specialty}`);
                                    // Continue with other uploads even if one fails
                                }
                            }
                        }
                    } catch (uploadError) {
                        console.error('Error uploading medical licenses:', uploadError);
                        // Don't fail the entire signup if license upload fails
                    }
                }

                // Register passkey if enabled
                if (passkeyEnabled && passkeySupported && formData.email) {
                    try {
                        const deviceName = navigator.userAgent.includes("Mac") ? "Mac"
                            : navigator.userAgent.includes("Windows") ? "Windows"
                            : navigator.userAgent.includes("iPhone") ? "iPhone"
                            : navigator.userAgent.includes("Android") ? "Android"
                            : "Device";

                        await registerPasskey(formData.email, result.userId, deviceName);
                        console.log('Passkey registered successfully');
                    } catch (passkeyError) {
                        console.error('Error registering passkey:', passkeyError);
                        // Don't fail signup if passkey registration fails
                        // User can add passkey later from profile settings
                    }
                }

                setIsSuccess(true);
                setTimeout(() => {
                    setAnimateFlyOff(true);
                    window.history.pushState(null, '', window.location.pathname);
                    window.addEventListener('popstate', () => {
                        router.replace('/auth/signup-success');
                    });
                    setTimeout(() => {
                        router.replace('/auth/signup-success');
                    }, 2000);
                }, 100);
            } else {
                console.error('Signup failed:', result.message);
            }
        } catch (error) {
            console.error('Error making API call:', error);
        } finally {
            setIsLoading(false);
        }
    };    

    const isFormComplete = accountType === 'Doctor'
    ? doctorSignupFormCompleted && medicalLicenseFormCompleted
    : triageSignupFormCompleted;


    return (
        <div className="flex relative justify-center items-center">
            {isLoading && (
                <div className="flex absolute inset-0 justify-center items-center">
                    <ClipLoader color="hsl(var(--primary))" size={30} />
                </div>
            )}
            <Button
                ref={buttonRef}
                onClick={handleSubmit}
                disabled={isLoading || isSuccess || !isFormComplete}
                variant="default"
                size="icon"
                className="group"
                aria-label="Submit"
            >
                <SendHorizonal className={`h-5 w-5 transition-opacity duration-300 ${isSuccess ? 'opacity-0' : 'text-primary-foreground'}`} />
            </Button>

            {isSuccess && (
                <div
                    className={`fixed z-50 ${animateFlyOff ? 'animate-[flyRight_2s_ease-in-out_forwards]' : ''}`}
                    style={{
                        top: `${iconPosition.top}px`,
                        left: `${iconPosition.left}px`,
                    }}
                >
                    <SendHorizonal className="w-5 h-5 text-primary" />
                </div>
            )}


        </div>
    );
}
