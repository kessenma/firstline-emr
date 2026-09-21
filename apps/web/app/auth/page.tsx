// app/auth/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import LoginForm from "./../../components/auth/LoginForm"
import { RadioCard } from "@/components/ui/radio-card"
import Flex from "./../../components/ui/flex"
import Text from "./../../components/ui/text"
import { SignupProvider } from "@/components/auth/signup/container/SignupContext"
import SignupSection from "../../components/auth/signup/SignupSection"
import { ChevronUp, ChevronDown } from "lucide-react"

export default function AuthPage() {
    const router = useRouter()
    const [authType, setAuthType] = useState<"Login" | "Signup">("Signup")
    const [isHeaderVisible, setIsHeaderVisible] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [showTopChevron, setShowTopChevron] = useState(true)

    // Redirect to setup wizard if database is empty (no users)
    useEffect(() => {
        fetch("/api/setup/check")
            .then((res) => res.json())
            .then((data) => {
                if (data.isEmpty) {
                    router.replace("/setup")
                }
            })
            .catch(() => {
                // Ignore — setup check is non-critical
            })
    }, [router])

    const handleAuthTypeChange = (value: "Login" | "Signup") => {
        setAuthType(value)
        setIsHeaderVisible(value === "Login")
    }

    const toggleHeader = () => {
        setIsHeaderVisible(!isHeaderVisible)
    }

    const toggleExpand = () => {
        setIsExpanded(!isExpanded)
        if (!isExpanded) {
            setShowTopChevron(false)
        } else {
            setShowTopChevron(true)
        }
    }

    const handleExpand = () => {
        setIsExpanded(true)
        setShowTopChevron(false)
    }

    useEffect(() => {
        if (!isExpanded) {
            setShowTopChevron(true)
        }
    }, [isExpanded])

    return (
        <motion.div
            className="fixed inset-0 z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="relative w-full md:w-[70vw] bg-background rounded-lg shadow-md flex flex-col overflow-hidden z-20 pt-8 pb-2"
                initial={{ height: "70vh" }}
                animate={{ height: isExpanded ? "95vh" : "70vh" }}
                transition={{ duration: 0.3 }}
            >
                <AnimatePresence>
                    {isHeaderVisible && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="p-4 bg-muted">
                                <RadioCard.Root value={authType} onValueChange={handleAuthTypeChange} className="flex w-full">
                                    <RadioCard.Item value="Login" className="w-1/2 p-2">
                                        <Flex direction="column" width="100%" className="justify-center items-center">
                                            <Text size="sm" weight="normal">
                                                Login
                                            </Text>
                                        </Flex>
                                    </RadioCard.Item>
                                    <RadioCard.Item value="Signup" className="w-1/2 p-2">
                                        <Flex direction="column" width="100%" className="justify-center items-center">
                                            <Text size="sm" weight="normal">
                                                Sign Up
                                            </Text>
                                        </Flex>
                                    </RadioCard.Item>
                                </RadioCard.Root>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showTopChevron && (
                        <motion.button
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onClick={toggleHeader}
                            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 bg-background text-foreground rounded-full p-1 shadow-md"
                        >
                            {isHeaderVisible ? <ChevronUp size={24} className="text-muted-foreground" /> : <ChevronDown size={24} className="text-foreground" />}
                        </motion.button>
                    )}
                </AnimatePresence>

                <div className="grow overflow-y-auto md:p-8 p-4">
                    {authType === "Login" ? (
                        <div className="login-card w-full flex flex-col items-center justify-center">
                            <LoginForm />
                        </div>
                    ) : (
                        <SignupProvider>
                            <SignupSection onExpand={handleExpand} toggleExpand={toggleExpand} isExpanded={isExpanded} />
                        </SignupProvider>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
