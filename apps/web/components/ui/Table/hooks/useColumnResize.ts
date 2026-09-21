import { useState } from 'react'

export function useColumnResize() {
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})

    const handleColumnResize = (columnKey: string, width: number) => {
        setColumnWidths(prev => ({ ...prev, [columnKey]: width }))
    }

    return { columnWidths, handleColumnResize }
}

