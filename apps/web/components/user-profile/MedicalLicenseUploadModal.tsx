// apps/web/components/user-profile/MedicalLicenseUploadModal.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MedicalLicenseUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onUploadSuccess?: () => void;
}

export const MedicalLicenseUploadModal: React.FC<
  MedicalLicenseUploadModalProps
> = ({ isOpen, onClose, userId, userName, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    onDrop: (files) => {
      if (files.length > 0) {
        const file = files[0];

        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/jpg",
        ];
        if (!allowedTypes.includes(file.type)) {
          setUploadError("Please upload a PDF, PNG, or JPG file.");
          return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          setUploadError("File size too large. Maximum size is 10MB.");
          return;
        }

        setSelectedFile(file);
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

  const handleUpload = async () => {
    if (!selectedFile || !selectedSpecialty) {
      setUploadError("Please select both a file and a specialty");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Extract first and last name from userName
      const nameParts = userName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("specialty", selectedSpecialty);
      formData.append("userId", userId);

      const response = await fetch("/api/upload-license", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload license");
      }

      setUploadSuccess(true);

      // Call success callback after a short delay
      setTimeout(() => {
        onUploadSuccess?.();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload license",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedSpecialty("");
    setUploadSuccess(false);
    setUploadError(null);
    onClose();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Upload Medical License</span>
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
            Upload your medical license for {userName}. Accepted formats: PDF,
            PNG, JPG (max 10MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Success State */}
          {uploadSuccess && (
            <div className="flex flex-col items-center justify-center p-8 bg-success/10 rounded-lg">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <p className="text-lg font-medium text-success">
                License Uploaded Successfully!
              </p>
              <p className="text-sm text-success/80 mt-2">Redirecting...</p>
            </div>
          )}

          {/* Upload Form */}
          {!uploadSuccess && (
            <>
              {/* Specialty Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Specialty *
                </label>
                <Select
                  value={selectedSpecialty}
                  onValueChange={setSelectedSpecialty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DoctorSpecialtyList).map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload Area */}
              {!selectedFile ? (
                <div
                  {...safeRootProps}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80",
                  )}
                >
                  <input {...safeInputProps} />
                  {isDragActive ? (
                    <div className="text-center text-primary">
                      <Upload className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">
                        Drop your license here
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="rounded-full bg-muted p-4 mb-4 mx-auto w-fit">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-foreground mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PDF, PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-success/10">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {selectedFile.type === "application/pdf" ? (
                        <FileText className="h-12 w-12 text-success" />
                      ) : (
                        <div className="h-12 w-12">
                          <Image
                            src={URL.createObjectURL(selectedFile)}
                            alt="License preview"
                            width={48}
                            height={48}
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success">
                        File Selected
                      </p>
                      <p className="text-xs text-success/80 mt-1">
                        {selectedFile.type === "application/pdf"
                          ? "PDF Document"
                          : "Image File"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedFile.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedSpecialty || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload License
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
