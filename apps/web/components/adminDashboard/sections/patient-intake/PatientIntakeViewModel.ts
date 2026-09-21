// apps/web/components/adminDashboard/sections/patient-intake/PatientIntakeViewModel.ts
"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/hooks/useToast"

interface User {
    _id: string
    firstName: string
    lastName: string
    email: string
}

interface PatientIntake {
    _id: string
    intakeMessage: string
    confirmationMessage: string
    updatedBy: User | string | null
    mode: "default" | "custom"
    createdAt: string
    updatedAt: string
}

export function usePatientIntake() {
    const { data: session } = useSession()
    const token = session?.user?.token
    const { setToast } = useToast()

    const [intakeMessage, setIntakeMessage] = useState("")
    const [confirmationMessage, setConfirmationMessage] = useState("")
    const [mode, setMode] = useState<"default" | "custom">("default")

    // Fetch previous patient intake settings
    const { data: patientIntakesData, refetch } = useQuery({
        queryKey: ["patient-intake-settings"],
        queryFn: async () => {
            const response = await fetch("/api/admin/GET/patient-intake", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error("Failed to fetch patient intake settings")
            const data = await response.json()
            console.log("Fetched patient intake data:", data)
            return data
        },
        enabled: !!token,
    })

    // Set initial values from the latest settings
    useEffect(() => {
        if (patientIntakesData?.patientIntakes?.length > 0) {
            const latestIntake = patientIntakesData.patientIntakes[0]
            setIntakeMessage(latestIntake.intakeMessage || "")
            setConfirmationMessage(latestIntake.confirmationMessage || "")
            setMode(latestIntake.mode || "default")
        }
    }, [patientIntakesData])

    const updatePatientIntake = useMutation({
        mutationFn: async () => {
            if (!intakeMessage) {
                throw new Error("Intake message is required")
            }

            console.log("Sending update with token:", token)

            const response = await fetch("/api/admin/POST/patient-intake", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    intakeMessage,
                    confirmationMessage: confirmationMessage || "",
                    mode,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error("Error response:", errorData)
                throw new Error(errorData.error || "Failed to update patient intake settings")
            }

            return response.json()
        },
        onSuccess: (data) => {
            console.log("Update successful:", data)
            setToast({
                title: "Success",
                description: "Patient intake settings updated successfully!",
                variant: "default",
            })
            refetch()
        },
        onError: (error: any) => {
            console.error("Update error:", error)
            setToast({
                title: "Error",
                description: error.message || "Failed to update patient intake settings.",
                variant: "destructive",
            })
        },
    })

    return {
        intakeMessage,
        setIntakeMessage,
        confirmationMessage,
        setConfirmationMessage,
        mode,
        setMode,
        updatePatientIntake: () => updatePatientIntake.mutate(),
        loading: updatePatientIntake.status === "pending",
        patientIntakes: patientIntakesData?.patientIntakes as PatientIntake[] | undefined,
    }
}

