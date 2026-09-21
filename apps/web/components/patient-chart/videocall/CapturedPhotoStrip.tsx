// apps/web/components/patient-chart/videocall/CapturedPhotoStrip.tsx
//
// Thumbnails of what has been captured on this call, overlaid on the video.
//
// The point is review while the patient is still on the line: a still of a
// wound is either usable or it isn't, and finding out after the consult ends
// means the photo cannot be retaken. Deleting here and asking for another shot
// is the whole workflow.
"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { MediaViewer } from "@/components/ui/MediaViewer";
import type { CapturedPhoto } from "@fajr/shared/video-call";

interface CapturedPhotoStripProps {
  photos: CapturedPhoto[];
  onRemove: (mediaId: string) => Promise<void>;
}

const CapturedPhotoStrip: React.FC<CapturedPhotoStripProps> = ({
  photos,
  onRemove,
}) => {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  if (photos.length === 0) return null;

  // Clamp rather than trust: a delete can shrink the list while the viewer is
  // open on the last item.
  const active =
    viewerIndex === null
      ? null
      : (photos[Math.min(viewerIndex, photos.length - 1)] ?? null);

  const handleRemove = async (mediaId: string) => {
    setRemoving(mediaId);
    try {
      await onRemove(mediaId);
      // Close if that was the last one; otherwise the clamp above keeps the
      // viewer on a valid neighbour.
      if (photos.length <= 1) setViewerIndex(null);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
        <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-lg bg-black/60 p-2">
          <span className="shrink-0 px-1 text-xs text-white/80">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
          {photos.map((photo, index) => (
            <button
              key={photo.mediaId}
              type="button"
              onClick={() => setViewerIndex(index)}
              className="h-12 w-12 shrink-0 overflow-hidden rounded border border-white/40 transition hover:border-white"
              aria-label={`Review photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <MediaViewer
        media={
          active
            ? { url: active.url, fileName: "Video consult photo", mimeType: "image/jpeg" }
            : null
        }
        onClose={() => setViewerIndex(null)}
        hasMultiple={photos.length > 1}
        currentIndex={
          viewerIndex === null ? undefined : Math.min(viewerIndex, photos.length - 1) + 1
        }
        totalItems={photos.length}
        onPrev={() =>
          setViewerIndex((i) => (i === null ? null : Math.max(0, i - 1)))
        }
        onNext={() =>
          setViewerIndex((i) =>
            i === null ? null : Math.min(photos.length - 1, i + 1),
          )
        }
        headerActions={
          active ? (
            <button
              type="button"
              onClick={() => void handleRemove(active.mediaId)}
              disabled={removing === active.mediaId}
              className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              aria-label="Delete photo"
              title="Delete this photo from the chart"
            >
              <Trash2 size={18} />
            </button>
          ) : null
        }
      />
    </>
  );
};

export default CapturedPhotoStrip;
