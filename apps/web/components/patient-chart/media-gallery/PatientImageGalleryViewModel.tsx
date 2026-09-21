// apps/web/components/patient-chart/media-gallery/PatientImageGalleryViewModel.tsx
"use client";

import { useEffect, useState } from "react";
import { usePatientDashboard } from "../PatientViewModelContext";
import { getMediaUrl, getMediaUrls, invalidateMediaUrl } from "@/lib/media";
import { inferMediaTypeFromUrl, inferMediaTypeFromMime } from "@fajr/shared/media";
import type { MediaType } from "@fajr/shared/media";

export interface PatientImageGalleryViewModelProps {
    patientId: string;
}

export interface UploadingPhoto {
    id: string;
    file: File;
    preview: string;
    progress: number;
    status: "pending" | "uploading" | "complete" | "error";
    error?: string;
}

function getMediaType(url: string): "image" | "pdf" {
    const type = inferMediaTypeFromUrl(url);
    return type === 'pdf' ? 'pdf' : 'image';
}

/** A photo resolved to a signed URL and ready to render. */
export interface GalleryPhoto {
    /** The `patient_media` row id — what DELETE addresses. Never a render index. */
    id: string;
    /** Storage key, kept so the URL cache can be invalidated after a delete. */
    filePath: string;
    url: string;
    mediaType: "image" | "pdf";
    source?: string | null;
}

export const usePatientImageGalleryViewModel = ({ patientId }: PatientImageGalleryViewModelProps) => {
    const { photos, setPatientPhotos } = usePatientDashboard();
    const [directPhotos, setDirectPhotos] = useState<GalleryPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch signed URLs for existing photos
    useEffect(() => {
        if (!photos || photos.length === 0) return;

        const fetchSignedUrls = async () => {
            setIsLoading(true);
            try {
                const signedPhotos = await Promise.all(
                    photos.map(async (photo) => {
                        const signedUrl = await getMediaUrl(photo.url);
                        if (signedUrl) {
                            const mediaType = photo.contentType === "application/pdf" ? "pdf" as const : getMediaType(photo.url);
                            return {
                                id: photo.id,
                                filePath: photo.url,
                                url: signedUrl,
                                mediaType,
                                source: photo.source,
                            };
                        }
                        return null;
                    })
                );

                setDirectPhotos(signedPhotos.filter((p): p is NonNullable<typeof p> => p !== null));
            } catch (error) {
                console.error("Error fetching signed URLs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSignedUrls();
    }, [photos, patientId]);

    // Handle file selection (manual & drag-drop)
    const handleFilesSelected = (files: File[]) => {
        const newUploadingPhotos = files.map((file) => ({
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: "pending" as const,
        }));

        setUploadingPhotos((prev) => [...prev, ...newUploadingPhotos]);
    };

    // Upload a single photo
    const uploadSinglePhoto = async (photo: UploadingPhoto): Promise<boolean> => {
        // Update status to uploading
        setUploadingPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: "uploading" } : p))
        );

        try {
            const formData = new FormData();
            formData.append("file", photo.file);

            const response = await fetch(`/api/patient/${patientId}/upload-photo`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to upload photo");

            const data = await response.json();

            // Add to patient photos
            setPatientPhotos((prev) => [
                ...prev,
                {
                    id: data.mediaId,
                    url: data.filePath,
                    uploadedAt: new Date(),
                    contentType: data.contentType,
                    source: "upload",
                },
            ]);

            // Update status to complete
            setUploadingPhotos((prev) =>
                prev.map((p) => (p.id === photo.id ? { ...p, status: "complete", progress: 100 } : p))
            );

            // Add to direct photos for immediate display. Keyed on the database
            // id, not the transient upload id — this row has to stay deletable
            // after the uploading entry is cleaned up below.
            setDirectPhotos((prev) => [
                ...prev,
                {
                    id: data.mediaId,
                    filePath: data.filePath,
                    url: data.signedUrl,
                    mediaType: getMediaType(data.filePath || photo.file.name),
                    source: "upload",
                },
            ]);

            // Remove from uploading photos after a delay
            setTimeout(() => {
                setUploadingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            }, 1000);

            return true;
        } catch (error) {
            console.error("Error uploading photo:", error);

            // Update status to error
            setUploadingPhotos((prev) =>
                prev.map((p) =>
                    p.id === photo.id
                        ? { ...p, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
                        : p
                )
            );

            return false;
        }
    };

    // Upload all photos sequentially
    const uploadPhotos = async () => {
        if (uploadingPhotos.length === 0 || isUploading) return;

        setIsUploading(true);

        const pendingPhotos = uploadingPhotos.filter(p => p.status === "pending");

        for (const photo of pendingPhotos) {
            await uploadSinglePhoto(photo);

            // Simulate progress updates for better UX
            for (let progress = 0; progress <= 100; progress += 10) {
                setUploadingPhotos((prev) =>
                    prev.map((p) =>
                        p.id === photo.id && p.status === "uploading"
                            ? { ...p, progress }
                            : p
                    )
                );

                if (progress < 100) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        setIsUploading(false);
    };

    // Clear all pending uploads
    const clearPendingUploads = () => {
        // Only clear photos that aren't currently uploading
        setUploadingPhotos(prev => prev.filter(p => p.status === "uploading"));
    };

    // Drop one not-yet-uploaded file from the queue.
    const removePendingUpload = (uploadId: string) => {
        setUploadingPhotos((prev) => {
            const target = prev.find((p) => p.id === uploadId);
            if (target) URL.revokeObjectURL(target.preview);
            return prev.filter((p) => p.id !== uploadId);
        });
    };

    /**
     * Permanently delete a saved photo: the row, the object, and its thumbnail.
     *
     * `mediaId` is the `patient_media` id. The gallery used to key photos on
     * their render index, which is why deletion was not possible before.
     */
    const deletePhoto = async (mediaId: string): Promise<boolean> => {
        const target = directPhotos.find((photo) => photo.id === mediaId);

        try {
            const response = await fetch(
                `/api/patient/${patientId}/media/${mediaId}`,
                { method: "DELETE" },
            );
            if (!response.ok) throw new Error("Failed to delete photo");

            // Otherwise the 45-minute signed-URL cache keeps serving a key that
            // no longer exists.
            if (target) invalidateMediaUrl(target.filePath);

            setDirectPhotos((prev) => prev.filter((photo) => photo.id !== mediaId));
            setPatientPhotos((prev) => prev.filter((photo) => photo.id !== mediaId));
            return true;
        } catch (error) {
            console.error("Error deleting photo:", error);
            return false;
        }
    };

    // Retry failed uploads
    const retryFailedUpload = (photoId: string) => {
        setUploadingPhotos(prev =>
            prev.map(p => p.id === photoId ? { ...p, status: "pending", progress: 0, error: undefined } : p)
        );
    };

    return {
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
    };
};
