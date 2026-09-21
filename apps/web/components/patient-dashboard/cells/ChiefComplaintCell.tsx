// apps/web/components/patient-dashboard/ChiefComplaintCell.tsx
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CopyButton } from "@/components/ui/CopyButton"

interface ChiefComplaintCellProps {
    value: string
    itemId: string
    isAllExpanded: boolean
    expandedStates: Record<string, boolean>
    setExpandedStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export const ChiefComplaintCell: React.FC<ChiefComplaintCellProps> = ({
                                                                          value,
                                                                          itemId,
                                                                          isAllExpanded,
                                                                          expandedStates,
                                                                          setExpandedStates,
                                                                      }) => {
    const [isExpanded, setIsExpanded] = useState(isAllExpanded || expandedStates[itemId] || false)
    const [isHovered, setIsHovered] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const cellRef = useRef<HTMLDivElement>(null)
    const [cellWidth, setCellWidth] = useState(0)

    useEffect(() => {
        const checkIfMobile = () => setIsMobile(window.innerWidth < 768)
        checkIfMobile()
        window.addEventListener("resize", checkIfMobile)
        return () => window.removeEventListener("resize", checkIfMobile)
    }, [])

    useEffect(() => {
        if (cellRef.current) {
            const updateWidth = () => {
                const width = cellRef.current?.offsetWidth || 0
                setCellWidth(width)
            }
            updateWidth()
            window.addEventListener("resize", updateWidth)
            return () => window.removeEventListener("resize", updateWidth)
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
                setIsExpanded(false)
            }
        }

        if (isMobile && isExpanded) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isMobile, isExpanded])

    const toggleExpand = () => {
        if (isMobile) {
            setIsExpanded(!isExpanded)
            setExpandedStates((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
        }
    }

    const updateMousePosition = (e: React.MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const truncatedValue = value?.length > 15 ? `${value.slice(0, 15)}...` : (value ?? "N/A")

    return (
        <div
            ref={cellRef}
            className="relative h-10 flex items-center px-3"
            onMouseEnter={() => !isMobile && setIsHovered(true)}
            onMouseLeave={() => !isMobile && setIsHovered(false)}
            onMouseMove={updateMousePosition}
            onClick={toggleExpand}
            style={{ width: cellWidth || "auto" }}
        >
            {/* Base Content */}
            <AnimatePresence>
                {(!isHovered || isMobile) && (
                    <motion.div className="flex items-center h-full w-full" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span className="text-sm truncate max-w-[150px]">{truncatedValue}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Hover State */}
            {!isMobile && (
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-primary/10 text-primary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <CopyButton 
                                textToCopy={value}
                                label="chief complaint"
                                variant="ghost"
                                className="flex items-center justify-center w-full h-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Mouse-following Tooltip */}
            <AnimatePresence>
                {isHovered && !isMobile && (
                    <motion.div
                        className="fixed z-20 bg-card text-foreground border border-border rounded-md shadow-lg p-2 max-w-xs"
                        style={{
                            left: mousePosition.x + 10,
                            top: mousePosition.y + 10,
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                    >
                        <p className="text-sm whitespace-normal break-words">{value}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Expanded State */}
            {isMobile && (
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            className="absolute z-10 left-0 right-0 text-foreground bg-card shadow-lg rounded-md mt-1"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ width: cellWidth || "auto" }}
                        >
                            <div className="p-3">
                                <p className="text-sm mb-2 whitespace-normal break-words">{value}</p>
                                <CopyButton 
                                    textToCopy={value}
                                    label="chief complaint"
                                    variant="outline"
                                    className="flex items-center justify-center w-full px-2 py-1 text-xs rounded border-2 border-border text-primary transition-colors duration-200"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    )
}
