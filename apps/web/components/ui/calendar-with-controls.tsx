// apps/web/components/ui/calendar-with-controls.tsx
"use client"

import * as React from "react"
import { format, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from "react-day-picker"

import { cn } from "@/utils/classNames"
import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export interface CalendarWithControlsProps {
    className?: string
    classNames?: any
    showOutsideDays?: boolean
    type?: "future" | "past"
    selected?: Date | undefined
    onSelect?: (date: Date | undefined) => void
    mode?: "single" | "range" | "multiple"
    backgroundColor?: string
}

export function CalendarWithControls({
                                         className,
                                         classNames,
                                         showOutsideDays = true,
                                         type = "future",
                                         mode = "single",
                                         selected,
                                         onSelect,
                                         backgroundColor = "bg-popover",
                                         ...props
                                     }: CalendarWithControlsProps) {
    const today = React.useMemo(() => new Date(), [])
    const [year, setYear] = React.useState(selected?.getFullYear() || today.getFullYear())
    const [month, setMonth] = React.useState(selected?.getMonth() || today.getMonth())

    const yearsToShow = 100

    const years = React.useMemo(() => {
        if (type === "future") {
            return Array.from({ length: yearsToShow }, (_, i) => today.getFullYear() + i)
        } else {
            return Array.from({ length: yearsToShow }, (_, i) => today.getFullYear() - i).reverse()
        }
    }, [type, today])

    const months = React.useMemo(() => {
        return eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 0, 1)),
        })
    }, [year])

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setYear(date.getFullYear())
            setMonth(date.getMonth())
            onSelect?.(date)
        }
    }

    const handleMonthChange = (value: string) => {
        setMonth(Number.parseInt(value))
        const newDate = new Date(year, Number.parseInt(value), selected?.getDate() || today.getDate())
        onSelect?.(newDate)
    }

    const handleYearChange = (value: string) => {
        setYear(Number.parseInt(value))
        const newDate = new Date(Number.parseInt(value), month, selected?.getDate() || today.getDate())
        onSelect?.(newDate)
    }

    const goToNextMonth = () => {
        const nextMonth = (month + 1) % 12
        const nextYear = month === 11 ? year + 1 : year
        setMonth(nextMonth)
        setYear(nextYear)
    }

    const goToPreviousMonth = () => {
        const prevMonth = (month - 1 + 12) % 12
        const prevYear = month === 0 ? year - 1 : year
        setMonth(prevMonth)
        setYear(prevYear)
    }

    // Convert color string to Tailwind class if not already formatted
    const bgClass = backgroundColor && backgroundColor.length > 0
        ? (backgroundColor.startsWith("bg-") ? backgroundColor : `bg-${backgroundColor}`)
        : "";

    return (
        <div className={cn("p-3", bgClass, className)}>
            <div className="flex justify-between items-center mb-4">
                <Select value={month.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue>{format(new Date(year, month), "MMMM")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-50">
                        {months.map((m, index) => (
                            <SelectItem key={index} value={index.toString()}>
                                {format(m, "MMMM")}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={year.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue>{year}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-50">
                        {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex justify-between items-center mb-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
            <DayPicker
                mode={mode as "single"}
                selected={selected}
                onSelect={handleDateSelect}
                month={new Date(year, month)}
                showOutsideDays={showOutsideDays}
                className={classNames?.root}
                classNames={{
                    ...classNames,
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "hidden", // Hide the built-in month/year label
                    nav: "hidden", // Hide the built-in navigation
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: cn("h-8 w-8 p-0 font-normal aria-selected:opacity-100", "hover:bg-accent hover:text-accent-foreground"),
                    day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                    ...classNames,
                }}
                disabled={type === "future" ? (date) => date < new Date() : (date) => date > new Date()}
                {...props}
            />
        </div>
    )
}
