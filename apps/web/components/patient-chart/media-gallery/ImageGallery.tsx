// apps/web/components/patient-chart/media-gallery/ImageGallery.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import TelegramMessagesGalleryView from "./TelegramMessagesGalleryView"
import PatientImageGalleryView from "./PatientImageGalleryView"
import { usePatientDashboard } from "../PatientViewModelContext"
import { RadioCard } from "@/components/ui/radio-card"

const ImageGallery: React.FC = () => {
    const { id } = useParams()
    const { patientInfo } = usePatientDashboard()
    const [selectedView, setSelectedView] = useState<"telegram" | "patient">(
        patientInfo?.telegramChatId ? "telegram" : "patient",
    )

    // Hide Telegram Gallery if there's no Telegram Chat ID
    const filteredTabs = patientInfo?.telegramChatId
        ? [
            { id: "telegram", label: "Telegram Media" },
            { id: "patient", label: "Patient Media" },
        ]
        : [{ id: "patient", label: "Patient Media" }]

    if (!id || typeof id !== "string") {
        return <div className="text-destructive text-center font-bold">Invalid patient ID</div>
    }

    return (
        <div className="bg-card rounded-xl shadow-md p-6 mt-4">
            {/* Radio Card Selection */}
            <RadioCard.Root
                className="flex justify-center w-full mb-6 gap-4"
                value={selectedView}
                onValueChange={(value) => setSelectedView(value as "telegram" | "patient")}
            >
                {filteredTabs.map((tab) => (
                    <RadioCard.Item
                        key={tab.id}
                        value={tab.id}
                        className={`text-sm font-medium transition-all duration-200 ${
                            selectedView === tab.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                        }`}
                    >
                        {tab.label}
                    </RadioCard.Item>
                ))}
            </RadioCard.Root>

            {/* Animated Content Switch */}
            <motion.div
                key={selectedView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                {selectedView === "telegram" ? (
                    <TelegramMessagesGalleryView patientId={id} />
                ) : (
                    <PatientImageGalleryView patientId={id} />
                )}
            </motion.div>
        </div>
    )
}

export default ImageGallery
