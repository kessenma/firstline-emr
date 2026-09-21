// apps/web/components/ui/Table/TableSkeleton.tsx
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rowCount?: number;
    columnCount?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rowCount = 5, columnCount = 6 }) => {
    return (
        <div className="w-full overflow-hidden rounded-lg border border-border">
            {/* Table Header */}
            <div className="bg-muted p-4">
                <div className="flex space-x-4">
                    {Array.from({ length: columnCount }).map((_, i) => (
                        <Skeleton key={`header-${i}`} className="h-6 w-24 rounded-md" />
                    ))}
                </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border">
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex items-center space-x-4 p-4 transition-colors hover:bg-muted/50">
                        {Array.from({ length: columnCount }).map((_, colIndex) => (
                            <Skeleton
                                key={`cell-${rowIndex}-${colIndex}`}
                                className={`h-5 rounded-md ${
                                    colIndex === 0 ? "w-8" : colIndex === columnCount - 1 ? "w-20" : "w-24"
                                }`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
