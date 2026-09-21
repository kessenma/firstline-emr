// apps/web/components/ui/MediaGrid.tsx
// Reusable CSS grid for displaying media thumbnails — mirrors the mobile MediaGrid pattern.
"use client";

import React from "react";
import { ImageOff } from "lucide-react";
import type { MediaItem } from "@fajr/shared/media";
import { MediaThumbnail } from "./MediaThumbnail";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  items: MediaItem[];
  onItemPress?: (index: number) => void;
  columns?: number;
  isLoading?: boolean;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  /** Optional header rendered above the grid (e.g. filter chips) */
  ListHeaderComponent?: React.ReactNode;
}

const SKELETON_COUNT = 6;

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  onItemPress,
  columns,
  isLoading = false,
  emptyText = "No media found",
  emptyIcon,
  className,
  ListHeaderComponent,
}) => {
  const gridColsClass = columns
    ? `grid-cols-${columns}`
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  // Loading skeleton
  if (isLoading && items.length === 0) {
    return (
      <div className={cn("flex-1", className)}>
        {ListHeaderComponent}
        <div className={cn("grid gap-3", gridColsClass)}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className={cn("flex-1", className)}>
        {ListHeaderComponent}
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          {emptyIcon || <ImageOff className="w-12 h-12 mb-2 opacity-20" />}
          <p className="text-sm">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1", className)}>
      {ListHeaderComponent}
      <div className={cn("grid gap-3", gridColsClass)}>
        {items.map((item, index) => (
          <MediaThumbnail
            key={item.id}
            item={item}
            onPress={() => onItemPress?.(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default MediaGrid;
