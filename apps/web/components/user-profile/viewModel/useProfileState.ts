// apps/web/components/user-profile/viewModel/useProfileSpecialties.ts
"use client"

import { useState, useEffect } from "react"
import type { Session } from "next-auth"
import type { UseFormReturn } from "react-hook-form"
import type { UserProfileFormValues } from "./types"

export function useProfileState(
    session: Session | null,
    status: string,
    methods: UseFormReturn<UserProfileFormValues>,
) {
    const [profile, setProfile] = useState<UserProfileFormValues | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [specialties, setSpecialties] = useState<string[]>([])
    const [languages, setLanguages] = useState<string[]>([])
    const [countries, setCountries] = useState<string[]>([])

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            setIsLoading(true)
            fetch(`/api/user/${session.user.id}`)
                .then((res) => res.json())
                .then((data) => {
                    setProfile(data)
                    setSpecialties(data.doctorSpecialty || [])
                    setLanguages(data.languages || [])
                    setCountries(data.countries || [])
                    methods.reset(data)
                    setIsLoading(false)
                })
                .catch((error) => {
                    console.error("Error fetching profile:", error)
                    setIsLoading(false)
                })
        }
    }, [status, session?.user, methods])

    return {
        profile,
        setProfile,
        isEditing,
        setIsEditing,
        isLoading,
        setIsLoading,
        isCopied,
        setIsCopied,
        specialties,
        setSpecialties: setSpecialties as (specialties: string[] | ((prev: string[]) => string[])) => void,
        languages,
        setLanguages: setLanguages as (languages: string[] | ((prev: string[]) => string[])) => void,
        countries,
        setCountries,
    }
}

