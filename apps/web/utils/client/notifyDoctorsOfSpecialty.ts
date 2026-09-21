// apps/web/utils/notifications/notifyDoctorsOfSpecialty.ts
import axios from "axios"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"

// Interface for the response from the specialty notification API
interface SpecialtyNotificationResponse {
    success?: boolean
    totalCount: number
    notificationId?: string
    error?: string
}

// Interface for the toast function
interface ToastOptions {
    title: string
    description: string
    variant: "default" | "destructive" | "success" | "error"
}

/**
 * Client-side helper function to send specialty notifications
 * This function ONLY handles sending notifications, not updating patient data
 */
export async function sendSpecialtyNotification({
                                                    patientId,
                                                    specialty,
                                                    patientName = "Patient",
                                                    patientCountry = "Unknown",
                                                    patientLanguage = "English",
                                                    setToast,
                                                }: {
    patientId: string
    specialty: DoctorSpecialtyList
    patientName?: string
    patientCountry?: string
    patientLanguage?: string
    setToast: (options: ToastOptions) => void
}): Promise<boolean> {
    try {
        // Get user settings for doctors with this specialty
        const userSettingsResponse = await axios.post("/api/user-settings/get-by-specialty", {
            specialty,
            patientCountry,
            patientLanguage,
        })

        const userSettings = userSettingsResponse?.data?.userSettings || []
        console.log(`Found ${userSettings.length} users to notify for specialty ${specialty}`)

        if (userSettings.length === 0) {
            setToast({
                title: "No Recipients Found",
                description: `No doctors found with specialty ${specialty} who speak ${patientLanguage}.`,
                variant: "default",
            })
            return false
        }

        // Send notifications with patientId
        const notificationResponse = await axios.post<SpecialtyNotificationResponse>("/api/notifications", {
            specialty,
            subject: `New Case for ${specialty}`,
            message: `New case requires attention for your specialty: ${specialty}.`,
            patientCountry,
            patientLanguage,
            patientId,
            userSettings,
        })

        console.log(`Notification response:`, notificationResponse.data)
        const { totalCount: notifiedCount } = notificationResponse.data

        if (notifiedCount > 0) {
            setToast({
                title: "Notifications Sent",
                description: `Notifications sent to ${notifiedCount} doctors for ${specialty}`,
                variant: "success",
            })
            return true
        } else {
            setToast({
                title: "No Notifications Sent",
                description: `No doctors with specialty ${specialty} were notified.`,
                variant: "default",
            })
            return false
        }
    } catch (error) {
        console.error("Error sending specialty notification:", error)
        setToast({
            title: "Notification Failed",
            description: "Could not notify doctors with this specialty.",
            variant: "destructive",
        })
        return false
    }
}
