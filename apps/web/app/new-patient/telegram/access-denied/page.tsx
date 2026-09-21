// apps/web/app/new-patient/telegram/access-denied/page.tsx
"use client"
import AccessDeniedContent from "@/components/telegram-patient/container/access-denied"
import { BackgroundGradientAnimation } from "@/components/ui/animated-gradient-background"

export default function AccessDeniedPage() {
    return (
        <BackgroundGradientAnimation theme="dark" fullScreen={true}>
            <div className="absolute z-10 inset-0 flex items-center justify-center text-foreground px-4">
                <AccessDeniedContent />
            </div>
        </BackgroundGradientAnimation>
    )
}

