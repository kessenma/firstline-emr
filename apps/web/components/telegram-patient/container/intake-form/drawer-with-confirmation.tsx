// apps/web/components/telegram-patient/container/intake-form/drawer-with-confirmation.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import ConfirmationContent from "./confirmation/confirmation-content"
import { usePatientFormStore } from "@/stores/usePatientFormStore"
import { useLanguageStore } from "@/stores/useLanguageStore"

export default function DrawerWithConfirmation() {
    // Use your stores instead of local state
    const { formData, showModal, setShowModal, submitting, setSubmitting } = usePatientFormStore()

    const { language } = useLanguageStore()

    const handleDrawerClose = () => setShowModal(false)

    // Mock function for demo - in real app you'd use your API call
    const getPatientId = () => "PT12345"

    const handleConfirmSubmit = async (): Promise<void> => {
        setSubmitting(true)
        try {
            // Your actual submit logic here
            await new Promise((resolve) => setTimeout(resolve, 1000))
            setSubmitting(false)
        } catch (error) {
            console.error("Error submitting form:", error)
            setSubmitting(false)
        }
    }

    return (
        <div>
            {/* Using the correct props for your custom Drawer component */}
            <Drawer isOpen={showModal} onClose={handleDrawerClose}>
                <DrawerContent>
                    <ConfirmationContent
                        patientId={getPatientId()}
                        patientName={{
                            firstName: formData.firstName || "",
                            lastName: formData.lastName || "",
                        }}
                        onClose={handleDrawerClose}
                        submittingFromNoSession={true}
                        setSubmittingFromNoSession={() => {}}
                        submit={handleConfirmSubmit}
                        language={language}
                    />
                </DrawerContent>
            </Drawer>

            {/* Button to open the drawer */}
            <Button onClick={() => setShowModal(true)}>Open Confirmation</Button>
        </div>
    )
}

