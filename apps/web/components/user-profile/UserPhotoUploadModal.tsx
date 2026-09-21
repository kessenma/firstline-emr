"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Camera,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import Tooltip from "@/components/form/Tooltip";
import { MediaViewer } from "@/components/ui/MediaViewer";

interface UserPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentPhotoUrl?: string | null;
  onUploadSuccess?: () => void;
}

type ViewMode = "upload" | "camera" | "crop";

const FILTERS = [
  { name: "Original", value: "none" },
  { name: "B&W", value: "grayscale(100%)" },
  { name: "Sepia", value: "sepia(100%)" },
  { name: "Vintage", value: "sepia(50%) contrast(120%) brightness(90%)" },
  { name: "Cool", value: "hue-rotate(180deg) saturate(150%)" }, // Adjusted for a better "cool" look if needed, but let's keep it simple
];

// Helper function to create the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  filter: string = "none",
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const rotRad = 0; // rotation not supported yet

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = {
    width: image.width,
    height: image.height,
  };

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Apply filter BEFORE drawing
  ctx.filter = filter;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // As Blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, "image/jpeg");
  });
}

export const UserPhotoUploadModal: React.FC<UserPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  currentPhotoUrl,
  onUploadSuccess,
}) => {
  const [view, setView] = useState<ViewMode>("upload");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("none");

  // Viewer states
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const resetState = () => {
    setView("upload");
    setImageSrc(null);
    setSelectedFile(null);
    setUploadSuccess(false);
    setUploadError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setFilter("none");
    stopCamera();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your profile photo?")) return;

    setIsDeleting(true);
    setUploadError(null);

    try {
      const response = await fetch("/api/user/delete-photo", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete photo");
      }

      onUploadSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Delete error:", error);
      setUploadError("Failed to delete photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- File Upload Logic ---
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    onDrop: (files) => {
      if (files.length > 0) {
        const file = files[0];
        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          setUploadError("Please upload a PNG, JPG, or WebP file.");
          return;
        }
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("File size too large. Maximum size is 5MB.");
          return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageSrc(reader.result?.toString() || null);
          setView("crop");
        });
        reader.readAsDataURL(file);
        setSelectedFile(file); // Keep original file just in case
        setUploadError(null);
      }
    },
    maxFiles: 1,
    noClick: false,
  });

  const rootProps = getRootProps() as React.HTMLAttributes<HTMLDivElement>;
  const { style: _rootStyle, ...safeRootProps } = rootProps as any;
  const inputProps = getInputProps() as React.InputHTMLAttributes<HTMLInputElement>;
  const { style: _inputStyle, ...safeInputProps } = inputProps as any;

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setView("camera");
      // Wait for state update then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setUploadError("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(dataUrl);
        stopCamera();
        setView("crop");
      }
    }
  };

  // --- Upload Logic ---
  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setUploadError("Please select and crop an image first");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, filter);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const formData = new FormData();
      // Use a generic name for cropped image
      formData.append("file", croppedBlob, "profile-photo.jpg");
      formData.append("userId", userId);

      const response = await fetch("/api/user/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }

      setUploadSuccess(true);
      setTimeout(() => {
        onUploadSuccess?.();
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
            {currentPhotoUrl && view === "upload" && (
                <div className="flex justify-center mb-4">
                    <Tooltip 
                        tooltipText="Click to view photo" 
                        showTooltip={showTooltip}
                    >
                        <div 
                            className="relative w-24 h-24 rounded-full overflow-hidden shadow-md border-2 border-border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setIsViewerOpen(true)}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <Image
                                src={currentPhotoUrl}
                                alt="Current Profile"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                    </Tooltip>
                </div>
            )}
          <DialogTitle className="flex items-center justify-between">
            <span>
                {view === "upload" && "Upload Profile Photo"}
                {view === "camera" && "Take Photo"}
                {view === "crop" && "Adjust Photo"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {view === "upload" && `Upload a new profile photo for ${userName}.`}
            {view === "camera" && "Position yourself in the center."}
            {view === "crop" && "Drag to reposition and use the slider to zoom."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Success State */}
          {uploadSuccess ? (
            <div className="flex flex-col items-center justify-center p-8 bg-success/10 rounded-lg">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <p className="text-lg font-medium text-success">
                Photo Uploaded Successfully!
              </p>
              <p className="text-sm text-success/80 mt-2">Updating profile...</p>
            </div>
          ) : (
            <>
              {/* VIEW: UPLOAD */}
              {view === "upload" && (
                <div className="space-y-4">
                    <div
                    {...safeRootProps}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[200px]",
                        isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80",
                    )}
                    >
                    <input {...safeInputProps} className="hidden" />
                    {isDragActive ? (
                        <div className="text-center text-primary">
                        <Upload className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">
                            Drop your photo here
                        </p>
                        </div>
                    ) : (
                        <div className="text-center">
                        <div className="rounded-full bg-muted p-4 mb-4 mx-auto w-fit">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-2">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground">
                            PNG, JPG, WebP up to 5MB
                        </p>
                        </div>
                    )}
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            Or
                            </span>
                        </div>
                    </div>

                    <Button 
                        variant="outline" 
                        className="w-full py-6"
                        onClick={startCamera}
                    >
                        <Camera className="mr-2 h-5 w-5" />
                        Take Photo with Camera
                    </Button>

                    {currentPhotoUrl && (
                        <Button
                            variant="ghost"
                            className="w-full py-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-5 w-5" />
                                    Delete Current Photo
                                </>
                            )}
                        </Button>
                    )}
                </div>
              )}

              {/* VIEW: CAMERA */}
              {view === "camera" && (
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
                        />
                    </div>
                    <div className="flex gap-4 w-full">
                        <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                                stopCamera();
                                setView("upload");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="flex-1"
                            onClick={capturePhoto}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            Capture
                        </Button>
                    </div>
                </div>
              )}

              {/* VIEW: CROP */}
              {view === "crop" && imageSrc && (
                <div className="space-y-6">
                    <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1} // Circular/Square profile picture
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            cropShape="round"
                            showGrid={false}
                            style={{
                                mediaStyle: { filter: filter }
                            }}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Zoom</span>
                                <span>{zoom.toFixed(1)}x</span>
                            </div>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(value) => setZoom(value[0])}
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm block">Filters</span>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.name}
                                        type="button"
                                        onClick={() => setFilter(f.value)}
                                        className={cn(
                                            "flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                                            filter === f.value 
                                                ? "bg-primary text-primary-foreground border-primary" 
                                                : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setView("upload");
                                setImageSrc(null);
                            }}
                            disabled={isUploading}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Start Over
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                                </>
                            ) : (
                                <>
                                <Upload className="mr-2 h-4 w-4" />
                                Save & Upload
                                </>
                            )}
                        </Button>
                    </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{uploadError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Full Screen Viewer */}
        {isViewerOpen && currentPhotoUrl && (
          <MediaViewer
            media={{ url: currentPhotoUrl, type: "image" }}
            onClose={() => setIsViewerOpen(false)}
            onPrev={() => {}}
            onNext={() => {}}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
