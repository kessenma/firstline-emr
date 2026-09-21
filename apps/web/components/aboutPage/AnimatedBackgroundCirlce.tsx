"use client"

import { motion } from "framer-motion"
import clsx from "clsx"

interface AnimatedBackgroundCircleProps {
    variant?: "light" | "medium" | "dark"
    enabled?: boolean
}

const COLOR_VARIANTS = {
    light: {
        border: ["border-primary/40", "border-primary/30", "border-primary/20"],
        gradient: "from-primary/20",
    },
    medium: {
        border: ["border-primary/40", "border-primary/30", "border-primary/20"],
        gradient: "from-primary/20",
    },
    dark: {
        border: ["border-primary/40", "border-primary/30", "border-primary/20"],
        gradient: "from-primary/20",
    },
} as const

export function AnimatedBackgroundCircle({ variant = "medium", enabled = false }: AnimatedBackgroundCircleProps) {
    const variantStyles = COLOR_VARIANTS[variant]

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    className="relative"
                    style={{
                        width: "100vmin",
                        height: "100vmin",
                        maxWidth: "100px",
                        maxHeight: "100px",
                    }}
                >
                    {enabled && [0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={clsx(
                                "absolute inset-0 rounded-full",
                                "border-2 bg-linear-to-br to-transparent",
                                variantStyles.border[i],
                                variantStyles.gradient,
                            )}
                            animate={{
                                rotate: 360,
                                scale: [1, 1.07 + i * 0.07, 1],
                                opacity: [0.6, 0.8, 0.6],
                            }}
                            transition={{
                                duration: 5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                            }}
                        >
                            <div
                                className={clsx(
                                    "absolute inset-0 rounded-full mix-blend-screen",
                                    "bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_70%)]",
                                )}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    )
}
