"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUserSettings } from "@/components/user-profile/settings/UserSettingsViewModel"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { X, History, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function LastPageRedirect() {
    const router = useRouter()
    const pathname = usePathname()
    const { data: session } = useSession()
    const { settings, updateSettings, isLoading } = useUserSettings()
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        // Don't do anything if settings are still loading
        if (isLoading) return

        // Initialize session ID if not already set
        if (!sessionStorage.getItem("sessionId")) {
            sessionStorage.setItem("sessionId", Math.random().toString(36).substring(2, 15))
        }

        // Check if we should show the banner
        const shouldShowBanner = () => {
            if (!session?.user || !settings?.lastView) return false
            if (settings.lastView === "/" || settings.lastView === pathname) return false
            if (pathname.includes("/auth/")) return false

            // Check if this is a different session or device
            const currentSessionId = sessionStorage.getItem("sessionId")
            const savedSessionId = settings.lastViewSessionId

            // If we're in the same session that saved the page, don't show the banner
            if (currentSessionId && savedSessionId && currentSessionId === savedSessionId) {
                return false
            }

            return true
        }

        setShowBanner(shouldShowBanner())
    }, [session, settings, pathname, isLoading])

    const goToLastPage = () => {
        if (settings?.lastView) {
            router.push(settings.lastView)
        }
        dismissBanner()
    }

    const dismissBanner = () => {
        setShowBanner(false)
        // Reset the lastView to prevent future redirects to the same page
        if (settings) {
            updateSettings({
                settings: {
                    ...settings,
                    lastView: "/",
                },
            })
        }
    }

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    className="fixed bottom-4 right-4 bg-card shadow-sm rounded-lg p-4 max-w-md z-50 border border-border flex flex-col gap-3"
                    initial={{ opacity: 0, y: 50, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, x: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                    }}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            <h3 className="font-medium text-foreground">Continue where you left off?</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={dismissBanner} className="h-6 w-6 -mt-1 -mr-1">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">
                        You were previously viewing a different page. Would you like to continue where you left off?
                    </p>
                    <div className="flex gap-2 justify-end mt-1">
                        <Button variant="outline" size="sm" onClick={dismissBanner}>
                            No, thanks
                        </Button>
                        <Button
                            size="sm"
                            onClick={goToLastPage}
                            className="flex items-center gap-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Continue
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
