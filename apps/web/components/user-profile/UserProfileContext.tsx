"use client"
import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from "react"

interface UserProfileContextType {
    lastUpdate: number
    triggerRefresh: () => void
    isEditMode: boolean
    setEditMode: (isEditing: boolean) => void
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
    // Initialize with current timestamp directly - no need for useEffect
    const [lastUpdate, setLastUpdate] = useState<number>(() => Date.now())
    const [isEditMode, setIsEditMode] = useState<boolean>(false)

    const triggerRefresh = useCallback(() => {
        setLastUpdate(Date.now())
    }, [])

    const setEditMode = useCallback((isEditing: boolean) => {
        setIsEditMode(isEditing)
    }, [])

    return (
        <UserProfileContext.Provider value={{ lastUpdate, triggerRefresh, isEditMode, setEditMode }}>
            {children}
        </UserProfileContext.Provider>
    )
}

export function useUserProfile() {
    const context = useContext(UserProfileContext)
    if (context === undefined) {
        throw new Error("useUserProfile must be used within a UserProfileProvider")
    }
    return context
}

