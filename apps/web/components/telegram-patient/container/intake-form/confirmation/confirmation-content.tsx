// apps/web/components/telegram-patient/container/intake-form/confirmation/confirmation-content.tsx
"use client"

import { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { CircleLoader } from "react-spinners"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { confirmationModal } from "./confirmation-drawer-translations"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LanguageString } from "@/components/telegram-patient/container/intake-form/patient-form-translations"

type PatientName = {
    firstName: string
    lastName: string
}

type ConfirmationContentProps = {
    patientId: string
    patientName: PatientName
    onClose: () => void
    submittingFromNoSession: boolean
    setSubmittingFromNoSession: (value: boolean) => void
    submit: () => Promise<void>
    language: LanguageString
}

const ConfirmationContent = ({
                                 patientId,
                                 patientName,
                                 onClose,
                                 submittingFromNoSession,
                                 setSubmittingFromNoSession,
                                 submit,
                                 language,
                             }: ConfirmationContentProps) => {
    const patientSubmitting = useRef(submittingFromNoSession)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [agreeChecked, setAgreeChecked] = useState(false)
    const [agreeSMSChecked, setAgreeSMSChecked] = useState(false)
    const [declareChecked, setDeclareChecked] = useState(false)
    const [requestChecked, setRequestChecked] = useState(false)
    const [fadeOut, setFadeOut] = useState(false)
    const [allChecked, setAllChecked] = useState(false)

    // Check if all checkboxes are checked
    useEffect(() => {
        setAllChecked(declareChecked && requestChecked && agreeChecked && agreeSMSChecked)
    }, [declareChecked, requestChecked, agreeChecked, agreeSMSChecked])

    const handleSubmit = async () => {
        if (allChecked) {
            setIsSubmitting(true)
            try {
                // Now we make the API call when the user confirms
                await submit()
                // Close the modal after successful submission
                setTimeout(() => {
                    onClose()
                }, 500) // Short delay before closing
            } catch (error) {
                console.error("Error submitting form:", error)
                setIsSubmitting(false)
                // Handle error (maybe show an error message)
            }
        } else {
            alert(confirmationModal.agreeToTerms[language])
        }
    }

    return (
        <div className={`w-full h-full flex flex-col transition-all duration-1000 ${fadeOut ? "opacity-0" : ""}`}>
            {submittingFromNoSession ? (
                <div className="flex flex-col h-full">
                    <div className="flex justify-center p-4">
                        <Image src="/assets/images/fajr-logo.svg" alt="MENA Health Logo" width={150} height={48} priority />
                    </div>

                    <div className="px-6 py-4 bg-muted">
                        <h2 className="text-xl text-center text-primary font-semibold">Terms and Conditions</h2>
                    </div>

                    {isSubmitting ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <CircleLoader color="hsl(var(--accent))" size={60} />
                            <p className="text-primary font-medium text-center">{"Submitting..."}</p>
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-1 overflow-y-auto">
                                <div className="p-6 space-y-6">
                                    <ul className="space-y-4 list-disc pl-6">
                                        <li className="text-foreground">{confirmationModal.shareData[language]}</li>
                                        <li className="text-foreground">{confirmationModal.transferData[language]}</li>
                                    </ul>

                                    <div className="space-y-4 mt-6">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="declare"
                                                checked={declareChecked}
                                                onCheckedChange={(checked) => setDeclareChecked(checked === true)}
                                            />
                                            <Label htmlFor="declare" className="text-sm text-foreground font-normal">
                                                {confirmationModal.declareTrue[language]}
                                            </Label>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="request"
                                                checked={requestChecked}
                                                onCheckedChange={(checked) => setRequestChecked(checked === true)}
                                            />
                                            <Label htmlFor="request" className="text-sm text-foreground font-normal">
                                                {confirmationModal.requestServices[language]}
                                            </Label>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="agree"
                                                checked={agreeChecked}
                                                onCheckedChange={(checked) => setAgreeChecked(checked === true)}
                                            />
                                            <Label htmlFor="agree" className="text-sm text-foreground font-normal">
                                                {confirmationModal.agree[language]}
                                            </Label>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="agreeSMS"
                                                checked={agreeSMSChecked}
                                                onCheckedChange={(checked) => setAgreeSMSChecked(checked === true)}
                                            />
                                            <Label htmlFor="agreeSMS" className="text-sm text-foreground font-normal">
                                                {confirmationModal.agreeSMS[language]}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-4 flex flex-row justify-between border-t bg-card sticky bottom-0">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="rounded-full px-6 py-2 text-primary border-border"
                                    disabled={isSubmitting}
                                >
                                    {confirmationModal.close[language]}
                                </Button>
                                <Button
                                    variant="orange"
                                    onClick={handleSubmit}
                                    className={`rounded-full px-6 py-2 ${!allChecked ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={isSubmitting || !allChecked}
                                >
                                    {isSubmitting ? "Submitting..." : confirmationModal.submit[language]}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-primary">{confirmationModal.successful[language]}</h2>
                    </div>

                    <div className="py-4 space-y-2">
                        <p className="text-foreground">
                            {confirmationModal.patientId[language]}: {patientId}
                        </p>
                        <p className="text-foreground">
                            {confirmationModal.name[language]}: {patientName.firstName} {patientName.lastName}
                        </p>
                        {patientSubmitting.current && (
                            <p className="text-foreground">{confirmationModal.confirmationMessage[language]}</p>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button
                            variant="orange"
                            onClick={onClose}
                            className="rounded-full px-6 py-2"
                        >
                            {confirmationModal.close[language]}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ConfirmationContent
