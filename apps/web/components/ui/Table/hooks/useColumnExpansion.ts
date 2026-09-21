import { useState, useMemo } from 'react'
import { TableColumn } from '../types'

export function useColumnExpansion<T>(columns: TableColumn<T>[]) {
    const [expandedColumns, setExpandedColumns] = useState<string[]>([])

    const hiddenColumns = useMemo(() => columns.filter(col => col.hidden).map(col => col.key.toString()), [columns])

    const toggleColumnExpansion = (column: string) => {
        setExpandedColumns(prev =>
            prev.includes(column) ? prev.filter(col => col !== column) : [...prev, column]
        )
    }

    const toggleAllColumns = () => {
        setExpandedColumns(prev =>
            prev.length === hiddenColumns.length ? [] : hiddenColumns
        )
    }

    return { expandedColumns, toggleColumnExpansion, toggleAllColumns }
}

