// apps/web/components/user-profile/UserProfileViewModel.ts
"use client"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { userProfileSchema } from "./viewModel/schema"
import { useProfileState } from "./viewModel/useProfileState"
import { useProfileActions } from "./viewModel/useProfileActions"
import { useProfileSpecialties } from "./viewModel/useProfileSpecialties"
import { useProfileMedicalLicense } from "./viewModel/useProfileMedicalLicense"
import { useProfilePasskeys } from "./viewModel/useProfilePasskeys"
import { useUserProfile } from "./UserProfileContext"
import type { UserProfileViewModel, UserProfileFormValues } from "./viewModel/types"

export type { UserProfileViewModel, UserProfileFormValues }
export { userProfileSchema }

export function useUserProfileViewModel(): UserProfileViewModel {
    const { data: session, status, update } = useSession()
    const { triggerRefresh, setEditMode } = useUserProfile()

    // Initialize form with schema validation
    const methods = useForm<UserProfileFormValues>({
        resolver: zodResolver(userProfileSchema),
    })

    // State management hooks
    const {
        profile,
        setProfile,
        isEditing,
        setIsEditing: originalSetIsEditing,
        isLoading,
        setIsLoading,
        isCopied,
        setIsCopied,
        specialties,
        setSpecialties,
        languages,
        setLanguages,
        countries,
        setCountries,
    } = useProfileState(session, status, methods)

    // Wrap the original setIsEditing to also update the context
    const setIsEditing = (editing: boolean) => {
        originalSetIsEditing(editing)
        setEditMode(editing)
    }

    // Specialty management
    const { handleSpecialtyChange, handleRemoveSpecialty } = useProfileSpecialties(
        specialties,
        setSpecialties,
        profile,
        setIsLoading,
        setProfile,
        session,
        update,
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

    // Passkey management
    const {
        passkeys,
        isLoadingPasskeys,
        passkeyError,
        passkeySupported,
        isAddingPasskey,
        deletingPasskeyId,
        handleAddPasskey,
        handleDeletePasskey,
        clearPasskeyError,
    } = useProfilePasskeys(profile?.id)

    // Get the original profile actions
    const originalActions = useProfileActions(
        setIsEditing,
        methods,
        profile,
        specialties,
        languages,
        countries,
        setIsLoading,
        setProfile,
        setSpecialties,
        setLanguages,
        setCountries,
        session,
        update,
        setIsCopied,
    )

    // Wrap the original handleSubmit to trigger a refresh after submission
    const handleSubmit = async (data: UserProfileFormValues) => {
        await originalActions.handleSubmit(data)
        triggerRefresh()
    }

    // Wrap the original handleEdit to update the edit mode in context
    const handleEdit = () => {
        originalActions.handleEdit()
        setEditMode(true)
    }

    // Wrap the original handleCancelEdit to update the edit mode in context
    const handleCancelEdit = () => {
        originalActions.handleCancelEdit()
        setEditMode(false)
    }

    return {
        profile,
        setProfile,
        specialties,
        setSpecialties,
        languages,
        setLanguages,
        handleRemoveSpecialty,
        handleSpecialtyChange,
        isEditing,
        isLoading,
        isCopied,
        methods,
        handleEdit,
        handleCancelEdit,
        handleSubmit,
        copyToClipboard: originalActions.copyToClipboard,
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
        // Passkey properties
        passkeys,
        isLoadingPasskeys,
        passkeyError,
        passkeySupported,
        isAddingPasskey,
        deletingPasskeyId,
        handleAddPasskey,
        handleDeletePasskey,
        clearPasskeyError,
    }
}

