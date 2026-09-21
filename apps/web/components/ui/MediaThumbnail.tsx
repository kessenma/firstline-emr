// apps/web/components/ui/MediaThumbnail.tsx
// Reusable media thumbnail for web — mirrors the mobile MediaThumbnail pattern.
"use client";

import React, { memo, useState } from "react";
import Image from "next/image";
import { Play, ImageOff, FileText, Music, File } from "lucide-react";
import type { MediaItem } from "@fajr/shared/media";
import { cn } from "@/lib/utils";

interface MediaThumbnailProps {
  item: MediaItem;
  onPress?: () => void;
  isSelected?: boolean;
  className?: string;
}

const MediaThumbnailComponent: React.FC<MediaThumbnailProps> = ({
  item,
  onPress,
  isSelected = false,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const type = item.type || "image";

  const containerClasses = cn(
    "relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all",
    "bg-muted",
    isSelected && "ring-2 ring-primary",
    className,
  );

  // Error or missing URI
  if (hasError || !item.uri) {
    return (
      <div className={containerClasses} onClick={onPress}>
        <div className="flex items-center justify-center w-full h-full">
          <ImageOff className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // PDF / file: show document icon
  if (type === "pdf" || type === "file") {
    return (
      <div className={containerClasses} onClick={onPress}>
        <div className="flex flex-col items-center justify-center w-full h-full gap-1">
          {type === "pdf" ? (
            <FileText className="w-7 h-7 text-primary" />
          ) : (
            <File className="w-7 h-7 text-primary" />
          )}
          {item.caption && (
            <span className="text-[9px] text-muted-foreground font-medium truncate max-w-full px-1">
              {item.caption}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Audio: show music icon
  if (type === "audio") {
    return (
      <div className={containerClasses} onClick={onPress}>
        <div className="flex flex-col items-center justify-center w-full h-full gap-1">
          <Music className="w-7 h-7 text-primary" />
          {item.caption && (
            <span className="text-[9px] text-muted-foreground font-medium truncate max-w-full px-1">
              {item.caption}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Image or video
  return (
    <div className={containerClasses} onClick={onPress}>
      <Image
        src={item.uri}
        alt={item.caption || "Media"}
        fill
        className="object-cover transition-transform"
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Video play overlay */}
      {type === "video" && !isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
            <Play className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-muted/0 group-hover:bg-muted/10 transition-colors duration-200" />
    </div>
  );
};

export const MediaThumbnail = memo(MediaThumbnailComponent);
export default MediaThumbnail;
