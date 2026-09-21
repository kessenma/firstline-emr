// apps/web/components/patient-dashboard/cells/PatientIdCell.tsx
"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {Loader2, ExternalLink, MessageCircle} from "lucide-react"
import { CopyButton } from "@/components/ui/CopyButton"
import type { Patient } from "@/db/schema/patients"
import type { PatientWithMessages } from "../viewModel/types"

interface PatientIdCellProps {
    value: string
    item: PatientWithMessages
    isHovered: boolean
    isLoading: boolean
    hasUnread: boolean
    handleHoverStart: (id: string) => void
    handleHoverEnd: (id: string) => void
    handlePatientClick: (id: string, careTeam: Patient["careTeam"]) => void
    handleChatClick: (patient: PatientWithMessages) => void
}

export const PatientIdCell: React.FC<PatientIdCellProps> = ({
                                                                value,
                                                                item,
                                                                isHovered,
                                                                isLoading,
                                                                hasUnread,
                                                                handleHoverStart,
                                                                handleHoverEnd,
                                                                handlePatientClick,
                                                                handleChatClick,
                                                            }) => {
    const displayId = item.id

    return (
        <motion.div
            className="relative group flex items-center"
            onHoverStart={() => handleHoverStart(displayId)}
            onHoverEnd={() => handleHoverEnd(displayId)}
        >
            <Button
                variant="outline"
                onClick={() => handlePatientClick(displayId, item.careTeam)}
                className="mr-2 max-w-[80px] truncate relative"
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : displayId}
            </Button>

            <CopyButton
                textToCopy={displayId}
                label="ID"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            />

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                    e.stopPropagation()
                    handlePatientClick(displayId, item.careTeam)
                }}
                title="Open Patient"
                disabled={isLoading}
            >
                <ExternalLink className="h-4 w-4" />
            </Button>

            {item.telegramChatId && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 ml-1"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleChatClick(item)
                    }}
                    title="Open Chat"
                    disabled={isLoading}
                >
                    <MessageCircle className="h-4 w-4" />
                </Button>
            )}

            {/* Unread messages indicator (dot) */}
            {hasUnread && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                </div>
            )}

            {isHovered && !isLoading && (
                <motion.div
                    className={`absolute top-full left-0 text-xs rounded px-2 py-1 mt-1 max-w-xs whitespace-normal bg-muted text-foreground`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {displayId}
                </motion.div>
            )}
        </motion.div>
    )
}
