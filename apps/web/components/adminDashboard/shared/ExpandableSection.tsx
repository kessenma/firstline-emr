// components/adminDashboard/ExpandableSection.tsx

"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useResizeObserver } from "@/components/adminDashboard/hooks/use-resize-observer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface ExpandableSectionProps {
    id: string
    title: string
    icon: React.ElementType
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
}

export function ExpandableSection({
                                      id,
                                      title,
                                      icon: Icon,
                                      isOpen,
                                      onToggle,
                                      children,
                                  }: ExpandableSectionProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState<number>(0)
    const [hasBeenOpened, setHasBeenOpened] = useState(isOpen)

    // Track first open — once true, never resets (keeps children mounted)
    useEffect(() => {
        if (isOpen && !hasBeenOpened) {
            setHasBeenOpened(true)
        }
    }, [isOpen, hasBeenOpened])

    // Update height whenever content changes or when opened
    useEffect(() => {
        if (isOpen && contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight)
        } else if (!isOpen) {
            setContentHeight(0)
        }
    }, [isOpen, hasBeenOpened])

    // Create a resize observer to handle dynamic content changes
    useResizeObserver(contentRef, (entry) => {
        if (isOpen && entry) {
            setContentHeight(entry.target.scrollHeight)
        }
    })

    return (
        <Card key={id} id={id} className="mb-6 bg-card text-foreground border border-border shadow-sm">
            <CardHeader className="p-0 border-b border-border">
                <button
                    className="w-full p-4 text-left flex items-center justify-between focus:outline-hidden"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-controls={`content-${id}`}
                >
                    <div className="flex items-center">
                        <Icon className="mr-2 h-5 w-5" />
                        <CardTitle className="text-xl">{title}</CardTitle>
                    </div>
                    <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}> ▼ </span>
                </button>
            </CardHeader>
            <div
                id={`content-${id}`}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? `${contentHeight}px` : "0px",
                    opacity: isOpen ? 1 : 0,
                }}
            >
                <CardContent className="p-4">
                    <div ref={contentRef}>
                        {hasBeenOpened ? children : null}
                    </div>
                </CardContent>
            </div>
        </Card>
    )
}
