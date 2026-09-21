"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import { useSignupContext } from "./container/SignupContext"
import UserTypeForm from "./1UserTypeForm"
import PasswordEmailForm from "./2PasswordEmailForm"
import TwoFactorSetupForm from "./3TwoFactorSetupForm"
import DoctorSignupForm from "./user-type-forms/DoctorSignupForm"
import TriageSignupForm from "./user-type-forms/TriageSignupForm"
import MedicalLicenseUpload from "./4MedicalLicenseUpload"
import MissionSelectionForm from "./5MissionSelectionForm"
import { getFinalStep } from "@fajr/shared/signup"
import NextButton from "@/components/auth/signup/container/NextButton"
import Submit from "@/components/auth/signup/container/Submit"
import ProgressBar from "./container/progressBar"
import BackButton from "@/components/auth/signup/container/BackButton"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface SignupSectionProps {
    onExpand: () => void
    toggleExpand: () => void
    isExpanded: boolean
}

const SignupSection: React.FC<SignupSectionProps> = ({ onExpand, toggleExpand, isExpanded }) => {
    const { currentStep, accountType, handleBack, progress } = useSignupContext()
    const [showScrollIndicator, setShowScrollIndicator] = useState(false)
    const controls = useAnimation()

    useEffect(() => {
        const handleScroll = () => {
            const element = document.getElementById("signup-form-container")
            if (element) {
                const { scrollTop, scrollHeight, clientHeight } = element
                setShowScrollIndicator(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 20)
            }
        }

        const element = document.getElementById("signup-form-container")
        if (element) {
            element.addEventListener("scroll", handleScroll)
            handleScroll() // Check initial state
        }

        return () => {
            if (element) {
                element.removeEventListener("scroll", handleScroll)
            }
        }
    }, [currentStep])

    useEffect(() => {
        if (showScrollIndicator) {
            controls.start({
                y: [0, 10, 0],
                transition: { repeat: Number.POSITIVE_INFINITY, duration: 1.5 },
            })
        } else {
            controls.stop()
        }
    }, [showScrollIndicator, controls])

    const renderForm = () => {
        switch (currentStep) {
            case 0:
                return <UserTypeForm onExpand={onExpand} />
            case 1:
                return <PasswordEmailForm />
            case 2:
                return <TwoFactorSetupForm />
            case 3:
                if (accountType === "Doctor") {
                    return <DoctorSignupForm />
                } else if (accountType === "Triage") {
                    return <TriageSignupForm />
                }
                return null
            case 4:
                if (accountType === "Doctor") {
                    return <MedicalLicenseUpload />
                }
                return <MissionSelectionForm />
            case 5:
                if (accountType === "Doctor") {
                    return <MissionSelectionForm />
                }
                return null
            default:
                return null
        }
    }

    const renderButton = () => {
        const finalStep = getFinalStep(accountType);
        if (currentStep === finalStep) {
            return <Submit />
        }
        return <NextButton />
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="mt-12 px-4 -mb-4">
                <ProgressBar progress={progress} />
            </div>
            <div id="signup-form-container" className="grow overflow-y-auto w-full relative p-4">
                {currentStep === 0 && accountType && (
                    <motion.div
                        className="absolute top-0 left-0 w-full h-full"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 0.35, scale: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                            background: `radial-gradient(circle at center, ${
                                accountType === 'Doctor'
                                    ? 'rgba(79,142,201,0.20)'
                                    : accountType === 'Triage'
                                        ? 'rgba(53,157,152,0.20)'
                                        : 'rgba(0,0,0,0.15)'
                            } 5%, transparent 70%)`,
                            filter: 'blur(12px)',
                            zIndex: 0,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {renderForm()}
                {showScrollIndicator && (
                    <motion.div className="absolute bottom-4 left-1/2 transform -translate-x-1/2" animate={controls}>
                        <div className="bg-background text-foreground rounded-full p-2 shadow-md">
                            <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}>
                                <ChevronDownIcon size={24} />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </div>
            <div className="sticky bottom-0 z-10 p-4 border-t flex justify-between items-center">
                {currentStep > 0 && <BackButton />}
                <div className="grow flex justify-center">
                    <AnimatePresence mode="wait">
                        {(currentStep !== 0 || accountType) && (
                            <motion.div
                                key="signup-next-button"
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{
                                    delay: 0.6,
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25
                                }}
                            >
                                {renderButton()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <motion.button
                    className="bg-background text-foreground rounded-full p-2 shadow-md"
                    onClick={toggleExpand}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    {isExpanded ? <ChevronUpIcon size={24} className="text-muted-foreground" /> : <ChevronDownIcon size={24} className="text-muted-foreground" />}
                </motion.button>
            </div>
        </div>
    )
}

export default SignupSection
