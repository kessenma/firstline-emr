// apps/web/components/ui/Table/Table.tsx
"use client";
import { DesktopTable } from "./DesktopTable";
import type { TableColumn } from "./types";

interface TableProps<T> {
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

export function Table<T>({
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
}: TableProps<T>) {
  // Simply pass all props to the DesktopTable component
  return (
    <DesktopTable
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
      deletingId={deletingId}
      enableAnimations={enableAnimations}
      enableDeleteAnimation={enableDeleteAnimation}
    />
  );
}
