// apps/web/components/nav/LoggedOutNav.tsx
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu } from 'lucide-react'
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import LanguagePopover from "../telegram-patient/aboutPage/LanguagePopover"
import { ThemeProvider } from "@/components/ui/ThemeProvider"

interface LoggedOutNavProps {
    className?: string
}

const LoggedOutNav: React.FC<LoggedOutNavProps> = ({ className }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()
    const menuRef = useRef<HTMLDivElement>(null)
    const [isPulsing, setIsPulsing] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    // Motion values for scroll-based animation
    const scrollY = useMotionValue(0)
    const languagePopoverTranslateX = useTransform(scrollY, [0, 100], [0, 120])
    const languagePopoverTranslateY = useTransform(scrollY, [0, 100], [0, -35])
    const languagePopoverScale = useTransform(scrollY, [0, 50], [1, 0.9])

    const handleLogoClick = () => {
        setIsPulsing(true)
        setTimeout(() => setIsPulsing(false), 1000)
    }

    const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
        <Link href={href} className="block relative">
            <motion.div
                className={`px-4 py-2 text-sm font-medium transition-colors text-right text-primary-foreground hover:bg-primary/80`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {children}
                {pathname === href && (
                    <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" layoutId="underline" />
                )}
            </motion.div>
        </Link>
    )

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleOutsideClick)
        }

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick)
        }
    }, [isMenuOpen])

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
            scrollY.set(window.scrollY)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [scrollY])

    return (
        <>
        <ThemeProvider mode="neutral">
            <nav className={`fixed z-50 px-4 py-4 w-full md:px-4 ${className}`}>
                <div className="flex relative justify-between items-center mx-auto max-w-7xl">
                    <div className="flex flex-col gap-0 items-center">
                    <div className="flex gap-2 items-center">
                        <Link href="/" className="flex gap-2 items-center">
                            <div
                                onClick={handleLogoClick}
                                className={`cursor-pointer transition-transform duration-300 ease-in-out ${isPulsing ? 'pulse-on-click' : 'hover:scale-150'}`}
                            >
                                <Image src="/assets/images/logo.svg" alt="MedFlow logo" width={30} height={30} className="object-contain" />
                            </div>
                            <motion.p
                                className={`text-xl font-bold text-foreground cursor-pointer transition-opacity duration-300 ${isScrolled ? "opacity-0" : "opacity-100"}`}
                                onClick={handleLogoClick}
                            >
                                Fajr.EMR
                            </motion.p>
                        </Link>
                    </div>
                    {pathname === '/new-patient' && (
                        <motion.div
                            className="mt-1"
                            style={{
                                x: languagePopoverTranslateX,
                                y: languagePopoverTranslateY,
                                scale: languagePopoverScale
                            }}
                        >
                            <LanguagePopover />
                        </motion.div>
                    )}
                    </div>

                    <div className="relative">
                        <motion.button
                            className="relative w-16 h-16 group"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            <div className="absolute inset-0">
                                {/* Dark triangle area */}
                                <div
                                    className="absolute top-0 right-0 w-full h-full bg-primary"
                                    style={{
                                        clipPath: "polygon(100% 0, 100% 100%, 0 0)",
                                    }}
                                />
                            </div>
                            {/* Menu icon */}
                            <Menu size={24} className="absolute top-2 right-2 text-primary-foreground" />
                        </motion.button>

                        {/* Menu for both mobile and desktop */}
                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    ref={menuRef}
                                    className="absolute right-4 p-4 -mt-8 space-y-2 w-48 rounded-md shadow-sm bg-primary text-primary-foreground border border-border"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    style={{
                                        transformOrigin: "top right"
                                    }}
                                >
                                    <NavItem href="/new-patient">New Patient</NavItem>
                                    <NavItem href="/about">About</NavItem>
                                    <NavItem href="/auth/login">Login</NavItem>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </nav>

        </ThemeProvider>
        </>
    )
}

export default LoggedOutNav
