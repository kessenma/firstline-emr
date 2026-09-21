// apps/web/components/user-profile/PasskeyManagement.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Fingerprint, Plus, Trash2, AlertCircle, Loader2, ScanFace, Key } from "lucide-react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import type { PasskeyCredential } from "./viewModel/useProfilePasskeys"

interface PasskeyManagementProps {
    passkeys: PasskeyCredential[]
    isLoading: boolean
    error: string | null
    isSupported: boolean
    isAdding: boolean
    deletingId: string | null
    userEmail: string
    onAddPasskey: (email: string) => Promise<void>
    onDeletePasskey: (id: string) => Promise<void>
    onClearError: () => void
}

function getDeviceIcon(deviceType: string | null | undefined, deviceName: string | null | undefined) {
    const name = (deviceName || deviceType || "").toLowerCase()

    // Face ID devices (iPhone X and later, iPad Pro with Face ID)
    if (name.includes("iphone") || name.includes("ipad") || name.includes("ios")) {
        return <ScanFace className="h-5 w-5 text-muted-foreground" />
    }
    // Touch ID / Fingerprint devices
    if (name.includes("mac") || name.includes("android")) {
        return <Fingerprint className="h-5 w-5 text-muted-foreground" />
    }
    // Windows Hello (could be face or fingerprint, use generic key)
    if (name.includes("windows")) {
        return <Key className="h-5 w-5 text-muted-foreground" />
    }
    // Default fallback
    return <Key className="h-5 w-5 text-muted-foreground" />
}

function formatDate(date: Date | string | null) {
    if (!date) return "Never"
    const d = new Date(date)
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export function PasskeyManagement({
    passkeys,
    isLoading,
    error,
    isSupported,
    isAdding,
    deletingId,
    userEmail,
    onAddPasskey,
    onDeletePasskey,
    onClearError,
}: PasskeyManagementProps) {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const handleAddClick = async () => {
        await onAddPasskey(userEmail)
    }

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmId(id)
    }

    const handleConfirmDelete = async () => {
        if (deleteConfirmId) {
            await onDeletePasskey(deleteConfirmId)
            setDeleteConfirmId(null)
        }
    }

    if (!isSupported) {
        return (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                        <p className="font-medium text-sm text-foreground">Passkeys Not Supported</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your browser or device doesn&apos;t support passkeys. Try using a modern browser like Chrome, Safari, or Edge.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                    <button onClick={onClearError} className="text-destructive hover:text-destructive/80">
                        &times;
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : passkeys.length === 0 ? (
                <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border text-center">
                    <Fingerprint className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">No Passkeys Registered</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Add a passkey to sign in faster with Face ID, Touch ID, or fingerprint.
                    </p>
                    <Button onClick={handleAddClick} disabled={isAdding} variant="default" size="sm">
                        {isAdding ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Passkey
                            </>
                        )}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {passkeys.map((passkey) => (
                        <div
                            key={passkey.id}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                        >
                            <div className="flex items-center gap-3">
                                {getDeviceIcon(passkey.credentialDeviceType, passkey.deviceName)}
                                <div>
                                    <p className="font-medium text-sm text-foreground">
                                        {passkey.deviceName || "Passkey"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Added {formatDate(passkey.createdAt)}
                                        {passkey.lastUsedAt && ` • Last used ${formatDate(passkey.lastUsedAt)}`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(passkey.id)}
                                disabled={deletingId === passkey.id}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                {deletingId === passkey.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    ))}

                    <Button
                        onClick={handleAddClick}
                        disabled={isAdding}
                        variant="outline"
                        size="sm"
                        className="w-full"
                    >
                        {isAdding ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Passkey
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title="Remove Passkey?"
                description="This passkey will be removed from your account. You can still sign in with your password or other passkeys."
                actionLabel="Remove"
                onAction={handleConfirmDelete}
            />
        </div>
    )
}
