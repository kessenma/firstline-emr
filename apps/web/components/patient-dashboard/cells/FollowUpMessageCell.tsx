"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"

interface FollowUpMessageCellProps {
    value: string
    item: any
}

export const FollowUpMessageCell: React.FC<FollowUpMessageCellProps> = ({ value, item }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    // If message is short, just display it
    if (value.length < 50) {
        return <div className="text-sm">{value}</div>
    }

    return (
        <div className="relative text-sm cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="truncate max-w-xs md:max-w-md lg:max-w-lg">
                {isExpanded ? value : `${value.substring(0, 50)}...`}
            </div>

            {isExpanded && (
                <motion.div
                    className="absolute top-full left-0 z-10 bg-card border border-border rounded p-2 mt-1 shadow-sm max-w-md"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {value}
                </motion.div>
            )}
        </div>
    )
}
