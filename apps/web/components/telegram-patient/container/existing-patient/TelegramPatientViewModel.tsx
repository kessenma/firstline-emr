// apps/web/components/telegram-patient/container/existing-patient/TelegramPatientViewModel.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguageStore } from "@/stores/useLanguageStore"
import { usePatientFormStore } from "@/stores/usePatientFormStore"

export interface PartialPatientFormData {
    firstName?: string
    lastName?: string
    dob?: string
    city?: string
    phone?: { countryCode: string; phoneNumber: string }
    country?: string
    genderPreference?: string
    chiefComplaint?: string
    createdAt?: Date
    isPatientFields?: {
        isPatient: boolean
        patientRelation?: string
    }
    hasSubmittedInfo?: boolean
    preferredLanguage?: string
    telegramChatId?: string
    [key: string]: any
}

export function useTelegramPatientViewModel(token: string | undefined) {
    const router = useRouter()
    const [patientData, setPatientData] = useState<PartialPatientFormData | null>(null)
    const [loading, setLoading] = useState(true)
    const [invalidId, setInvalidId] = useState(false)
    const [telegramChatId, setTelegramChatId] = useState<string>("")

    // Use Zustand stores
    const { language, setLanguage } = useLanguageStore()
    const {
        formData: formDataState,
        showModal,
        showErrorModal,
        error,
        submitting,
        setFormData: setFormDataState,
        setShowModal,
        setShowErrorModal,
        setError,
        setSubmitting,
    } = usePatientFormStore()

    // Redirect to access denied page if token is invalid
    useEffect(() => {
        if (invalidId) {
            console.log("Redirecting to access-denied due to invalid token")
            router.push("/telegram-patient/access-denied/")
        }
    }, [invalidId, router])

    // Fetch patient data
    useEffect(() => {
        async function fetchPatient() {
            if (!token) {
                console.log("No token provided, setting invalidId")
                setLoading(false)
                setInvalidId(true)
                return
            }

            try {
                // Use the token for the API call
                console.log("Fetching patient data with token:", token)
                const response = await fetch(`/api/telegram-intake-form/${token}`)
                console.log("API response status:", response.status)

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    console.error("API error:", errorData)

                    setInvalidId(true)

                    if (errorData.message) {
                        setError(errorData.message)
                    } else {
                        setError("Failed to fetch patient data")
                    }

                    return
                }

                const data = await response.json()
                console.log("Patient data received:", data)

                if (data.patient) {
                    if (data.patient.preferredLanguage) {
                        setLanguage(data.patient.preferredLanguage)
                    }
                    setPatientData(data.patient)
                    setTelegramChatId(data.patient.telegramChatId || "")
                }
            } catch (error) {
                console.error("Failed to fetch patient data:", error)
                setInvalidId(true)
                setError("Unable to access patient data")
            } finally {
                setLoading(false)
            }
        }

        fetchPatient()
    }, [token, setError, setLanguage, router])

    // Create or update patient
    const createOrUpdatePatient = async (formData: PartialPatientFormData): Promise<any> => {
        if (!token) {
            setError("Missing token")
            setShowErrorModal(true)
            throw new Error("Missing token")
        }

        setSubmitting(true)

        try {
            // Ensure the language from the store is used
            formData.preferredLanguage = language

            // Create a complete form data object with all required fields
            const completeFormData: any = {
                firstName: formData.firstName || "",
                lastName: formData.lastName || "",
                dob: formData.dob || "",
                city: formData.city || "",
                phone: formData.phone || { countryCode: "", phoneNumber: "" },
                country: formData.country || "",
                genderPreference: formData.genderPreference || "",
                chiefComplaint: formData.chiefComplaint || "",
                createdAt: formData.createdAt || new Date(),
                isPatient: formData.isPatientFields?.isPatient || false,
                patientRelation: formData.isPatientFields?.patientRelation || "",
                hasSubmittedInfo: true, // Always mark as submitted when updating
                preferredLanguage: formData.preferredLanguage || language,
                telegramChatId: telegramChatId || patientData?.telegramChatId || "",
            }

            // Use the token for the API call
            console.log("Updating patient with token:", token)
            const response = await fetch(`/api/telegram-intake-form/${token}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(completeFormData),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error("API update error:", errorData)

                if (errorData.invalidId) {
                    setInvalidId(true)
                    return null
                }

                setError(errorData.message || "Failed to update patient")
                setShowErrorModal(true)
                return null
            }

            const data = await response.json()
            console.log("Update response:", data)
            setPatientData(data.patient)
            return data
        } catch (error) {
            console.error("Error updating patient:", error)
            setError(error instanceof Error ? error.message : "Failed to update patient")
            setShowErrorModal(true)
            return null
        } finally {
            setSubmitting(false)
        }
    }

    return {
        patientData,
        loading,
        error,
        language,
        setLanguage,
        formDataState,
        setFormDataState,
        showModal,
        setShowModal,
        showErrorModal,
        setShowErrorModal,
        submitting,
        createOrUpdatePatient,
        invalidId,
    }
}
