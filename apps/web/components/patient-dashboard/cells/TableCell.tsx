// apps/web/components/patient-dashboard/cells/TableCell.tsx
import React from 'react';

interface TableCellProps {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

export function TableCell({ children, align = 'left', className = '' }: TableCellProps) {
    return (
        <td className={`px-4 py-2 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
            {children}
        </td>
    );
}

