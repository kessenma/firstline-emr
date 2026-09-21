"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent } from "./dialog";

interface PdfViewerProps {
  src: string;
  title?: string;
  className?: string;
  onDownload?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  src,
  title = "PDF Document",
  className = "",
  onDownload,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate PDF.js viewer URL with page parameter
  const getPdfUrl = (page: number = 1) => {
    const baseUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(src)}`;
    return `${baseUrl}#page=${page}&zoom=${Math.round(zoom * 100)}`;
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    // Try to get total pages from PDF.js viewer
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Listen for messages from PDF.js viewer
        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === "documentloaded") {
            setTotalPages(event.data.numPages || 0);
          }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
      }
    } catch (err) {
      console.warn("Could not access PDF.js viewer for page count");
    }
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError("Failed to load PDF document");
  };

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  // Rotation function
  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Update iframe src when page or zoom changes
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = getPdfUrl(currentPage);
    }
  }, [currentPage, zoom, src]);

  // Fallback: Use simple iframe if PDF.js is not available
  const SimplePdfViewer = () => (
    <div
      className={`overflow-hidden relative bg-muted rounded-lg ${className}`}
    >
      {isLoading && (
        <div className="flex absolute inset-0 z-10 justify-center items-center bg-background/75">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading PDF...</span>
        </div>
      )}

      {error && (
        <div className="flex absolute inset-0 z-10 justify-center items-center bg-background/75">
          <div className="text-center text-destructive">
            <p className="font-medium">Error loading PDF</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        title={title}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          transform: `rotate(${rotation}deg)`,
          minHeight: "400px",
        }}
      />
    </div>
  );

  const PdfViewerContent = () => (
    <div
      className={`flex overflow-hidden flex-col bg-card rounded-lg ${className}`}
    >
      {/* Toolbar */}
      <div className="flex justify-between items-center p-3 bg-muted border-b">
        <div className="flex items-center space-x-2">
          {/* Page Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="px-2 py-1 w-16 text-sm text-center rounded border"
              min="1"
              max={totalPages}
              disabled={isLoading}
            />
            <span className="text-sm text-muted-foreground">
              of {totalPages || "?"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages || isLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetZoom}
            className="px-3"
          >
            {Math.round(zoom * 100)}%
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={zoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          {/* Rotate */}
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* Download */}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="flex absolute inset-0 z-10 justify-center items-center bg-background/75">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className="flex absolute inset-0 z-10 justify-center items-center bg-background/75">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading PDF</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={getPdfUrl(currentPage)}
          className="w-full h-full border-0"
          title={title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            transform: `rotate(${rotation}deg)`,
            minHeight: isFullscreen ? "80vh" : "500px",
          }}
        />
      </div>
    </div>
  );

  // Render fullscreen dialog or normal viewer
  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <PdfViewerContent />
        </DialogContent>
      </Dialog>
    );
  }

  return <PdfViewerContent />;
};

export default PdfViewer;
