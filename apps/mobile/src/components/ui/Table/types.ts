// apps/mobile/src/components/ui/Table/types.ts
// Type definitions for Table components

import type { ReactNode } from 'react';

/**
 * Column definition for table
 */
export interface TableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Display label for the column header */
  label: string;
  /** Function to render cell content */
  render?: (item: T) => ReactNode;
  /** Optional accessor function to get value from item */
  accessor?: (item: T) => any;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Optional width for the column */
  width?: number | string;
  /** Optional alignment for the column */
  align?: 'left' | 'center' | 'right';
}

/**
 * Props for Table component
 */
export interface TableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Callback when a row is clicked */
  onRowClick?: (item: T) => void;
  /** Background color (CSS class name) */
  backgroundColor?: string;
  /** Text color (CSS class name) */
  textColor?: string;
  /** Border color (CSS class name) */
  borderColor?: string;
  /** Hover background color (CSS class name) */
  hoverBackgroundColor?: string;
  /** Hover text color (CSS class name) */
  hoverTextColor?: string;
  /** Optional function to render action buttons */
  renderActions?: (item: T) => ReactNode;
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional empty state message */
  emptyMessage?: string;
}
