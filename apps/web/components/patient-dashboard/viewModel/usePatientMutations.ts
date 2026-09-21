// @ts-nocheck
// apps/web/components/patient-dashboard/viewModel/usePatientMutations.ts
"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { updatePatient } from "@/lib/api"
import { useToast } from "@/components/hooks/useToast"
import type { Patient } from "@/db/schema/patients"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import type { PatientWithMessages, SpecialtyChangeParams, StatusChangeParams, LoadingStates } from "./types"
import { ROLE_LABELS, type CareTeamRole } from "@fajr/shared/care-team"

const getPatientId = (patient: any) => {
    return patient.id?.toString() || ""
}

export function usePatientMutations(
    session: any,
    setLoadingStates: Dispatch<SetStateAction<LoadingStates>>,
    sortedAndFilteredRows: PatientWithMessages[],
    triggerToast: (message: string) => void,
) {
    const queryClient = useQueryClient()
    const { setToast } = useToast()

    // Mutation for updating patient specialty
    const specialtyMutation = useMutation({
        mutationFn: async ({ patientId, specialty }: SpecialtyChangeParams) => {
            return axios.patch(`/api/patient/${patientId}/triage`, {
                specialty,
            })
        },
        onSuccess: () => {
            return queryClient.invalidateQueries({ queryKey: ["patients", "active"] })
        },
    })

    // Mutation for updating patient status
    const statusMutation = useMutation({
        mutationFn: async (params: StatusChangeParams) => {
            return updatePatient(params.id, params.data)
        },
        onSuccess: (_, variables) => {
            if (variables.data.status === "Post-Op / Discharged") {
                return Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["patients", "active"] }),
                    queryClient.invalidateQueries({ queryKey: ["patients", "archived"] }),
                ])
            } else {
                return queryClient.invalidateQueries({ queryKey: ["patients", "active"] })
            }
        },
    })

    // Simple specialty change function - just updates the specialty -- does NOT send notifications
    const handleSpecialtyChange = useCallback(
        async (patientId: string, specialty: DoctorSpecialtyList) => {
            setLoadingStates((prev) => ({ ...prev, [patientId]: "specialty" }))

            try {
                console.log(`Updating specialty for patient ${patientId} to ${specialty}`)
                const response = await specialtyMutation.mutateAsync({ patientId, specialty })

                if (response.status !== 200) {
                    setToast({
                        title: "Update Failed",
                        description: "Failed to update patient's specialty.",
                        variant: "error",
                    })
                }
            } catch (error) {
                console.error("Error updating specialty:", error)
                setToast({
                    title: "Error",
                    description: "An error occurred while updating the specialty.",
                    variant: "destructive",
                })
            } finally {
                setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
            }
        },
        [specialtyMutation, setLoadingStates, setToast],
    )

    const handleStatusChange = useCallback(
        async (value: Patient["status"], row: Patient, index?: number) => {
            const patientId = getPatientId(row)
            console.log("🔴 handleStatusChange called:", { value, patientId, index })

            setLoadingStates((prev) => ({ ...prev, [patientId]: "status" }))

            // Start with the existing values
            let newTriagedBy = row.triagedBy || {}

            if (value === "Pre-Op / Not Cleared") {
                newTriagedBy = {}
            } else if (value === "Pre-Op / Cleared") {
                if (session?.user?.accountType !== "Triage" && session?.user?.accountType !== "Evac") {
                    triggerToast("You do not have the correct permissions to triage patients")
                    setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
                    return
                }
                newTriagedBy = {
                    firstName: session?.user?.firstName,
                    lastName: session?.user?.lastName,
                    email: session?.user?.email,
                }
            } else if (value === "Peri-Op / In Surgery") {
                if (session?.user?.accountType === "Triage" || session?.user?.accountType === "Evac") {
                    triggerToast("You must be a doctor to take this patient.")
                    setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
                    return
                }
                // Use take-case endpoint which handles status + care team + careTeam sync
                try {
                    await axios.post(`/api/patient/${patientId}/take-case`, { role: "surgeon" })
                    await queryClient.invalidateQueries({ queryKey: ["patients", "active"] })
                } catch (error) {
                    console.error(error)
                } finally {
                    setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
                }
                return
            }

            try {
                await statusMutation.mutateAsync({
                    id: patientId,
                    data: { status: value, triagedBy: newTriagedBy },
                })
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
            }
        },
        [session, statusMutation, triggerToast, setLoadingStates, queryClient],
    )

    const handleTakeCase = useCallback(
        async (index: number, role: CareTeamRole = "surgeon") => {
            const patient = sortedAndFilteredRows[index]
            const patientId = getPatientId(patient)

            try {
                setLoadingStates((prev) => ({ ...prev, [patientId]: true }))

                // Call the take-case endpoint with role
                const response = await axios.post(`/api/patient/${patientId}/take-case`, { role })

                if (response.status === 200) {
                    // Invalidate queries to refresh data
                    const invalidations = [
                        queryClient.invalidateQueries({ queryKey: ["patients", "active"] })
                    ]

                    // If a thread was assigned, also invalidate the user messages query
                    if (response.data.threadAssigned) {
                        invalidations.push(queryClient.invalidateQueries({ queryKey: ["userMessages"] }))
                    }

                    await Promise.all(invalidations)

                    setToast({
                        title: "Joined Care Team",
                        description: `You joined as ${ROLE_LABELS[role]}.`,
                        variant: "success",
                    })
                }
            } catch (error) {
                console.error("Error joining care team:", error)
                setToast({
                    title: "Error",
                    description: "Failed to join care team. Please try again.",
                    variant: "destructive",
                })
            } finally {
                setLoadingStates((prev) => ({ ...prev, [patientId]: false }))
            }
        },
        [queryClient, sortedAndFilteredRows, setToast, setLoadingStates],
    )

    const handleArchive = useCallback(
        async (index: number) => {
            const patient = sortedAndFilteredRows[index]

            try {
                await statusMutation.mutateAsync({
                    id: getPatientId(patient),
                    data: { status: "Post-Op / Discharged" },
                })
            } catch (error) {
                console.log(error)
            }
        },
        [statusMutation, sortedAndFilteredRows],
    )

    const handleDoctorNoteSave = useCallback(
        async (patientId: string, noteContent: string, publish: boolean) => {
            try {
                const response = await axios.patch(`/api/patient/${patientId}/doctor-note`, {
                    note: noteContent,
                    isDraft: !publish, // if not publishing, then it's a draft
                })
                if (response.status === 200) {
                    setToast({
                        title: publish ? "Note Published" : "Draft Saved",
                        description: publish ? "Doctor note published successfully." : "Doctor note saved as draft successfully.",
                        variant: "success",
                    })
                } else {
                    setToast({
                        title: "Error",
                        description: "Failed to update doctor note.",
                        variant: "error",
                    })
                }
            } catch (error) {
                console.error("Error saving doctor note:", error)
                setToast({
                    title: "Error",
                    description: "An error occurred while saving the doctor note.",
                    variant: "destructive",
                })
            }
        },
        [setToast],
    )

    return {
        handleSpecialtyChange, // Only export the simple specialty change function
        handleStatusChange,
        handleTakeCase,
        handleArchive,
        handleDoctorNoteSave,
    }
}
