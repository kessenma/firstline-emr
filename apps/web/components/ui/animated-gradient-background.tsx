// apps/web/components/ui/animated-gradient-background.tsx
"use client"
import { cn } from "@/lib/utils"
import type React from "react"

import { useEffect, useState } from "react"

export const BackgroundGradientAnimation = ({
                                                gradientBackgroundStart = "rgb(108, 0, 162)",
                                                gradientBackgroundEnd = "rgb(0, 17, 82)",
                                                firstColor = "18, 113, 255",
                                                secondColor = "221, 74, 255",
                                                thirdColor = "100, 220, 255",
                                                fourthColor = "200, 50, 50",
                                                fifthColor = "180, 180, 50",
                                                pointerColor = "140, 100, 255", // Added back for the static gradient
                                                size = "80%",
                                                blendingValue = "hard-light",
                                                children,
                                                className,
                                                containerClassName,
                                                theme = "default",
                                                fullScreen = true,
                                                logoPosition = { top: "-25%", left: "-15%" }, // Control the position of the static gradient
                                            }: {
    gradientBackgroundStart?: string
    gradientBackgroundEnd?: string
    firstColor?: string
    secondColor?: string
    thirdColor?: string
    fourthColor?: string
    fifthColor?: string
    pointerColor?: string
    size?: string
    blendingValue?: string
    children?: React.ReactNode
    className?: string
    containerClassName?: string
    theme?: "default" | "orange" | "blue" | "green" | "purple" | "dark"
    fullScreen?: boolean
    logoPosition?: { top: string; left: string }
}) => {
    // Define theme presets
    const themes = {
        default: {
            gradientBackgroundStart: "rgb(108, 0, 162)",
            gradientBackgroundEnd: "rgb(0, 17, 82)",
            firstColor: "18, 113, 255",
            secondColor: "221, 74, 255",
            thirdColor: "100, 220, 255",
            fourthColor: "200, 50, 50",
            fifthColor: "180, 180, 50",
            pointerColor: "140, 100, 255",
        },
        orange: {
            gradientBackgroundStart: "rgb(69, 8, 5)",
            gradientBackgroundEnd: "rgb(199, 30, 7)",
            firstColor: "255, 111, 55", // orange-400
            secondColor: "255, 87, 34", // orange-500
            thirdColor: "255, 200, 168", // orange-200
            fourthColor: "255, 162, 112", // orange-300
            fifthColor: "240, 46, 6", // orange-600
            pointerColor: "255, 230, 212", // orange-100
        },
        blue: {
            gradientBackgroundStart: "rgb(30, 58, 138)",
            gradientBackgroundEnd: "rgb(3, 105, 161)",
            firstColor: "56, 189, 248", // sky-400
            secondColor: "14, 165, 233", // sky-500
            thirdColor: "186, 230, 253", // sky-200
            fourthColor: "125, 211, 252", // sky-300
            fifthColor: "2, 132, 199", // sky-600
            pointerColor: "224, 242, 254", // sky-100
        },
        green: {
            gradientBackgroundStart: "rgb(6, 78, 59)",
            gradientBackgroundEnd: "rgb(4, 120, 87)",
            firstColor: "52, 211, 153", // emerald-400
            secondColor: "16, 185, 129", // emerald-500
            thirdColor: "167, 243, 208", // emerald-200
            fourthColor: "110, 231, 183", // emerald-300
            fifthColor: "5, 150, 105", // emerald-600
            pointerColor: "209, 250, 229", // emerald-100
        },
        purple: {
            gradientBackgroundStart: "rgb(76, 29, 149)",
            gradientBackgroundEnd: "rgb(124, 58, 237)",
            firstColor: "167, 139, 250", // violet-400
            secondColor: "139, 92, 246", // violet-500
            thirdColor: "221, 214, 254", // violet-200
            fourthColor: "196, 181, 253", // violet-300
            fifthColor: "124, 58, 237", // violet-600
            pointerColor: "237, 233, 254", // violet-100
        },
        dark: {
            gradientBackgroundStart: "rgb(18, 15, 11)", // darkBlue from your config
            gradientBackgroundEnd: "rgb(31, 41, 55)", // gray-800
            firstColor: "75, 85, 99", // gray-600
            secondColor: "55, 65, 81", // gray-700
            thirdColor: "107, 114, 128", // gray-500
            fourthColor: "156, 163, 175", // gray-400
            fifthColor: "31, 41, 55", // gray-800
            pointerColor: "209, 213, 219", // gray-300
        },
    }

    // Apply theme if selected
    const selectedTheme = themes[theme] || themes.default

    // Use theme values or fallback to props
    const effectiveGradientBackgroundStart =
        gradientBackgroundStart !== "rgb(108, 0, 162)" ? gradientBackgroundStart : selectedTheme.gradientBackgroundStart
    const effectiveGradientBackgroundEnd =
        gradientBackgroundEnd !== "rgb(0, 17, 82)" ? gradientBackgroundEnd : selectedTheme.gradientBackgroundEnd
    const effectiveFirstColor = firstColor !== "18, 113, 255" ? firstColor : selectedTheme.firstColor
    const effectiveSecondColor = secondColor !== "221, 74, 255" ? secondColor : selectedTheme.secondColor
    const effectiveThirdColor = thirdColor !== "100, 220, 255" ? thirdColor : selectedTheme.thirdColor
    const effectiveFourthColor = fourthColor !== "200, 50, 50" ? fourthColor : selectedTheme.fourthColor
    const effectiveFifthColor = fifthColor !== "180, 180, 50" ? fifthColor : selectedTheme.fifthColor
    const effectivePointerColor = pointerColor !== "140, 100, 255" ? pointerColor : selectedTheme.pointerColor

    // Set CSS variables for colors
    useEffect(() => {
        // Use document.documentElement instead of document.body for more consistent behavior
        document.documentElement.style.setProperty("--gradient-background-start", effectiveGradientBackgroundStart)
        document.documentElement.style.setProperty("--gradient-background-end", effectiveGradientBackgroundEnd)
        document.documentElement.style.setProperty("--first-color", effectiveFirstColor)
        document.documentElement.style.setProperty("--second-color", effectiveSecondColor)
        document.documentElement.style.setProperty("--third-color", effectiveThirdColor)
        document.documentElement.style.setProperty("--fourth-color", effectiveFourthColor)
        document.documentElement.style.setProperty("--fifth-color", effectiveFifthColor)
        document.documentElement.style.setProperty("--pointer-color", effectivePointerColor)
        document.documentElement.style.setProperty("--size", size)
        document.documentElement.style.setProperty("--blending-value", blendingValue)

        // Clean up function to remove the styles when component unmounts
        return () => {
            document.documentElement.style.removeProperty("--gradient-background-start")
            document.documentElement.style.removeProperty("--gradient-background-end")
            document.documentElement.style.removeProperty("--first-color")
            document.documentElement.style.removeProperty("--second-color")
            document.documentElement.style.removeProperty("--third-color")
            document.documentElement.style.removeProperty("--fourth-color")
            document.documentElement.style.removeProperty("--fifth-color")
            document.documentElement.style.removeProperty("--pointer-color")
            document.documentElement.style.removeProperty("--size")
            document.documentElement.style.removeProperty("--blending-value")
        }
    }, [
        effectiveGradientBackgroundStart,
        effectiveGradientBackgroundEnd,
        effectiveFirstColor,
        effectiveSecondColor,
        effectiveThirdColor,
        effectiveFourthColor,
        effectiveFifthColor,
        effectivePointerColor,
        size,
        blendingValue,
    ])

    const [isSafari, setIsSafari] = useState(false)
    useEffect(() => {
        setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
    }, [])

    // Add fixed positioning for fullScreen mode
    const containerStyles = fullScreen
        ? "fixed inset-0 w-full h-full"
        : "h-screen w-screen relative overflow-hidden top-0 left-0"

    return (
        <div
            className={cn(
                containerStyles,
                "bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
                containerClassName,
            )}
        >
            <svg className="hidden">
                <defs>
                    <filter id="blurMe">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                        <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                </defs>
            </svg>
            <div className={cn("relative z-10 h-full w-full", className)}>{children}</div>
            <div
                className={cn(
                    "gradients-container h-full w-full blur-lg absolute inset-0",
                    isSafari ? "blur-2xl" : "filter-[url(#blurMe)_blur(40px)]",
                )}
            >
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--first-color),1)_0,rgba(var(--first-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[center_center]`,
                        `animate-first`,
                        `opacity-100`,
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--second-color),0.8)_0,rgba(var(--second-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-400px)]`,
                        `animate-second`,
                        `opacity-100`,
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--third-color),0.8)_0,rgba(var(--third-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%+400px)]`,
                        `animate-third`,
                        `opacity-100`,
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--fourth-color),0.8)_0,rgba(var(--fourth-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-200px)]`,
                        `animate-fourth`,
                        `opacity-70`,
                    )}
                ></div>
                <div
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--fifth-color),0.8)_0,rgba(var(--fifth-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-(--size) h-(--size) top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
                        `origin-[calc(50%-800px)_calc(50%+800px)]`,
                        `animate-fifth`,
                        `opacity-100`,
                    )}
                ></div>

                {/* Static gradient for the logo area */}
                <div
                    style={{
                        top: logoPosition.top,
                        left: logoPosition.left,
                    }}
                    className={cn(
                        `absolute [background:radial-gradient(circle_at_center,rgba(var(--pointer-color),0.8)_0,rgba(var(--pointer-color),0)_50%)_no-repeat]`,
                        `[mix-blend-mode:var(--blending-value)] w-[60%] h-[60%]`,
                        `opacity-70`,
                    )}
                ></div>
            </div>
        </div>
    )
}
