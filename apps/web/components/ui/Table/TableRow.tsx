import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { TableCell } from './TableCell'
import { TableColumn } from './types'

interface TableRowProps<T> {
    item: T
    originalItem?: T
    columns: TableColumn<T>[]
    expandedColumns: string[]
    columnWidths: { [key: string]: number }
    onRowClick?: (item: T) => void
    borderColor: string
    hoverBackgroundColor: string
    hoverTextColor: string
    backgroundColor: string
    textColor: string
}

function TableRowComponent<T>({
                                  item,
                                  originalItem,
                                  columns,
                                  expandedColumns,
                                  columnWidths,
                                  onRowClick,
                                  borderColor,
                                  hoverBackgroundColor,
                                  hoverTextColor,
                                  backgroundColor,
                                  textColor,
                                  ...motionProps
                              }: TableRowProps<T> & HTMLMotionProps<"tr">, ref: any) {
    return (
        <motion.tr
            ref={ref}
            className={`border-t ${borderColor} ${onRowClick ? 'cursor-pointer' : ''} ${backgroundColor}`}
            onClick={() => onRowClick && onRowClick(item)}
            whileHover={{
                backgroundColor: hoverBackgroundColor,
                color: hoverTextColor,
                transition: { duration: 0.2 },
            }}
            {...motionProps}
        >
            {columns.map((column) => (
                <TableCell
                    key={column.key.toString()}
                    item={item}
                    originalItem={originalItem}
                    column={column}
                    expandedColumns={expandedColumns}
                    columnWidths={columnWidths}
                    textColor={textColor}
                />
            ))}
            <td className={`px-4 py-2 w-12 ${textColor}`}></td>
        </motion.tr>
    )
}

TableRowComponent.displayName = 'TableRow'

export const TableRow = React.forwardRef(TableRowComponent) as <T>(
    props: TableRowProps<T> & HTMLMotionProps<"tr"> & { ref?: any }
) => React.ReactElement
