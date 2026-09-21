// apps/web/components/auth/signup/NextButton.tsx
'use client';

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react";
import { useSignupContext } from "@/components/auth/signup/container/SignupContext"
import { useToast } from "../../../hooks/useToast"
import { Loader2 } from "lucide-react"

export default function NextButton() {
    const {
        stepAnswers,
        currentStep,
        handleNext,
        accountType,
        passwordsMatch,
        twoFactorSetupCompleted,
        doctorSignupFormCompleted,
        triageSignupFormCompleted,
        medicalLicenseFormCompleted,
        formData,
        setEmailExists,
        agreedToTerms,
    } = useSignupContext()

    const { setToast } = useToast(); // Change toast to setToast
    const [loading, setLoading] = useState(false)

    const getTotalRequiredFieldsForStep = (step: number) => {
        switch (step) {
            case 0:
                return 1
            case 1:
                return 3
            case 2:
                return 6
            case 3:
                return accountType === 'Doctor' ? 7 : 3 // doctor needs 7 fields, triage needs 3 (firstName, lastName, dob)
            case 4:
                return 1 // Doctor medical license upload - 1 completion check
            default:
                return 0
        }
    }

    const isCurrentStepComplete = () => {
        if (currentStep === 0) return accountType !== null
        if (currentStep === 1) return stepAnswers[currentStep] === getTotalRequiredFieldsForStep(currentStep) && passwordsMatch && agreedToTerms
        if (currentStep === 2) return twoFactorSetupCompleted
        if (currentStep === 3) return accountType === 'Doctor' ? doctorSignupFormCompleted : triageSignupFormCompleted
        if (currentStep === 4 && accountType === 'Doctor') return medicalLicenseFormCompleted
        // Mission selection step (4 Triage / 5 Doctor) is optional — always advanceable
        return true
    }

    const canProceed = isCurrentStepComplete()

    const handleEmailCheck = async () => {
        if (currentStep === 1 && formData.email && formData.email.trim() !== '') {
            try {
                const res = await fetch(`/api/auth/signup/email-check?email=${encodeURIComponent(formData.email)}`, {
                    method: 'GET',
                })

                const data = await res.json()

                if (res.status === 409 || data.exists) {
                    console.log('Email already exists')
                    setToast?.({
                        title: "Account already exists",
                        description: "Please login with this email or use another email to continue.",
                        variant: "destructive",
                    })
                    setEmailExists(true)
                    return false
                }

                if (res.status === 200 && !data.exists) {
                    console.log('Email is available')
                    setEmailExists(false)
                    return true
                }

                setToast?.({
                    title: "Error",
                    description: "Something went wrong. Please try again.",
                    variant: "destructive",
                })
                return false

            } catch (error) {
                console.error('Error checking email:', error)
                setToast?.({
                    title: "Error",
                    description: "Something went wrong. Please try again.",
                    variant: "destructive",
                })
                return false
            }
        }
        return true
    }

    const handleNextStep = async () => {
        if (!canProceed) {
            return
        }

        setLoading(true)

        if (currentStep === 1) {
            const emailCheckPassed = await handleEmailCheck()
            if (emailCheckPassed) {
                handleNext()
            }
        } else {
            handleNext()
        }

        setLoading(false)
    }

    return (
        <Button
            onClick={handleNextStep}
            disabled={!canProceed || loading}
            variant="default"
            size="icon"
            className="group"
            aria-label="Next"
        >
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
            ) : (
                <Send className="h-5 w-5 text-primary-foreground" />
            )}
        </Button>
    )
}
