// apps/web/components/adminDashboard/sections/userProfileAdminViewModel.ts
"use client"

// apps/web/components/adminDashboard/sections/userProfileAdminViewModel.ts

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import {
    type UserProfileFormValues,
    userProfileSchema,
    type UserProfileViewModel,
} from "@/components/user-profile/UserProfileViewModel"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/hooks/useToast"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import { useProfileMedicalLicense } from "@/components/user-profile/viewModel/useProfileMedicalLicense"

export function useUserProfileAdminViewModel(userId?: string): UserProfileViewModel {
    const { data: session, status: sessionStatus } = useSession()
    const { setToast } = useToast()
    const methods = useForm<UserProfileFormValues>({
        resolver: zodResolver(userProfileSchema),
    })
    const [profile, setProfile] = useState<UserProfileFormValues | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [specialties, setSpecialties] = useState<string[]>([])
    const [languages, setLanguages] = useState<string[]>([])

    useEffect(() => {
        if (profile?.languages) {
            setLanguages(profile.languages)
        }
    }, [profile?.languages])

    const fetchProfile = useCallback(async () => {
        if (sessionStatus === "loading") {
             return;
        }

        if (userId && session?.user) {
            setIsLoading(true)
            setStatus("loading")
            try {
                // Determine which API endpoint to use based on whether it's an admin view or not
                const endpoint = `/api/user/${userId}`

                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                }

                // Add authorization token if available
                if (session.user.token) {
                    headers["Authorization"] = `Bearer ${session.user.token}`
                }

                const res = await fetch(endpoint, { headers })

                if (!res.ok) {
                    throw new Error("Failed to fetch user")
                }
                const data = await res.json()
                setProfile(data)
                setSpecialties(data.doctorSpecialty || [])
                setLanguages(data.languages || [])
                methods.reset(data)
                setStatus("success")
            } catch (error) {
                console.error("Error fetching user:", error)
                setStatus("error")
            } finally {
                setIsLoading(false)
            }
        } else {
            setStatus("error")
        }
    }, [userId, session?.user, methods, sessionStatus])

    // Add useEffect to call fetchProfile when component mounts or userId/session changes
    useEffect(() => {
        fetchProfile()
    }, [fetchProfile, userId, session?.user?.token])

    const handleEdit = useCallback(() => setIsEditing(true), [])

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false)
        methods.reset(profile || undefined)
    }, [methods, profile])

    const handleSpecialtyChange = useCallback((index: number, value: DoctorSpecialtyList) => {
        setSpecialties((prevSpecialties) => {
            const updatedSpecialties = [...prevSpecialties]
            updatedSpecialties[index] = value
            return updatedSpecialties
        })
    }, [])

    const handleSubmit = useCallback(
        async (data: UserProfileFormValues) => {
            setIsLoading(true)
            console.log("Admin submitting languages:", data.languages)
            try {
                // Determine which API endpoint to use based on whether it's an admin view or not
                const endpoint = `/api/user/${data.id}`

                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                }

                // Add authorization token if available
                if (session?.user?.token) {
                    headers["Authorization"] = `Bearer ${session.user.token}`
                }

                const response = await fetch(endpoint, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({
                        ...data,
                        doctorSpecialty: specialties,
                        languages: data.languages || [], // Get languages from form data instead of state
                    }),
                })

                if (response.ok) {
                    const updatedProfile = await response.json()
                    console.log("Updated user data:", updatedProfile)

                    setProfile(updatedProfile)
                    setSpecialties(updatedProfile.doctorSpecialty || [])
                    setLanguages(updatedProfile.languages || [])
                    methods.reset(updatedProfile)

                    setToast({
                        title: "Success",
                        description: "User updated successfully.",
                        variant: "default",
                    })
                    setIsEditing(false)
                } else {
                    const errorData = await response.json()
                    setToast({
                        title: "Error",
                        description: errorData.message || "Failed to update user.",
                        variant: "destructive",
                    })
                }
            } catch (error: any) {
                setToast({
                    title: "Error",
                    description: error.message || "Failed to update user.",
                    variant: "destructive",
                })
            }
            setIsLoading(false)
        },
        [session?.user, setToast, methods, specialties],
    )

    const copyToClipboard = useCallback(() => {
        if (profile) {
            navigator.clipboard.writeText(profile.id).then(() => {
                setIsCopied(true)
                setTimeout(() => setIsCopied(false), 2000)
            })
        }
    }, [profile])



    const handleRemoveSpecialty = useCallback(
        async (specialty: string) => {
            if (!profile || !specialty) return

            setIsLoading(true)

            try {
                // Determine which API endpoint to use based on whether it's an admin view or not
                const endpoint = `/api/user/${profile.id}`

                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                }

                // Add authorization token if available
                if (session?.user?.token) {
                    headers["Authorization"] = `Bearer ${session.user.token}`
                }

                const response = await fetch(endpoint, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({
                        removeSpecialty: specialty,
                    }),
                })

                if (response.ok) {
                    const updatedProfile = await response.json()
                    setProfile(updatedProfile)
                    setSpecialties(updatedProfile.doctorSpecialty || []) // Update specialties
                } else {
                    console.error("Failed to remove specialty")
                }
            } catch (error) {
                console.error("Error removing specialty:", error)
            } finally {
                setIsLoading(false)
            }
        },
        [profile, session?.user],
    )

    // Medical license functionality
    const {
        medicalLicenses,
        isLoadingLicense,
        licenseError,
        isMedicalLicenseModalOpen,
        handleViewMedicalLicense,
        handleCloseMedicalLicenseModal,
        isMedicalLicenseUploadModalOpen,
        handleOpenMedicalLicenseUploadModal,
        handleCloseMedicalLicenseUploadModal,
        handleUploadSuccess,
    } = useProfileMedicalLicense(profile, session)

    return {
        setProfile,
        profile,
        specialties,
        setSpecialties,
        languages,
        setLanguages,
        handleSpecialtyChange,
        handleRemoveSpecialty,
        isEditing,
        isLoading,
        isCopied,
        methods,
        handleEdit,
        handleCancelEdit,
        handleSubmit,
        copyToClipboard,
        status,
        // Medical License properties
        medicalLicenses,
        isLoadingLicense,
        licenseError,
        isMedicalLicenseModalOpen,
        handleViewMedicalLicense,
        handleCloseMedicalLicenseModal,
        isMedicalLicenseUploadModalOpen,
        handleOpenMedicalLicenseUploadModal,
        handleCloseMedicalLicenseUploadModal,
        handleUploadSuccess,
        // Passkey properties (not used in admin view, but required by interface)
        passkeys: [],
        isLoadingPasskeys: false,
        passkeyError: null,
        passkeySupported: false,
        isAddingPasskey: false,
        deletingPasskeyId: null,
        handleAddPasskey: async () => {},
        handleDeletePasskey: async () => {},
        clearPasskeyError: () => {},
    }
}
