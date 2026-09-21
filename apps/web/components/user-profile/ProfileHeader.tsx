// apps/web/components/user-profile/ProfileHeader.tsx
"use client"
import { useState } from "react"
import type React from "react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import { CopyButton } from "@/components/ui/CopyButton"
import type { UserProfileFormValues } from "./UserProfileViewModel"

interface ProfileHeaderProps {
    profile: UserProfileFormValues
    isAdmin: boolean
    isCopied: boolean
    isEditing?: boolean
    onPhotoUploadClick?: () => void
    copyToClipboard: () => void
}

export function ProfileHeader({
                                  profile,
                                  isAdmin,
                                  isCopied,
                                  isEditing,
                                  onPhotoUploadClick,
                                  copyToClipboard,
                              }: ProfileHeaderProps) {
    const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
    const avatarSrc = profile.image

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="relative">
                <Avatar
                    src={avatarSrc || undefined}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    initials={initials}
                    className="w-24 h-24 text-2xl"
                />
                {isEditing && onPhotoUploadClick && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md border border-background"
                        onClick={(e) => {
                            e.preventDefault();
                            onPhotoUploadClick();
                        }}
                    >
                        <Camera className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                    {profile.firstName} {profile.lastName}
                </h2>
                <div className="flex items-center justify-center mt-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate min-w-0">{profile.email}</p>
                    {profile.email && (
                        <CopyButton 
                            textToCopy={profile.email} 
                            label="Email" 
                            variant="ghost" 
                            size="icon" 
                            className="ml-1 h-6 w-6" 
                        />
                    )}
                </div>
                <div className="flex items-center justify-center mt-2 flex-wrap">
                    <p className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded break-all max-w-full">ID: {profile.id}</p>
                    {profile.id && (
                         <CopyButton 
                            textToCopy={profile.id} 
                            label="ID" 
                            variant="ghost" 
                            size="icon" 
                            className="ml-2" 
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
