// apps/web/components/telegram-patient/container/intake-form/view-model/NewPatientFormTelegramViewModel.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguageStore } from "@/stores/useLanguageStore"
import { usePatientFormStore } from "@/stores/usePatientFormStore"
import { fetchPatientData, createOrUpdatePatient } from "./api/patient-api"
import type { PartialPatientFormData } from "./../types/patient"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod/v3"

// Define the form values type that the view is expecting
export type NewPatientFormTelegramValues = {
    firstName: string
    lastName: string
    dob: string
    city: string
    phone: { countryCode: string; phoneNumber: string }
    country: string
    genderPreference: string
    chiefComplaint: string
    currentMeds?: string  // Optional to match zod schema
    allergies?: string
    preferredLanguage: string
    isPatientFields: {
        isPatient: boolean
        patientRelation?: string
    }
    [key: string]: any
}

// Define the form schema for validation
const formSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    dob: z.string().min(1, { message: "Date of birth is required" }),
    city: z.string().min(1, { message: "City is required" }),
    phone: z.object({
        countryCode: z.string().min(1, { message: "Country code is required" }),
        phoneNumber: z.string().min(1, { message: "Phone number is required" }),
    }),
    country: z.string().min(1, { message: "Country is required" }),
    genderPreference: z.string().min(1, { message: "Gender preference is required" }),
    chiefComplaint: z.string().min(1, { message: "Chief complaint is required" }),
    currentMeds: z.string().optional(),
    allergies: z.string().optional(),
    preferredLanguage: z.string(),
    isPatientFields: z
        .object({
            isPatient: z.boolean(),
            patientRelation: z
                .string()
                .optional()
                .transform((val) => (val === "" ? undefined : val)),
        })
        .refine((data) => data.isPatient || data.patientRelation, {
            message: "Patient relation is required if you are not the patient",
            path: ["patientRelation"],
        }),
})

// This is the hook that the view is expecting
export function useNewPatientFormTelegramViewModel({
                                                       initialData,
                                                       patientId,
                                                       onSubmit,
                                                       setFormDataState,
                                                       setShowModal,
                                                   }: {
    initialData?: Partial<NewPatientFormTelegramValues>
    patientId?: string
    onSubmit: (formData: NewPatientFormTelegramValues) => Promise<void>
    setFormDataState: (data: any) => void
    setShowModal: (show: boolean) => void
}) {
    // IMPORTANT: We need to use the URL token, not the patientId
    const { pathname } = window.location
    const urlToken = pathname.split("/").pop() || ""

    // Use the existing view model with the URL token
    const {
        loading,
        submitting,
        error,
        createOrUpdatePatient,
        setFormDataState: setStoreFormData,
        setShowModal: setStoreShowModal,
    } = useTelegramPatientViewModel(urlToken)

    // Initialize the form with react-hook-form
    const form = useForm<NewPatientFormTelegramValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: initialData?.firstName || "",
            lastName: initialData?.lastName || "",
            dob: initialData?.dob || "",
            city: initialData?.city || "",
            phone: initialData?.phone || { countryCode: "", phoneNumber: "" },
            country: initialData?.country || "",
            genderPreference: initialData?.genderPreference || "",
            chiefComplaint: initialData?.chiefComplaint || "",
            currentMeds: initialData?.currentMeds || "",
            allergies: initialData?.allergies || "",
            preferredLanguage: initialData?.preferredLanguage || "English",
            isPatientFields: {
                isPatient: initialData?.isPatientFields?.isPatient ?? true,
                patientRelation: initialData?.isPatientFields?.patientRelation || "",
            },
        },
    })

    // Handle form submission
    const handleSubmit = form.handleSubmit(async (data) => {
        try {
            // Update form data in the store
            setFormDataState(data)
            setStoreFormData(data)

            // Call the API to create/update patient
            await createOrUpdatePatient(data)

            // Call the provided onSubmit callback
            await onSubmit(data)

            // Show success modal
            setShowModal(true)
            setStoreShowModal(true)
        } catch (error) {
            console.error("Form submission error:", error)
        }
    })

    return {
        form,
        loading,
        submitting,
        error,
        handleSubmit,
    }
}

// Original view model hook
export function useTelegramPatientViewModel(token: string | undefined) {
    const router = useRouter()
    const [patientData, setPatientData] = useState<PartialPatientFormData | null>(null)
    const [loading, setLoading] = useState(true)
    const [invalidId, setInvalidId] = useState(false)
    const [telegramChatId, setTelegramChatId] = useState<string>("")
    const [tokenSubmitted, setTokenSubmitted] = useState(false)

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

    // Fetch patient data
    useEffect(() => {
        async function loadPatientData() {
            if (!token) {
                console.log("No token provided, setting invalidId")
                setLoading(false)
                setInvalidId(true)
                return
            }

            try {
                // Make sure we're using the token from the URL, not the patient ID
                console.log("Using token from URL:", token)
                const data = await fetchPatientData(token)
                console.log("Patient data received:", data)

                if (data.patient) {
                    if (data.patient.preferredLanguage) {
                        setLanguage(data.patient.preferredLanguage)
                    }
                    setPatientData(data.patient)
                    setTelegramChatId(data.patient.telegramChatId || "")

                    // Check if the token has been submitted
                    if (data.tokenSubmitted) {
                        setTokenSubmitted(true)
                    }
                }
            } catch (error) {
                console.error("Failed to fetch patient data:", error)
                setInvalidId(true)
                setError(error instanceof Error ? error.message : "Unable to access patient data")
            } finally {
                setLoading(false)
            }
        }

        loadPatientData()
    }, [token, setError, setLanguage, router])

    // Handle patient update
    const handlePatientUpdate = async (formData: PartialPatientFormData): Promise<any> => {
        setSubmitting(true)

        try {
            // Ensure the language from the store is used
            formData.preferredLanguage = language

            // Make sure we're using the token from the URL, not the patient ID
            const data = await createOrUpdatePatient(token || "", formData, language, telegramChatId)

            console.log("Update response:", data)
            setPatientData(data.patient)

            // Update token submitted status if returned from API
            if (data.tokenSubmitted) {
                setTokenSubmitted(true)
            }

            return data
        } catch (error) {
            console.error("Error updating patient:", error)

            if (error instanceof Error && error.message === "Invalid ID") {
                setInvalidId(true)
                return null
            }

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
        createOrUpdatePatient: handlePatientUpdate,
        invalidId,
        tokenSubmitted,
    }
}
