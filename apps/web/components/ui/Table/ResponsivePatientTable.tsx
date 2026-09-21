"use client"
import { Table } from "./Table"
import { MobilePatientDashboardTable } from "./MobilePatientDashboardTable"
import type { TableColumn } from "./types"
import { useIsMobile } from "@/components/ui/Table/hooks/use-mobile"
import type { ReactNode } from "react"
import type { PatientWithMessages } from "@/components/patient-dashboard/types/patient-table-types"

interface ResponsivePatientTableProps {
    data: PatientWithMessages[]
    originalData?: PatientWithMessages[]
    columns: TableColumn<PatientWithMessages>[]
    onRowClick?: (item: PatientWithMessages) => void
    backgroundColor?: string
    rowClassName?: (item: PatientWithMessages) => string
    textColor?: string
    borderColor?: string
    headerBackgroundColor?: string
    headerTextColor?: string
    hoverBackgroundColor?: string
    hoverTextColor?: string
    stickyHeader?: boolean
    mobileBreakpoint?: number // Custom breakpoint for mobile view
    renderMobileActions?: (item: PatientWithMessages) => ReactNode
    activePatientDrawer?: string | null // ID of patient with active drawer
}

export function ResponsivePatientTable({
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
    activePatientDrawer,
}: ResponsivePatientTableProps) {
    const isMobile = useIsMobile(mobileBreakpoint)
    
    console.log("📊 ResponsivePatientTable:", { 
        isMobile, 
        windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'undefined',
        mobileBreakpoint,
        hasRenderMobileActions: !!renderMobileActions 
    })

    if (isMobile) {
        console.log("📱 Rendering MobilePatientDashboardTable")
        return (
            <MobilePatientDashboardTable
                data={data}
                onRowClick={onRowClick}
                renderActions={renderMobileActions}
                activePatientDrawer={activePatientDrawer}
            />
        )
    }

    console.log("🖥️ Rendering Desktop Table")
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
