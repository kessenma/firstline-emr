// apps/web/components/user-profile/viewModel/useProfileSpecialties.ts
"use client"

import { useCallback } from "react"
import type { Session } from "next-auth"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import type { UserProfileFormValues } from "./types"

export function useProfileSpecialties(
    specialties: string[],
    setSpecialties: (specialties: string[] | ((prev: string[]) => string[])) => void,
    profile: UserProfileFormValues | null,
    setIsLoading: (value: boolean) => void,
    setProfile: (profile: UserProfileFormValues) => void,
    session: Session | null,
    update: (data?: any) => Promise<Session | null>,
) {
    const handleSpecialtyChange = useCallback(
        (index: number, value: DoctorSpecialtyList) => {
            setSpecialties((prevSpecialties) => {
                const updatedSpecialties = [...prevSpecialties]
                updatedSpecialties[index] = value
                return updatedSpecialties
            })
        },
        [setSpecialties],
    )

    const handleRemoveSpecialty = useCallback(
        async (specialty: string) => {
            if (!profile || !specialty) return

            setIsLoading(true)

            try {
                const response = await fetch(`/api/user/${profile.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ removeSpecialty: specialty }), // Send specialty to remove
                })

                if (response.ok) {
                    const updatedProfile = await response.json()
                    setProfile(updatedProfile)
                    setSpecialties(updatedProfile.doctorSpecialty || [])

                    await update({
                        ...session,
                        user: {
                            ...session?.user,
                            doctorSpecialty: updatedProfile.doctorSpecialty, // Update session with new specialties
                        },
                    })
                } else {
                    console.error("Failed to remove specialty")
                }
            } catch (error) {
                console.error("Error removing specialty:", error)
            } finally {
                setIsLoading(false)
            }
        },
        [profile, setIsLoading, setProfile, setSpecialties, session, update],
    )

    return {
        handleSpecialtyChange,
        handleRemoveSpecialty,
    }
}

