// apps/web/app/telegram-patient/access-denied/page.tsx
"use client"
import AccessDeniedContent from "@/components/telegram-patient/container/access-denied"
import { BackgroundGradientAnimation } from "@/components/ui/animated-gradient-background"
import {Separator} from "@radix-ui/react-select";

export default function AccessDeniedPage() {
    return (
        <BackgroundGradientAnimation theme="dark" fullScreen={true}>
            <div className="absolute z-50 inset-0 flex items-center justify-center text-foreground px-4">
                <AccessDeniedContent />
            </div>
        </BackgroundGradientAnimation>
    )
}



