import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod/v3"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import type { userProfileSchema } from "./schema"
import type { PasskeyCredentialDisplay, MedicalLicenseView } from '@fajr/shared/user'

export type UserProfileFormValues = z.infer<typeof userProfileSchema>

export type MedicalLicense = MedicalLicenseView

export type PasskeyCredential = PasskeyCredentialDisplay

export interface UserProfileViewModel {
    profile: UserProfileFormValues | null
    setProfile: (profile: UserProfileFormValues) => void
    setSpecialties: (specialties: string[] | ((prev: string[]) => string[])) => void
    setLanguages: (languages: string[] | ((prev: string[]) => string[])) => void
    handleSpecialtyChange: (index: number, value: DoctorSpecialtyList) => void
    handleRemoveSpecialty: (specialty: string) => void
    specialties: string[]
    languages: string[]
    isEditing: boolean
    isLoading: boolean
    isCopied: boolean
    methods: UseFormReturn<UserProfileFormValues>
    handleEdit: () => void
    handleCancelEdit: () => void
    handleSubmit: (data: UserProfileFormValues) => void
    copyToClipboard: () => void
    status: string
    // Medical License properties
    medicalLicenses: MedicalLicense[]
    isLoadingLicense: boolean
    licenseError: string | null
    isMedicalLicenseModalOpen: boolean
    handleViewMedicalLicense: () => void
    handleCloseMedicalLicenseModal: () => void
    // Medical License Upload properties
    isMedicalLicenseUploadModalOpen: boolean
    handleOpenMedicalLicenseUploadModal: () => void
    handleCloseMedicalLicenseUploadModal: () => void
    handleUploadSuccess: () => void
    // Passkey properties
    passkeys: PasskeyCredential[]
    isLoadingPasskeys: boolean
    passkeyError: string | null
    passkeySupported: boolean
    isAddingPasskey: boolean
    deletingPasskeyId: string | null
    handleAddPasskey: (email: string) => Promise<void>
    handleDeletePasskey: (id: string) => Promise<void>
    clearPasskeyError: () => void
}

