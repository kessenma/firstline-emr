"use client";
import { useState, useRef } from "react";
import type React from "react";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TableColumn } from "./types";

interface DesktopTableProps<T> {
  data: T[];
  originalData?: T[];
  columns: TableColumn<T>[];
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  stickyHeader?: boolean;
  deletingId?: string | null;
  enableAnimations?: boolean;
  enableDeleteAnimation?: boolean;
}

export function DesktopTable<T>({
  data,
  originalData,
  columns,
  onRowClick,
  rowClassName,
  backgroundColor = "background",
  textColor = "foreground",
  borderColor = "border",
  headerBackgroundColor = "muted",
  headerTextColor = "muted-foreground",
  hoverBackgroundColor = "muted/50",
  hoverTextColor = "foreground",
  stickyHeader = false,
  deletingId = null,
  enableAnimations = false,
  enableDeleteAnimation = false,
}: DesktopTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [cellClickHandled, setCellClickHandled] = useState(false);

  // Convert color strings to Tailwind classes
  const convertColor = (color: string, prefix: string) => {
    // If color already includes the prefix (e.g., "bg-yellow-50"), return as is
    if (color.startsWith(prefix + "-")) {
      return color;
    }
    // Otherwise, add the prefix (e.g., "yellow-50" becomes "bg-yellow-50")
    return `${prefix}-${color}`;
  };

  // Derive alternate background for zebra striping
  const deriveAlternateBg = (color: string) => {
    const match = color.match(/^(\w+)-(\d{2,3})$/);
    if (match) {
      const base = match[1];
      const shade = parseInt(match[2], 10);
      const nextShade = Math.min(shade + 50, 900);
      return `${base}-${isNaN(nextShade) ? shade : nextShade}`;
    }
    // Fallback for tokens like "background" or "muted"
    return "muted";
  };

  // Handle cell click to prevent row click from firing
  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCellClickHandled(true);

    // Reset the flag after a short delay
    setTimeout(() => {
      setCellClickHandled(false);
    }, 100);
  };

  // Handle row click only if no cell click was handled
  const handleRowClick = (item: T) => {
    if (!cellClickHandled && onRowClick) {
      onRowClick(item);
    }
  };

  // Generate a stable key for each row
  const getRowKey = (item: T, index: number) => {
    // Try to use an 'id' property if it exists, otherwise fall back to index
    const itemWithId = item as any;
    return itemWithId?.id ?? index;
  };

  // Check if a row is being deleted
  const isDeleting = (item: T) => {
    const itemWithId = item as any;
    return deletingId && itemWithId?.id === deletingId;
  };

  return (
    <div className="w-full h-full overflow-auto">
      <table
        ref={tableRef}
        className={cn(
          "w-full border-collapse",
          convertColor(borderColor, "border"),
        )}
      >
        <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
          <tr
            className={cn(
              convertColor(headerBackgroundColor, "bg"),
              convertColor(headerTextColor, "text"),
              "border-b",
              convertColor(borderColor, "border-b"),
            )}
          >
            {columns.map((column) => (
              <th
                key={column.key as string}
                className={cn(
                  "px-4 py-2 text-left font-medium",
                  column.width ? `w-[${column.width}]` : "",
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {data.map((item, rowIndex) => (
              <motion.tr
                key={getRowKey(item, rowIndex)}
                layout={enableAnimations}
                className={cn(
                  // Zebra striping for visibility
                  `odd:${convertColor(backgroundColor, "bg")}`,
                  `even:${convertColor(deriveAlternateBg(backgroundColor), "bg")}`,
                  convertColor(textColor, "text"),
                  "border-b",
                  convertColor(borderColor, "border-b"),
                  rowClassName ? rowClassName(item) : "",
                  hoveredRow === rowIndex
                    ? cn(
                        convertColor(hoverBackgroundColor, "bg"),
                        convertColor(hoverTextColor, "text"),
                      )
                    : "",
                  onRowClick ? "cursor-pointer" : "",
                  // Highlight deleting row in red (only if animation enabled)
                  enableDeleteAnimation && isDeleting(item)
                    ? "bg-destructive/20 border-destructive"
                    : "",
                )}
                initial={enableAnimations ? { opacity: 0, x: -20 } : false}
                animate={enableAnimations ? { opacity: 1, x: 0 } : false}
                exit={
                  enableDeleteAnimation
                    ? {
                        opacity: 0,
                        x: 20,
                        height: 0,
                        backgroundColor: "hsl(var(--destructive) / 0.3)",
                        transition: { duration: 0.3, ease: "easeInOut" },
                      }
                    : undefined
                }
                transition={
                  enableAnimations
                    ? { duration: 0.3, delay: rowIndex * 0.05 }
                    : { duration: 0 }
                }
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(item)}
              >
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key as string}`}
                    className="px-4 py-2"
                    onClick={handleCellClick}
                  >
                    {column.render
                      ? column.render(item[column.key as keyof T], item)
                      : String(item[column.key as keyof T] || "")}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
