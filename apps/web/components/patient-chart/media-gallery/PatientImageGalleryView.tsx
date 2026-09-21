// apps/web/components/patient-chart/media-gallery/PatientImageGalleryView.tsx
"use client";

import React, { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { usePatientImageGalleryViewModel, UploadingPhoto } from "./PatientImageGalleryViewModel";
import { useDropzone } from "react-dropzone";
import { MediaViewer } from "@/components/ui/MediaViewer";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Maximize2, Upload, X, AlertCircle, RefreshCw, ImageIcon, FileText, Trash2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MediaGrid } from "@/components/ui/MediaGrid";
import type { MediaItem } from "@fajr/shared/media";

interface PatientImageGalleryViewProps {
    patientId: string;
}

const PatientImageGalleryView: React.FC<PatientImageGalleryViewProps> = ({ patientId }) => {
    const {
        directPhotos,
        setDirectPhotos,
        isLoading,
        uploadingPhotos,
        isUploading,
        handleFilesSelected,
        uploadPhotos,
        clearPendingUploads,
        removePendingUpload,
        deletePhoto,
        retryFailedUpload
    } = usePatientImageGalleryViewModel({ patientId });

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<{ url: string; type?: "image" | "video" | "pdf" } | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [uploadingPhotosState, setUploadingPhotos] = useState<UploadingPhoto[]>(uploadingPhotos);

    const openFullScreen = (photo: { url: string; mediaType?: "image" | "pdf" }, index: number) => {
        setSelectedMedia({ url: photo.url, type: photo.mediaType || "image" });
        setCurrentPhotoIndex(index);
        setIsFullScreen(true);
    };

    const closeFullScreen = () => {
        setSelectedMedia(null);
        setIsFullScreen(false);
    };

    const goToNextPhoto = () => {
        if (directPhotos.length <= 1) return;
        const nextIndex = (currentPhotoIndex + 1) % directPhotos.length;
        const next = directPhotos[nextIndex];
        setSelectedMedia({ url: next.url, type: next.mediaType || "image" });
        setCurrentPhotoIndex(nextIndex);
    };

    const goToPrevPhoto = () => {
        if (directPhotos.length <= 1) return;
        const prevIndex = (currentPhotoIndex - 1 + directPhotos.length) % directPhotos.length;
        const prev = directPhotos[prevIndex];
        setSelectedMedia({ url: prev.url, type: prev.mediaType || "image" });
        setCurrentPhotoIndex(prevIndex);
    };


    // Permanently delete a saved photo. Confirmed first — this removes the file
    // from the patient's record, not just from this view.
    const [deleting, setDeleting] = useState(false);
    const handleDeleteSaved = async () => {
        const photo = directPhotos[currentPhotoIndex];
        if (!photo) return;
        if (
            !window.confirm(
                "Delete this photo from the patient chart? This cannot be undone.",
            )
        ) {
            return;
        }

        setDeleting(true);
        const ok = await deletePhoto(photo.id);
        setDeleting(false);

        if (!ok) {
            window.alert("Could not delete the photo. Please try again.");
            return;
        }

        // The list just shrank; step back rather than leaving the viewer on an
        // index that no longer exists.
        if (directPhotos.length <= 1) {
            closeFullScreen();
        } else {
            const nextIndex = Math.min(currentPhotoIndex, directPhotos.length - 2);
            const next = directPhotos.filter((p) => p.id !== photo.id)[nextIndex];
            setSelectedMedia({ url: next.url, type: next.mediaType || "image" });
            setCurrentPhotoIndex(nextIndex);
        }
    };

    // Drag and Drop File Upload
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        accept: { "image/*": [], "application/pdf": [".pdf"] },
        onDrop: handleFilesSelected,
        noClick: uploadingPhotos.length > 0, // Disable click when there are uploads in progress
    });

    const rootProps = getRootProps() as React.HTMLAttributes<HTMLDivElement>;
    const { style: _rootStyle, ...safeRootProps } = rootProps as any;
    const inputProps = getInputProps() as React.InputHTMLAttributes<HTMLInputElement>;
    const { style: _inputStyle, ...safeInputProps } = inputProps as any;

    const hasPendingUploads = uploadingPhotos.some(p => p.status === "pending");

    // Map directPhotos to MediaItem[] for the reusable MediaGrid
    const mediaItems: MediaItem[] = useMemo(
        () => directPhotos.map((photo) => ({
            id: photo.id,
            uri: photo.url,
            type: photo.mediaType === "pdf" ? "pdf" as const : "image" as const,
        })),
        [directPhotos],
    );

    return (
        <div className="bg-card rounded-xl shadow-md p-6 mt-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Patient Media</h2>

                {uploadingPhotos.length > 0 && (
                    <div className="flex gap-2">
                        {hasPendingUploads && (
                            <Button
                                onClick={uploadPhotos}
                                disabled={isUploading}
                                variant="default"
                                size="sm"
                                className="gap-1"
                            >
                                <Upload className="h-4 w-4" />
                                Upload All
                            </Button>
                        )}

                        {!isUploading && (
                            <Button
                                onClick={clearPendingUploads}
                                variant="outline"
                                size="sm"
                                className="gap-1"
                            >
                                <Trash2 className="h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Gallery of uploaded photos */}
            {uploadingPhotos.length === 0 || directPhotos.length > 0 ? (
                <MediaGrid
                    items={mediaItems}
                    onItemPress={(index) => openFullScreen(directPhotos[index], index)}
                    isLoading={isLoading}
                    emptyText="No files uploaded yet"
                />
            ) : null}

            {/* Uploading photos section */}
            <AnimatePresence>
                {uploadingPhotos.length > 0 && (
                    <motion.div
                        className="mt-6"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-muted px-4 py-2 border-b border-border">
                                <h3 className="font-medium text-sm">Uploads</h3>
                            </div>
                            <div className="divide-y">
                                <AnimatePresence>
                                    {uploadingPhotos.map((photo) => (
                                        <motion.div
                                            key={photo.id}
                                            className="flex items-center gap-3 p-3"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, padding: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="h-12 w-12 relative rounded overflow-hidden shrink-0">
                                                {photo.file.type === "application/pdf" ? (
                                                    <div className="flex items-center justify-center w-full h-full bg-muted">
                                                        <FileText className="h-6 w-6 text-primary" />
                                                    </div>
                                                ) : (
                                                    <Image
                                                        src={photo.preview || "/placeholder.svg"}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{photo.file.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {photo.status === "error" ? (
                                                        <div className="flex items-center text-destructive text-xs gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            <span>{photo.error || "Upload failed"}</span>
                                                        </div>
                                                    ) : (
                                                        <Progress
                                                            value={photo.progress}
                                                            className={cn(
                                                                "h-1.5 w-full max-w-24",
                                                                photo.status === "complete" ? "bg-muted" : "bg-muted"
                                                            )}
                                                            indicatorClassName={
                                                                photo.status === "complete" ? "bg-success" : undefined
                                                            }
                                                        />
                                                    )}
                                                    <span className="text-xs text-muted-foreground">
                            {photo.status === "complete"
                                ? "Complete"
                                : photo.status === "uploading"
                                    ? `${photo.progress}%`
                                    : photo.status === "error"
                                        ? "Failed"
                                        : "Pending"}
                          </span>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {photo.status === "error" ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => retryFailedUpload(photo.id)}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                ) : photo.status === "pending" ? (
                                                    // Drops the file from the
                                                    // upload queue. It was
                                                    // previously filtering the
                                                    // *saved* photo list by an
                                                    // upload id, so it never
                                                    // matched anything.
                                                    <button
                                                        className="rounded-full bg-muted/50 p-1 text-foreground transition-colors hover:bg-muted"
                                                        aria-label="Remove from upload queue"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removePendingUpload(photo.id);
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag & Drop Upload Box */}
            <motion.div
                className="mt-6"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{ delay: 0.2 }}
            >
                <div
                    {...safeRootProps}
                    className={cn(
                        "border-2 border-dashed rounded-lg transition-all duration-200 overflow-hidden",
                        isDragActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted hover:border-border",
                        uploadingPhotos.length > 0 ? "p-4" : "p-8"
                    )}
                >
                    <input {...safeInputProps} />

                    <motion.div
                        className="flex flex-col items-center justify-center text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {isDragActive ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-primary"
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2 opacity-70" />
                                <p className="text-sm font-medium">Drop files here</p>
                            </motion.div>
                        ) : (
                            <>
                                <div
                                    className={cn(
                                        "rounded-full bg-muted p-3 mb-3",
                                        uploadingPhotos.length > 0 ? "p-2 mb-2" : "p-3 mb-3"
                                    )}
                                >
                                    <Upload className={cn(
                                        "text-muted-foreground",
                                        uploadingPhotos.length > 0 ? "h-5 w-5" : "h-6 w-6"
                                    )} />
                                </div>
                                {uploadingPhotos.length > 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        <button
                                            type="button"
                                            className="text-primary font-medium hover:underline focus:outline-hidden"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                open();
                                            }}
                                        >
                                            Add more files
                                        </button>
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            Drag & drop files here
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            or <span className="text-primary">browse files</span>
                                        </p>
                                    </>
                                )}
                            </>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Full-Screen View */}
            {isFullScreen && selectedMedia && (
                <MediaViewer
                    media={selectedMedia}
                    onClose={closeFullScreen}
                    onPrev={goToPrevPhoto}
                    onNext={goToNextPhoto}
                    hasMultiple={directPhotos.length > 1}
                    currentIndex={currentPhotoIndex + 1}
                    totalItems={directPhotos.length}
                    headerActions={
                        <button
                            type="button"
                            onClick={() => void handleDeleteSaved()}
                            disabled={deleting}
                            className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            aria-label="Delete photo"
                            title="Delete this photo from the chart"
                        >
                            <Trash2 size={18} />
                        </button>
                    }
                />
            )}
        </div>
    );
};

export default PatientImageGalleryView;
