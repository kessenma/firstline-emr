import { useState, useMemo } from 'react'

export function useTableSort<T>(data: T[]) {
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const sortedData = useMemo(() => {
        if (!data) return [];
        if (sortColumn) {
            return [...data].sort((a: any, b: any) => {
                const aValue = sortColumn.includes('.') ? sortColumn.split('.').reduce((obj, key) => obj && obj[key], a) : a[sortColumn];
                const bValue = sortColumn.includes('.') ? sortColumn.split('.').reduce((obj, key) => obj && obj[key], b) : b[sortColumn];
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [data, sortColumn, sortDirection]);

    return { sortedData, sortColumn, sortDirection, handleSort };
}

