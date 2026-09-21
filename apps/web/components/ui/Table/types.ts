import type React from "react"
export interface TableColumn<T> {
    key: string
    header: string
    sortable?: boolean
    sortKey?: string
    width?: number | string // Supports both number and string
    minWidth?: number | string // Supports both
    maxWidth?: number | string // Supports both
    hideOnMobile?: boolean
    priority?: number // Higher priority columns show first on mobile
    mobileSize?: "small" | "medium" | "large" // Size hint for mobile layout
    id?: string // Support for legacy code
    hidden?: boolean // For expandable/collapsible columns
    resizable?: boolean // For resizable columns
    filter?: boolean // For filtering columns
    nestedKey?: string
    render?: (value: any, item: T, originalItem?: T) => React.ReactNode
}

export interface SortConfig {
    key: string
    direction: "asc" | "desc"
}

export interface ColumnWidths {
    [key: string]: number
}

export interface ExpandedColumns {
    [key: string]: boolean
}
