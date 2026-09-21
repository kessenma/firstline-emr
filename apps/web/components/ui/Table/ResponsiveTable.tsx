"use client"
import { Table } from "./Table"
import { MobileTable } from "./MobileTable"
import type { TableColumn } from "./types"
import { useIsMobile } from "@/components/ui/Table/hooks/use-mobile"
import type { ReactNode } from "react"

interface ResponsiveTableProps<T> {
    data: T[]
    originalData?: T[]
    columns: TableColumn<T>[]
    onRowClick?: (item: T) => void
    backgroundColor?: string
    rowClassName?: (item: T) => string
    textColor?: string
    borderColor?: string
    headerBackgroundColor?: string
    headerTextColor?: string
    hoverBackgroundColor?: string
    hoverTextColor?: string
    stickyHeader?: boolean
    mobileBreakpoint?: number // Custom breakpoint for mobile view
    renderMobileActions?: (item: T) => ReactNode
}

export function ResponsiveTable<T>({
                                       data,
                                       originalData,
                                       columns,
                                       onRowClick,
    backgroundColor = "background",
    rowClassName,
    textColor = "foreground",
    borderColor = "border",
    headerBackgroundColor = "muted",
    headerTextColor = "muted-foreground",
    hoverBackgroundColor = "muted/50",
    hoverTextColor = "foreground",
                                       stickyHeader = false,
                                       mobileBreakpoint = 768, // Default to 768px (md breakpoint)
                                       renderMobileActions,
                                   }: ResponsiveTableProps<T>) {
    const isMobile = useIsMobile(mobileBreakpoint)

    if (isMobile) {
        return (
            <MobileTable
                data={data}
                columns={columns}
                onRowClick={onRowClick}
                backgroundColor={backgroundColor}
                textColor={textColor}
                borderColor={borderColor}
                hoverBackgroundColor={hoverBackgroundColor}
                hoverTextColor={hoverTextColor}
                renderActions={renderMobileActions}
            />
        )
    }

    return (
        <Table
            data={data}
            originalData={originalData}
            columns={columns}
            onRowClick={onRowClick}
            rowClassName={rowClassName}
            backgroundColor={backgroundColor}
            textColor={textColor}
            borderColor={borderColor}
            headerBackgroundColor={headerBackgroundColor}
            headerTextColor={headerTextColor}
            hoverBackgroundColor={hoverBackgroundColor}
            hoverTextColor={hoverTextColor}
            stickyHeader={stickyHeader}
        />
    )
}
