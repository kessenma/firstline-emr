// apps/web/app/new-patient/telegram/[id]/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DeprecatedTelegramPatientForm() {
    const router = useRouter()

    useEffect(() => {
        // Immediately redirect to the access denied page
        router.push("/telegram-patient/access-denied")
    }, [router])

    // Return null or a minimal loading indicator if needed
    // The user won't see this for more than a split second
    return null
}