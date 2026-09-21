import React, { ReactNode } from 'react'
import type { TableColumn } from "./types"

interface TableCellProps<T> {
    item: T
    originalItem?: T
    column: TableColumn<T>
    expandedColumns: string[]
    columnWidths: { [key: string]: number }
    textColor: string
    children?: ReactNode
    align?: "center" | "left" | "right"
    className?: string
}

export function TableCell<T>({
                                 item,
                                 originalItem,
                                 column,
                                 expandedColumns,
                                 columnWidths,
                                 textColor,
                                 children,
                                 align = "left",
                                 className = "",
                             }: TableCellProps<T>) {
    const getCellValue = (item: T, column: TableColumn<T>, originalItem?: T): React.ReactNode => {
        let value;
        if (column.render) {
            value = column.render(
                column.nestedKey ? getNestedValue(item, column.nestedKey) : item[column.key as keyof T],
                item,
                originalItem
            );
        } else if (column.nestedKey) {
            value = getNestedValue(item, column.nestedKey);
        } else {
            value = item[column.key as keyof T];
        }

        if (Array.isArray(value)) {
            return (
                <div className="space-y-2">
                    {value.map((item, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <hr className="border-t-2 border-border" />}
                            <div>{item}</div>
                        </React.Fragment>
                    ))}
                </div>
            );
        }

        return value as React.ReactNode;
    };

    const cellContent = children || getCellValue(item, column, originalItem)

    return (
        <td
            className={`px-4 py-2 ${column.width || ""} ${
                column.hidden && !expandedColumns.includes(column.key.toString()) ? "hidden" : ""
            } ${textColor} ${className}`}
            style={{
                width: columnWidths[column.key.toString()],
                textAlign: align,
            }}
        >
            {cellContent}
        </td>
    )
}

function getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), obj)
}
