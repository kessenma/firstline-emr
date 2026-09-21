// apps/web/components/nav/save-button.tsx
'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserSettings } from '@/components/user-profile/settings/UserSettingsViewModel'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/hooks/useToast'

export const SaveButton: React.FC = () => {
    const [iconKey, setIconKey] = useState(0)
    const { settings, updateSettings, isLoading } = useUserSettings()
    const pathname = usePathname()
    const { setToast } = useToast()

    // Don't render the button if settings are loading
    if (isLoading || !settings) {
        return null
    }

    const handleClick = async () => {
        // Save the current page path with a timestamp and session identifier
        updateSettings({
            settings: {
                ...settings,
                lastView: pathname,
                lastViewSavedAt: new Date().toISOString(),
                lastViewSessionId: sessionStorage.getItem('sessionId') || generateSessionId()
            }
        })

        // Ensure we have a session ID stored
        if (!sessionStorage.getItem('sessionId')) {
            const sessionId = generateSessionId()
            sessionStorage.setItem('sessionId', sessionId)
        }

        // Show a toast notification
        setToast({
            title: "Page saved",
            description: "This page will be available on your other devices",
            variant: "success",
        })

        // Animate the icon
        setIconKey(prev => prev + 1)
    }

    // Generate a random session ID
    const generateSessionId = () => {
        return Math.random().toString(36).substring(2, 15)
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                'flex items-center justify-center p-2 rounded-full border-2 bg-card border-border text-foreground',
                'hover:bg-primary hover:text-primary-foreground transition-colors duration-300',
                'relative overflow-hidden'
            )}
            aria-label="Save current page"
            title="Save current page for access on other devices"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={iconKey}
                    initial={{ x: 100, opacity: 0 }} // Start from right side
                    animate={{ x: 0, opacity: 1 }} // Animate to center
                    exit={{ x: 100, opacity: 0 }} // Exit to right side
                    transition={{
                        // Entry animation with spring effect and delay
                        x: {
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: 0.3 // Slight delay before springing back
                        },
                        opacity: { duration: 0.3, delay: 0.3 }
                    }}
                >
                    <Save size={20} className="rotate-90 transform" />
                </motion.div>
            </AnimatePresence>
        </button>
    )
}
