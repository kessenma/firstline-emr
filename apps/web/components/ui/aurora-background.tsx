// apps/web/components/ui/aurora-background.tsx
"use client"

import type React from "react"
import { type ReactNode, useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface AuroraBackgroundProps extends Omit<React.HTMLProps<HTMLDivElement>, "style"> {
    children: ReactNode
    showRadialGradient?: boolean
    backgroundColor?: string
    gradientFrom?: string
    gradientTo?: string
    auroraStyle?: "primary" | "secondary" | "accent" | "roles" | "orange" | "green" | "none" | "grey"
    performanceMode?: "high" | "medium" | "low"
}

export const AuroraBackground = ({
                                     className,
                                     children,
                                     showRadialGradient = true,
                                     backgroundColor,
                                     gradientFrom,
                                     gradientTo,
                                     auroraStyle = "none",
                                     performanceMode = "medium",
                                     ...props
                                 }: AuroraBackgroundProps) => {
    const [isLowEndDevice, setIsLowEndDevice] = useState(false)

    // Detect low-end devices on mount
    useEffect(() => {
        // Check if device is low-end based on hardware concurrency
        const isLowEnd =
            navigator.hardwareConcurrency <= 4 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

        setIsLowEndDevice(isLowEnd && performanceMode !== "high")
    }, [performanceMode])

    // Get appropriate blur value based on performance mode and device capability
    const getBlurValue = () => {
        if (isLowEndDevice || performanceMode === "low") return "blur-[5px]"
        if (performanceMode === "medium") return "blur-sm"
        return "blur-[10px]"
    }

    // Get animation speed based on performance mode
    const getAnimationClass = () => {
        if (isLowEndDevice || performanceMode === "low") return "animate-aurora-slow"
        if (performanceMode === "medium") return "animate-aurora-medium"
        return "animate-aurora"
    }

    const getStyleLayers = (style: string) => {
        switch (style) {
            case "primary":
                return ["bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary))] to-[hsl(var(--primary))]"]
            case "secondary":
                return ["bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--secondary))] to-[hsl(var(--secondary))]"]
            case "accent":
                return ["bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(var(--accent))] to-[hsl(var(--accent))]"]
            case "roles":
                // Explicit role hues so the login page shows all user colors
                return [
                    "bg-gradient-to-r from-[hsl(205_55%_56%)] via-[hsl(205_55%_56%)] to-[hsl(205_55%_56%)]", // doctor
                    "bg-gradient-to-r from-[hsl(172_45%_41%)] via-[hsl(172_45%_41%)] to-[hsl(172_45%_41%)]", // evac
                    "bg-gradient-to-r from-[hsl(222_30%_28%)] via-[hsl(222_30%_28%)] to-[hsl(222_30%_28%)]", // triage
                ]
            case "orange":
                return ["bg-gradient-to-r from-orange-300 via-orange-200 to-orange-400"]
            case "green":
                return ["bg-gradient-to-r from-green-300 via-green-200 to-green-400"]
            case "grey":
                return ["bg-gradient-to-r from-gray-300 via-gray-200 to-gray-400"]
            default:
                return [""]
        }
    }

    const backgroundStyle =
        backgroundColor || (gradientFrom && gradientTo) ? `bg-linear-to-b from-${gradientFrom} to-${gradientTo}` : ""

    // Skip rendering aurora effect completely for very low-end devices or when not needed
    const shouldRenderAurora = auroraStyle !== "none" && !(isLowEndDevice && performanceMode === "low")

    return (
        <main className={cn("relative min-h-screen overflow-hidden", className)}>
            <div
                className={cn(
                    "relative flex flex-col h-full items-stretch justify-start text-foreground transition-bg",
                    backgroundStyle,
                    className,
                )}
                {...props}
            >
                {shouldRenderAurora && (
                    <div className="absolute inset-0 overflow-hidden">
                        {getStyleLayers(auroraStyle).map((layer, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "absolute inset-0 bg-[length:200%_200%]",
                                    layer,
                                    getAnimationClass(),
                                    getBlurValue(),
                                    showRadialGradient && !isLowEndDevice
                                        ? "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]"
                                        : showRadialGradient
                                            ? "[mask-image:radial-gradient(ellipse_at_100%_0%,black_20%,transparent_60%)]"
                                            : "",
                                )}
                                style={{ opacity: idx === 0 ? 0.45 : idx === 1 ? 0.35 : 0.25 }}
                            ></div>
                        ))}
                    </div>
                )}
                <ScrollArea className="relative w-full h-full">{children}</ScrollArea>
            </div>
        </main>
    )
}
