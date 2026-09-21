// apps/web/components/patient-dashboard/viewModel/notifications/send-specialty-notification.ts
import axios from "axios"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import type { PatientWithMessages } from "../types"

// Interface for the toast function
interface ToastOptions {
    title: string
    description: string
    variant: "default" | "destructive" | "success" | "error"
}

/**
 * Sends a notification to doctors with a specific specialty
 * This is a standalone function that can be used anywhere in the application
 */
export async function sendSpecialtyNotification({
                                                    patientId,
                                                    specialty,
                                                    patientData,
                                                    setToast,
                                                    setLoadingState,
                                                }: {
    patientId: string
    specialty: DoctorSpecialtyList
    patientData?: PatientWithMessages | null
    setToast: (options: ToastOptions) => void
    setLoadingState?: (isLoading: boolean) => void
}): Promise<boolean> {
    try {
        if (setLoadingState) {
            setLoadingState(true)
        }

        // Get patient details if not provided
        let patientName = "Patient"
        let patientCountry = "Unknown"
        let patientLanguage = "English"

        if (patientData) {
            patientName = `${patientData.firstName || ""} ${patientData.lastName || ""}`.trim() || "Patient"
            patientCountry = patientData.country || "Unknown"
            patientLanguage = patientData.language || "English"
        }

        // Call the specialty notification API
        const response = await axios.post("/api/user/send-specialty-notification", {
            specialty,
            patientId,
            patientName,
            patientCountry,
            patientLanguage,
            subject: `New ${specialty} Patient Case`,
            message: `A new patient case requiring ${specialty} expertise has been assigned. Patient: ${patientName}. Language: ${patientLanguage}.`,
        })

        // Handle the response
        const { totalCount } = response.data

        if (totalCount > 0) {
            setToast({
                title: "Notifications Sent",
                description: `Notifications sent to ${totalCount} doctors for ${specialty}`,
                variant: "success",
            })
            return true
        } else {
            setToast({
                title: "No Recipients Found",
                description: `No doctors found with specialty ${specialty} who speak ${patientLanguage}.`,
                variant: "default",
            })
            return false
        }
    } catch (error: any) {
        console.error("Error sending specialty notification:", error)

        // Check if we have a specific error message from the API
        const errorMessage = error.response?.data?.error || "Could not notify doctors with this specialty."

        setToast({
            title: "Notification Failed",
            description: errorMessage,
            variant: "destructive",
        })
        return false
    } finally {
        if (setLoadingState) {
            setLoadingState(false)
        }
    }
}
