// apps/web/components/user-profile/viewModel/useProfileMedicalLicense.ts
"use client"

import { useState, useCallback } from "react"
import type { Session } from "next-auth"
import type { MedicalLicense } from "./types"

export function useProfileMedicalLicense(
    profile: any,
    session: Session | null,
) {
    const [medicalLicenses, setMedicalLicenses] = useState<MedicalLicense[]>([])
    const [isLoadingLicense, setIsLoadingLicense] = useState(false)
    const [licenseError, setLicenseError] = useState<string | null>(null)
    const [isMedicalLicenseModalOpen, setIsMedicalLicenseModalOpen] = useState(false)
    const [isMedicalLicenseUploadModalOpen, setIsMedicalLicenseUploadModalOpen] = useState(false)

    const handleViewMedicalLicense = useCallback(async () => {
        if (!profile?.id) return

        setIsLoadingLicense(true)
        setLicenseError(null)
        setIsMedicalLicenseModalOpen(true)

        try {
            const token = (session?.user as any)?.token
            const response = await fetch(`/api/admin/get-medical-license?userId=${profile.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch medical license: ${response.status}`)
            }

            const data = await response.json()

            const licenses: MedicalLicense[] = []

            // New format: { licenses: [{ specialty, signedUrl, uploadedAt, mimeType }] }
            if (Array.isArray(data.licenses) && data.licenses.length > 0) {
                data.licenses.forEach((license: any) => {
                    licenses.push({
                        specialty: license.specialty || 'General',
                        signedUrl: license.signedUrl,
                        uploadedAt: license.uploadedAt ? new Date(license.uploadedAt) : undefined,
                        mimeType: license.mimeType,
                    })
                })
            }

            // Backward compatibility: single URL or legacy array
            if (!licenses.length && data.medicalLicenseUrl) {
                licenses.push({
                    specialty: 'General',
                    signedUrl: data.medicalLicenseUrl,
                    uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : undefined,
                    mimeType: data.mimeType,
                })
            }

            if (!licenses.length && Array.isArray(data.medicalLicenses)) {
                data.medicalLicenses.forEach((license: any) => {
                    licenses.push({
                        specialty: license.specialty || 'General',
                        signedUrl: license.signedUrl,
                        uploadedAt: license.uploadedAt ? new Date(license.uploadedAt) : undefined,
                        mimeType: license.mimeType,
                    })
                })
            }

            setMedicalLicenses(licenses)
        } catch (error) {
            console.error('Error fetching medical license:', error)
            setLicenseError(error instanceof Error ? error.message : 'Failed to load medical license')
        } finally {
            setIsLoadingLicense(false)
        }
    }, [profile?.id, session])

    const handleCloseMedicalLicenseModal = useCallback(() => {
        setIsMedicalLicenseModalOpen(false)
        setMedicalLicenses([])
        setLicenseError(null)
    }, [])

    const handleOpenMedicalLicenseUploadModal = useCallback(() => {
        setIsMedicalLicenseUploadModalOpen(true)
    }, [])

    const handleCloseMedicalLicenseUploadModal = useCallback(() => {
        setIsMedicalLicenseUploadModalOpen(false)
    }, [])

    const handleUploadSuccess = useCallback(() => {
        setIsMedicalLicenseUploadModalOpen(false)
        // Optionally refresh the license list
        if (profile?.id) {
            handleViewMedicalLicense()
        }
    }, [profile?.id, handleViewMedicalLicense])

    return {
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
    }
}
