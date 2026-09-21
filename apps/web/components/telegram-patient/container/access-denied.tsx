// apps/web/components/telegram-patient/container/access-denied.tsx

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { TelegramIcon } from "@/components/icons/TelegramIcon"
import { CopyButton } from "@/components/ui/CopyButton"

// Reuse the same LanguageSelector from your intake form folder
import { LanguageSelector } from "@/components/telegram-patient/container/intake-form/view/LanguageSelector"
import type { LanguageString } from "@/components/telegram-patient/container/intake-form/patient-form-translations"

// Import our new translations helper for Access Denied
import { getAccessDeniedTranslation } from "./access-denied-translations"

export default function AccessDeniedPage() {
    // Track the currently selected language
    const [currentLanguage, setCurrentLanguage] = useState<LanguageString>("English")

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
    const telegramLink = `https://t.me/${botUsername}`
    console.log("Bot username:", botUsername)

    // Safely grab each piece of translated text
    const titleText = getAccessDeniedTranslation("title", currentLanguage)
    const descriptionText = getAccessDeniedTranslation("description", currentLanguage)
    const instructionText = getAccessDeniedTranslation("instruction", currentLanguage)
    const codeLabel = getAccessDeniedTranslation("codeLabel", currentLanguage)
    const copyButtonLabel = getAccessDeniedTranslation("copyButton", currentLanguage)
    const copiedMsg = getAccessDeniedTranslation("copiedConfirmation", currentLanguage)
    const openTelegramText = getAccessDeniedTranslation("openTelegram", currentLanguage)

    // Helper to get code to copy
    const codeToCopy = getAccessDeniedTranslation("codeLabel", currentLanguage)

    return (
        <div className="flex flex-col justify-center items-center p-4 min-h-screen">

            {/* Include the language selector at the top so user can change language */}
            <div className="top-12 pt-16 pb-4 z-100">
                <LanguageSelector
                    currentLanguage={currentLanguage}
                    onLanguageChange={(lang) => setCurrentLanguage(lang)}
                />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card backgroundOpacity={60} className="overflow-hidden w-full max-w-md shadow-lg shadow-muted">
                    <motion.div
                        initial={{ y: -50 }}
                        animate={{ y: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
                    >
                        <CardHeader className="bg-muted/50">
                            <div className="flex justify-center mb-2">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                                >
                                    <AlertTriangle className="w-12 h-12 text-accent" />
                                </motion.div>
                            </div>
                            <CardTitle className="text-2xl text-center text-accent">
                                {titleText}
                            </CardTitle>
                            <CardDescription className="text-center text-foreground">
                                {descriptionText}
                            </CardDescription>
                        </CardHeader>
                    </motion.div>

                    <CardContent className="pt-6 space-y-4">
                        <motion.p
                            className="text-foreground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            {instructionText}
                        </motion.p>

                        <motion.div
                            className="flex justify-center items-center p-3 space-x-2 bg-muted rounded-md"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <code className="font-mono text-lg">
                                {codeLabel}
                            </code>

                            <CopyButton
                                textToCopy={codeToCopy}
                                label="code"
                                variant="ghost"
                                className="text-foreground hover:text-accent focus:outline-hidden"
                            />
                        </motion.div>

                        {/* Optional label under the copy button if you want a "Copy" text next to the icon */}
                        <div className="text-sm text-center text-foreground">
                             {copyButtonLabel}
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-center pb-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                variant="orange"
                                onClick={() => (window.location.href = telegramLink)}
                            >
                                {openTelegramText}
                                <TelegramIcon className="p-1 ml-2 w-8 bg-card rounded-xl" />
                            </Button>
                        </motion.div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}