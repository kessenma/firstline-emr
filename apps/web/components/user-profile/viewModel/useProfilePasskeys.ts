// apps/web/components/user-profile/viewModel/useProfilePasskeys.ts
"use client"

import { useState, useCallback, useEffect } from "react"
import { usePasskey } from "@/hooks/usePasskey"
import type { PasskeyCredentialDisplay } from '@fajr/shared/user'

export type PasskeyCredential = PasskeyCredentialDisplay

export function useProfilePasskeys(userId: string | undefined) {
    const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
    const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false)
    const [passkeyError, setPasskeyError] = useState<string | null>(null)
    const [isAddingPasskey, setIsAddingPasskey] = useState(false)
    const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null)

    const { isSupported: passkeySupported, register, isLoading: isRegistering } = usePasskey()

    // Fetch user's passkeys
    const fetchPasskeys = useCallback(async () => {
        if (!userId) return

        setIsLoadingPasskeys(true)
        setPasskeyError(null)

        try {
            const response = await fetch("/api/auth/webauthn/passkeys")

            if (!response.ok) {
                throw new Error("Failed to fetch passkeys")
            }

            const data = await response.json()
            setPasskeys(data.passkeys || [])
        } catch (error) {
            console.error("Error fetching passkeys:", error)
            setPasskeyError(error instanceof Error ? error.message : "Failed to load passkeys")
        } finally {
            setIsLoadingPasskeys(false)
        }
    }, [userId])

    // Fetch passkeys on mount
    useEffect(() => {
        fetchPasskeys()
    }, [fetchPasskeys])

    // Add a new passkey
    const handleAddPasskey = useCallback(async (email: string) => {
        if (!userId || !passkeySupported) return

        setIsAddingPasskey(true)
        setPasskeyError(null)

        try {
            await register(email, userId, `${navigator.userAgent.includes("Mac") ? "Mac" : navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("iPhone") ? "iPhone" : navigator.userAgent.includes("Android") ? "Android" : "Device"}`)

            // Refresh the passkey list
            await fetchPasskeys()
        } catch (error) {
            console.error("Error adding passkey:", error)
            // Don't show error for user cancellation
            if (error instanceof Error && !error.message.includes("cancelled")) {
                setPasskeyError(error.message || "Failed to add passkey")
            }
        } finally {
            setIsAddingPasskey(false)
        }
    }, [userId, passkeySupported, register, fetchPasskeys])

    // Delete a passkey
    const handleDeletePasskey = useCallback(async (passkeyId: string) => {
        setDeletingPasskeyId(passkeyId)
        setPasskeyError(null)

        try {
            const response = await fetch(`/api/auth/webauthn/passkeys/${passkeyId}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                throw new Error("Failed to delete passkey")
            }

            // Remove from local state
            setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId))
        } catch (error) {
            console.error("Error deleting passkey:", error)
            setPasskeyError(error instanceof Error ? error.message : "Failed to delete passkey")
        } finally {
            setDeletingPasskeyId(null)
        }
    }, [])

    const clearPasskeyError = useCallback(() => {
        setPasskeyError(null)
    }, [])

    return {
        passkeys,
        isLoadingPasskeys,
        passkeyError,
        passkeySupported,
        isAddingPasskey: isAddingPasskey || isRegistering,
        deletingPasskeyId,
        handleAddPasskey,
        handleDeletePasskey,
        clearPasskeyError,
        refreshPasskeys: fetchPasskeys,
    }
}
