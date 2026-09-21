// apps/web/components/ui/Table/hooks/use-mobile.tsx
"use client"

import { useState, useEffect } from "react"

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Check if window is defined (to avoid SSR issues)
        if (typeof window === "undefined") return

        // Initial check
        setIsMobile(window.innerWidth < breakpoint)

        // Add resize listener
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [breakpoint])

    return isMobile
}
