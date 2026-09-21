"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { motion } from "framer-motion";
import { Upload, RefreshCw, FileText, Trash2, CheckCircle, Maximize2, ZoomIn, ZoomOut, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useSignupContext } from "./container/SignupContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const MedicalLicenseUpload: React.FC = () => {
    const { 
        formData, 
        updateAnsweredQuestions, 
        setMedicalLicenseFormCompleted,
        addMedicalLicense,
        removeMedicalLicense,
        getMedicalLicenseForSpecialty,
        getRequiredSpecialties
    } = useSignupContext();

    const requiredSpecialties = getRequiredSpecialties();
    const isAllLicensesUploaded = requiredSpecialties.every(specialty => 
        getMedicalLicenseForSpecialty(specialty) !== undefined
    );

    // Handle file selection for a specific specialty
    const handleFilesSelected = (files: File[], specialty: string) => {
        if (files.length === 0) return;

        const file = files[0]; // Only allow one license file per specialty

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, PNG, or JPG file.');
            return;
        }

        // Directly add to context without uploading
        handleFileSelected(file, specialty);
    };

    // Handle file selection and immediately add to context (no upload yet)
    const handleFileSelected = (file: File, specialty: string) => {
        // Add the license to the context immediately
        addMedicalLicense(specialty, file);
        
        // Check if all licenses will be selected after this addition
        // We need to calculate the expected state since addMedicalLicense is async
        const currentLicenses = formData.medicalLicenses || [];
        const updatedLicenses = currentLicenses.filter(license => license.specialty !== specialty);
        updatedLicenses.push({ specialty, file, uploadedAt: new Date() });
        
        const allSelected = requiredSpecialties.every(reqSpecialty => 
            updatedLicenses.some(license => license.specialty === reqSpecialty)
        );

        if (allSelected) {
            updateAnsweredQuestions(4, 1); // Step 4, 1 for completed
            setMedicalLicenseFormCompleted(true);
        }
    };

    // Clear a specific license
    const clearLicense = (specialty: string) => {
        removeMedicalLicense(specialty);
        
        // Check if form is still complete after removal
        // Calculate the expected state since removeMedicalLicense is async
        const currentLicenses = formData.medicalLicenses || [];
        const updatedLicenses = currentLicenses.filter(license => license.specialty !== specialty);
        
        const allSelected = requiredSpecialties.every(reqSpecialty => 
            updatedLicenses.some(license => license.specialty === reqSpecialty)
        );

        if (!allSelected) {
            setMedicalLicenseFormCompleted(false);
            updateAnsweredQuestions(4, 0); // Step 4, 0 for incomplete
        }
    };

    // Change/replace a license file
    const changeLicense = (specialty: string) => {
        // Clear the existing license and trigger file picker
        clearLicense(specialty);
        // Trigger file picker after clearing
        setTimeout(() => {
            const input = document.querySelector(`input[type="file"]`) as HTMLInputElement;
            if (input) {
                input.click();
            }
        }, 100);
    };

    // State for preview modal
    const [previewFile, setPreviewFile] = useState<{ file: File; specialty: string } | null>(null);

    // Specialty Upload Component
    const SpecialtyUpload: React.FC<{ specialty: string }> = ({ specialty }) => {
        const existingLicense = getMedicalLicenseForSpecialty(specialty);

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            accept: {
                "application/pdf": [".pdf"],
                "image/png": [".png"],
                "image/jpeg": [".jpg", ".jpeg"]
            },
            onDrop: (files) => handleFilesSelected(files, specialty),
            maxFiles: 1,
            noClick: false, // Always allow clicking
        });

        const rootProps = getRootProps() as React.HTMLAttributes<HTMLDivElement>;
        const { style: _rootStyle, ...safeRootProps } = rootProps as any;
        const inputProps = getInputProps() as React.InputHTMLAttributes<HTMLInputElement>;
        const { style: _inputStyle, ...safeInputProps } = inputProps as any;

        return (
            <motion.div
                className="border rounded-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-medium text-sm text-foreground">{specialty}</h3>
                    {existingLicense && (
                        <CheckCircle className="h-5 w-5 text-success" />
                    )}
                </div>

                {/* Existing License Display */}
                {existingLicense ? (
                    <div className="p-4 bg-success/10">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                {existingLicense.type === 'application/pdf' ? (
                                    <FileText className="h-10 w-10 text-success" />
                                ) : (
                                    <div className="h-10 w-10">
                                        <Image
                                            src={URL.createObjectURL(existingLicense)}
                                            alt={`${specialty} License`}
                                            width={40}
                                            height={40}
                                            className="object-cover rounded w-auto h-auto"
                                            style={{ width: '40px', height: '40px' }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-success">
                                    License Selected
                                </p>
                                <p className="text-xs text-success/80 mt-1">
                                    {existingLicense.type === 'application/pdf' ? 'PDF Document' : 'Image File'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {existingLicense.name}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewFile({ file: existingLicense, specialty })}
                                    className="text-primary hover:text-primary/80"
                                    title="Preview license file"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => changeLicense(specialty)}
                                    className="text-primary hover:text-primary/80"
                                    title="Change license file"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => clearLicense(specialty)}
                                    className="text-destructive hover:text-destructive/80"
                                    title="Remove license file"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Upload Area */
                    <div
                        {...safeRootProps}
                        className={cn(
                            "p-6 border-2 border-dashed transition-all duration-200 cursor-pointer",
                            isDragActive
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary"
                        )}
                    >
                        <input {...safeInputProps} />

                        {isDragActive ? (
                            <div className="text-center text-primary">
                                <Upload className="h-6 w-6 mx-auto mb-2" />
                                <p className="text-sm font-medium">Drop your {specialty} license here</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="rounded-full bg-muted p-3 mb-3 mx-auto w-fit">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-foreground mb-1">
                                    Select {specialty} License
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PDF, PNG, JPG up to 10MB
                                </p>
                                <p className="text-xs text-primary mt-2">
                                    Files will be uploaded when you submit the form
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">Medical Licenses</h2>
                <p className="text-muted-foreground">
                    Upload your medical license{requiredSpecialties.length > 1 ? 's' : ''} for {requiredSpecialties.length > 1 ? 'each of your specialties' : 'your specialty'}.
                    Accepted formats: PDF, PNG, JPG
                </p>
                {requiredSpecialties.length > 1 && (
                    <p className="text-sm text-primary mt-2">
                        You have selected {requiredSpecialties.length} specialties, so you need to upload {requiredSpecialties.length} licenses.
                    </p>
                )}
            </div>

            {/* Progress Indicator */}
            {requiredSpecialties.length > 1 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Selection Progress</span>
                        <span className="text-sm text-primary/80">
                            {requiredSpecialties.filter(specialty => getMedicalLicenseForSpecialty(specialty)).length} of {requiredSpecialties.length} selected
                        </span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${(requiredSpecialties.filter(specialty => getMedicalLicenseForSpecialty(specialty)).length / requiredSpecialties.length) * 100}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Specialty Upload Sections */}
            <div className="space-y-4">
                {requiredSpecialties.map((specialty) => (
                    <SpecialtyUpload key={specialty} specialty={specialty} />
                ))}
            </div>

            {/* Completion Status */}
            {isAllLicensesUploaded && (
                <motion.div
                    className="flex items-center justify-center p-4 border-2 border-success/20 bg-success/5 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-success" />
                        <div>
                            <p className="text-sm font-medium text-success">
                                All Medical Licenses Uploaded
                            </p>
                            <p className="text-xs text-success/80 mt-1">
                                You can proceed to the next step
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Preview Modal */}
            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
                    {previewFile && (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b bg-muted">
                                <div>
                                    <h3 className="font-medium">{previewFile.specialty} License Preview</h3>
                                    <p className="text-sm text-muted-foreground">{previewFile.file.name}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewFile(null)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-4 bg-card">
                                {previewFile.file.type === 'application/pdf' ? (
                                    <iframe
                                        src={URL.createObjectURL(previewFile.file)}
                                        className="w-full h-[70vh] border-0 rounded-lg"
                                        title={`${previewFile.specialty} License Preview`}
                                    />
                                ) : (
                                    <TransformWrapper initialScale={1}>
                                        {({ zoomIn, zoomOut, resetTransform }) => (
                                            <div className="relative">
                                                <div className="absolute top-2 left-2 z-10 flex gap-2 bg-muted/90 rounded-md p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => zoomOut()}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ZoomOut className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => resetTransform()}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        Reset
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => zoomIn()}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ZoomIn className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <TransformComponent>
                                                    <Image
                                                        src={URL.createObjectURL(previewFile.file)}
                                                        alt={`${previewFile.specialty} License`}
                                                        width={800}
                                                        height={600}
                                                        className="max-w-full h-auto mx-auto"
                                                        style={{ maxHeight: '70vh', objectFit: 'contain' }}
                                                    />
                                                </TransformComponent>
                                            </div>
                                        )}
                                    </TransformWrapper>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MedicalLicenseUpload;
