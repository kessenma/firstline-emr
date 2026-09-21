"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullScreenMediaViewProps {
    media?: { url: string; type?: "image" | "video" | "pdf" } | null; // Handles null to avoid crashes
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    hasMultiple?: boolean;
    currentIndex?: number;
    totalItems?: number;
}

const FullScreenMediaView: React.FC<FullScreenMediaViewProps> = ({
                                                                     media,
                                                                     onClose,
                                                                     onPrev,
                                                                     onNext,
                                                                     hasMultiple = false,
                                                                     currentIndex = 1,
                                                                     totalItems = 1,
                                                                 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft" && hasMultiple) onPrev();
            if (e.key === "ArrowRight" && hasMultiple) onNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden"; // Prevent scrolling

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "auto"; // Restore scrolling
        };
    }, [onClose, onPrev, onNext, hasMultiple]);

    // Handle swipe gestures
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) {
            onNext();
        } else if (isRightSwipe) {
            onPrev();
        }
    };

    // Prevent closing when clicking inside the media
    const handleContainerClick = (e: React.MouseEvent) => {
        if (e.target === containerRef.current) {
            onClose();
        }
    };

    const handleDownload = () => {
        if (!media) return;
        const link = document.createElement("a");
        link.href = media.url;
        link.download = `media-${currentIndex}.${media.type === "video" ? "mp4" : media.type === "pdf" ? "pdf" : "jpg"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!media) return null; // Avoid rendering if no media is available

    const isVideo = media.type === "video";
    const isPdf = media.type === "pdf";

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-muted/90 flex items-center justify-center"
                onClick={handleContainerClick}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 text-foreground p-2 rounded-full bg-muted/20 hover:bg-accent/40 transition-colors z-10"
                    onClick={onClose}
                >
                    <X size={24} />
                </button>

                {/* Navigation buttons */}
                {hasMultiple && (
                    <>
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground p-2 rounded-full bg-muted/20 hover:bg-accent/40 transition-colors z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPrev();
                            }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground p-2 rounded-full bg-muted/20 hover:bg-accent/40 transition-colors z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNext();
                            }}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                {/* Media Container */}
                <motion.div
                    className={`relative ${isPdf ? "w-[90vw] h-[90vh]" : "max-w-[90vw] max-h-[90vh]"}`}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
                >
                    {isVideo ? (
                        // Video player
                        <video
                            src={media.url}
                            controls
                            autoPlay
                            className="max-h-[90vh] max-w-[90vw]"
                        />
                    ) : isPdf ? (
                        // PDF viewer
                        <iframe
                            src={media.url}
                            className="w-full h-full border-0 rounded-lg bg-white"
                            title="PDF Document"
                        />
                    ) : (
                        // Image with zoom support
                        <TransformWrapper initialScale={1} minScale={0.5} maxScale={4}>
                            {({ zoomIn, zoomOut, resetTransform }) => (
                                <>
                                    {/* Zoom controls */}
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-muted/60 backdrop-blur rounded-full px-2 py-1">
                                        <button className="p-1.5 hover:bg-accent/30 rounded-full transition-colors" onClick={() => zoomOut()}>
                                            <ZoomOut size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-accent/30 rounded-full transition-colors" onClick={() => resetTransform()}>
                                            <RotateCw size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-accent/30 rounded-full transition-colors" onClick={() => zoomIn()}>
                                            <ZoomIn size={16} />
                                        </button>
                                    </div>
                                    <TransformComponent>
                                        <Image
                                            src={media.url || "/placeholder.svg"}
                                            alt="Full size"
                                            width={1200}
                                            height={800}
                                            style={{ objectFit: "contain", maxHeight: "90vh", maxWidth: "90vw" }}
                                        />
                                    </TransformComponent>
                                </>
                            )}
                        </TransformWrapper>
                    )}
                </motion.div>

                {/* Bottom Toolbar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-muted/60 text-foreground px-4 py-2 rounded-full">
                    {hasMultiple && (
                        <span className="text-sm">
                            {currentIndex} / {totalItems}
                        </span>
                    )}
                    <button
                        className="p-2 hover:bg-accent/30 rounded-full transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                    >
                        <Download size={18} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FullScreenMediaView;
