"use client";

// apps/web/components/ui/MediaViewer.tsx
//
// The shared full-screen media viewer. One component handles every media kind
// the app stores — images, video, audio, PDFs — and, just as importantly, the
// kinds it cannot display.
//
// Undisplayable media is a first-class state here, not an afterthought. Storage
// holds plenty of files a browser will not paint: HEIC straight off an iPhone,
// TIFF scans, AVI clips, arbitrary documents. Pointing an <img> at those yields
// a silent broken-image icon that looks like a bug. This viewer names the
// reason and always offers a download instead.

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  FileQuestion,
  FileText,
  Music,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  resolveMediaType,
  isDisplayableInBrowser,
  getFileExtension,
  type MediaType,
} from "@fajr/shared/media";
import PdfViewer from "./pdfViewer";
import { Button } from "./button";

export interface ViewerMedia {
  /** Signed or public URL to the original file. */
  url: string;
  /** Display name. Falls back to the URL's last segment. */
  fileName?: string;
  /** MIME type when the caller knows it (object storage listings do). */
  mimeType?: string;
  /** Explicit type override; wins over mimeType and extension sniffing. */
  type?: MediaType | string;
  fileSize?: number;
}

interface MediaViewerProps {
  /** The item to show. `null` renders nothing — callers can pass state directly. */
  media: ViewerMedia | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasMultiple?: boolean;
  currentIndex?: number;
  totalItems?: number;
  /** Extra detail rendered under the media (metadata panels, owner info, …). */
  footer?: React.ReactNode;
  /**
   * Extra controls in the header, to the left of Download and Close.
   *
   * For destructive actions in particular — a Delete belongs next to the other
   * controls, not buried in the collapsible footer panel where it reads as
   * metadata.
   */
  headerActions?: React.ReactNode;
}

function displayName(media: ViewerMedia): string {
  if (media.fileName) return media.fileName;
  const path = media.url?.split("?")[0].split("#")[0] ?? "";
  return path.split("/").pop() || "File";
}

// ── Error boundary ───────────────────────────────────────────────────────────
// Without this, a throw anywhere in the viewer subtree unmounts the whole admin
// page and leaves the user on Next's "This page couldn't load" screen with no
// way back but a reload. Contained here, a failure costs them one dialog.

interface BoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[MediaViewer] render failed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="text-sm font-medium">
            Something went wrong displaying this file.
          </div>
          <Button variant="outline" onClick={this.props.onClose}>
            Close
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Fallback panel ───────────────────────────────────────────────────────────

function UnsupportedPanel({
  media,
  reason,
  onRetry,
}: {
  media: ViewerMedia;
  reason: "unsupported" | "failed";
  onRetry?: () => void;
}) {
  const ext = getFileExtension(media.fileName || media.url);
  const name = displayName(media);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-card px-8 py-12 text-center max-w-md">
      <div className="rounded-full bg-muted p-4">
        {reason === "failed" ? (
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        ) : (
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="space-y-1">
        <div className="font-medium break-all">{name}</div>
        <p className="text-sm text-muted-foreground">
          {reason === "failed" ? (
            <>
              This file couldn&apos;t be loaded. Its link may have expired —
              refreshing the page usually fixes that.
            </>
          ) : ext ? (
            <>
              <span className="font-mono uppercase">{ext}</span> files can&apos;t
              be previewed in the browser. Download it to open in another app.
            </>
          ) : (
            <>This file type can&apos;t be previewed in the browser.</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {reason === "failed" && onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button asChild variant="outline" className="gap-2">
          <a href={media.url} download={name}>
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <a href={media.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </Button>
      </div>
    </div>
  );
}

// ── Per-type bodies ──────────────────────────────────────────────────────────

function ImageBody({
  media,
  onFailed,
}: {
  media: ViewerMedia;
  onFailed: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <>
          <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/80 px-2 py-1 backdrop-blur">
            <button
              className="rounded-full p-1.5 transition-colors hover:bg-accent"
              onClick={() => zoomOut()}
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              className="rounded-full p-1.5 transition-colors hover:bg-accent"
              onClick={() => resetTransform()}
              aria-label="Reset zoom"
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="rounded-full p-1.5 transition-colors hover:bg-accent"
              onClick={() => zoomIn()}
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {!loaded && (
            <Loader2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}

          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full flex items-center justify-center"
          >
            {/* Signed URLs are short-lived and host-varying, so Next's image
                optimizer is bypassed — it would cache a URL that expires. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt={displayName(media)}
              onLoad={() => setLoaded(true)}
              onError={onFailed}
              className={`max-h-full max-w-full object-contain transition-opacity ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}

function VideoBody({
  media,
  onFailed,
}: {
  media: ViewerMedia;
  onFailed: () => void;
}) {
  return (
    <video
      src={media.url}
      controls
      autoPlay
      onError={onFailed}
      className="max-h-full max-w-full rounded-lg bg-black"
    />
  );
}

function AudioBody({
  media,
  onFailed,
}: {
  media: ViewerMedia;
  onFailed: () => void;
}) {
  return (
    <div className="flex w-[min(90vw,32rem)] flex-col items-center gap-4 rounded-lg bg-card p-8">
      <div className="rounded-full bg-muted p-4">
        <Music className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="max-w-full break-all text-center text-sm font-medium">
        {displayName(media)}
      </div>
      <audio src={media.url} controls autoPlay onError={onFailed} className="w-full" />
    </div>
  );
}

function PdfBody({ media }: { media: ViewerMedia }) {
  return (
    <div className="h-full w-[min(92vw,72rem)]">
      <PdfViewer
        src={media.url}
        title={displayName(media)}
        className="h-full"
        onDownload={() => window.open(media.url, "_blank", "noopener,noreferrer")}
      />
    </div>
  );
}

// ── Viewer ───────────────────────────────────────────────────────────────────

export function MediaViewer({
  media,
  onClose,
  onPrev,
  onNext,
  hasMultiple = false,
  currentIndex,
  totalItems,
  footer,
  headerActions,
}: MediaViewerProps) {
  // Tracks load failures (expired signed URL, corrupt file) separately from
  // "we never supported this type" — the two need different explanations.
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [mounted, setMounted] = useState(false);
  // The detail panel overlays the media, so it is collapsible — open by default
  // because identifying a file is usually why the viewer was opened at all.
  const [footerOpen, setFooterOpen] = useState(true);

  useEffect(() => setMounted(true), []);

  // Reset failure state when the item changes, otherwise one bad file would
  // poison every subsequent item in a gallery.
  const mediaKey = media?.url ?? null;
  useEffect(() => {
    setFailed(false);
    setRetryToken(0);
  }, [mediaKey]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) onPrev?.();
      if (e.key === "ArrowRight" && hasMultiple) onNext?.();
    },
    [onClose, onPrev, onNext, hasMultiple],
  );

  useEffect(() => {
    if (!media) return;
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [media, handleKeyDown]);

  if (!media || !mounted) return null;

  const type = resolveMediaType({
    type: media.type,
    mimeType: media.mimeType,
    url: media.url,
    fileName: media.fileName,
  });
  const displayable =
    Boolean(media.url) &&
    isDisplayableInBrowser(type, media.fileName || media.url);

  const body = (() => {
    if (failed) {
      return (
        <UnsupportedPanel
          media={media}
          reason="failed"
          onRetry={() => {
            setFailed(false);
            setRetryToken((t) => t + 1);
          }}
        />
      );
    }
    if (!displayable) {
      return <UnsupportedPanel media={media} reason="unsupported" />;
    }
    switch (type) {
      case "image":
        return (
          <ImageBody
            key={retryToken}
            media={media}
            onFailed={() => setFailed(true)}
          />
        );
      case "video":
        return (
          <VideoBody
            key={retryToken}
            media={media}
            onFailed={() => setFailed(true)}
          />
        );
      case "audio":
        return (
          <AudioBody
            key={retryToken}
            media={media}
            onFailed={() => setFailed(true)}
          />
        );
      case "pdf":
        return <PdfBody key={retryToken} media={media} />;
      default:
        return <UnsupportedPanel media={media} reason="unsupported" />;
    }
  })();

  // Portalled to <body> so the overlay is never clipped or z-index-trapped by
  // whatever container the gallery happens to live in.
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Column layout rather than absolute-positioned children: the metadata
        // footer can be tall, and overlaying it would crop the media behind it.
        className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm"
        onClick={(e) => {
          // Only a click on the backdrop itself closes; clicks that bubble up
          // from the media or its controls must not.
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={displayName(media)}
      >
        {/* Header */}
        <div className="z-20 flex shrink-0 items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {displayName(media)}
            </div>
            {typeof currentIndex === "number" &&
              typeof totalItems === "number" &&
              totalItems > 1 && (
                <div className="text-xs text-muted-foreground">
                  {currentIndex} of {totalItems}
                </div>
              )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <a
              href={media.url}
              download={displayName(media)}
              className="rounded-full p-2 transition-colors hover:bg-accent"
              aria-label="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={18} />
            </a>
            <button
              className="rounded-full p-2 transition-colors hover:bg-accent"
              onClick={onClose}
              aria-label="Close viewer"
              autoFocus
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Prev / next */}
        {hasMultiple && (
          <>
            <button
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 transition-colors hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onPrev?.();
              }}
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 transition-colors hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Body — min-h-0 lets this flex child actually shrink rather than
            overflowing the column. The detail panel overlays it. */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <ViewerErrorBoundary onClose={onClose}>{body}</ViewerErrorBoundary>

          {footer && (
            <div
              className="absolute inset-x-0 bottom-0 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {footerOpen ? (
                <div className="max-h-[30vh] overflow-y-auto border-t border-border bg-background/95 backdrop-blur">
                  <div className="flex items-start gap-2 p-4">
                    <div className="min-w-0 flex-1">{footer}</div>
                    <button
                      className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent"
                      onClick={() => setFooterOpen(false)}
                      aria-label="Hide file details"
                      aria-expanded={true}
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end p-3">
                  <button
                    className="flex items-center gap-1 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs backdrop-blur transition-colors hover:bg-accent"
                    onClick={() => setFooterOpen(true)}
                    aria-label="Show file details"
                    aria-expanded={false}
                  >
                    <Info size={14} />
                    <ChevronUp size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default MediaViewer;
