// apps/web/components/adminDashboard/MedicalLicenseModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import PdfViewer from "@/components/ui/pdfViewer";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface MedicalLicenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    licenseUrl?: string; // Keep for backward compatibility
    licenses?: Array<{
        specialty: string;
        signedUrl: string;
        uploadedAt?: Date;
        mimeType?: string; // File type for reliable rendering
    }>;
    userName?: string;
    isLoading?: boolean;
    error?: string | null;
}

export const MedicalLicenseModal: React.FC<MedicalLicenseModalProps> = ({
    isOpen,
    onClose,
    licenseUrl,
    licenses,
    userName,
    isLoading = false,
    error
}) => {
    // Use new licenses array if available, otherwise fall back to single license for backward compatibility
    const displayLicenses = licenses || (licenseUrl ? [{ specialty: 'General', signedUrl: licenseUrl, uploadedAt: undefined }] : []);
    
    // State for current license index when multiple licenses
    const [currentLicenseIndex, setCurrentLicenseIndex] = useState(0);
    
    // Get current license
    const currentLicense = displayLicenses[currentLicenseIndex];
    
    // Navigation functions
    const goToPrevious = () => {
        if (currentLicenseIndex > 0) {
            setCurrentLicenseIndex(currentLicenseIndex - 1);
        }
    };
    
    const goToNext = () => {
        if (currentLicenseIndex < displayLicenses.length - 1) {
            setCurrentLicenseIndex(currentLicenseIndex + 1);
        }
    };

    const handleDownload = (url: string, specialty: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${userName}_${specialty}_medical_license`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        displayLicenses.forEach((license, index) => {
            setTimeout(() => {
                handleDownload(license.signedUrl, license.specialty);
            }, index * 100); // Small delay between downloads
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="w-screen h-screen max-w-none max-h-none m-0 p-0 overflow-hidden"
                aria-describedby="medical-license-description"
            >
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center justify-between">
                        <div>
                            Medical License - {userName || 'Doctor'}
                            {displayLicenses.length > 1 && currentLicense && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    ({currentLicenseIndex + 1} of {displayLicenses.length}) - {currentLicense.specialty}
                                </span>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>
                <div id="medical-license-description" className="sr-only">
                    View and download medical license documents for {userName || 'this doctor'}
                </div>

                <div className="flex flex-col h-full">
                    {/* Error State */}
                    {error && (
                        <div className="flex items-center justify-center flex-1 text-destructive">
                            <div className="text-center">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Error Loading License</p>
                                <p className="text-sm mt-2">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && !error && (
                        <div className="flex items-center justify-center flex-1">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading medical license...</span>
                        </div>
                    )}

                    {/* License Display */}
                    {!isLoading && !error && displayLicenses.length > 0 && currentLicense && (
                        <>
                            {/* Navigation Controls for Multiple Licenses */}
                            {displayLicenses.length > 1 && (
                                <div className="flex items-center justify-center p-4 border-b bg-card">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToPrevious}
                                        className="mr-4"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    
                                    <div className="flex space-x-2">
                                        {displayLicenses.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentLicenseIndex(index)}
                                                className={`w-3 h-3 rounded-full ${
                                                    index === currentLicenseIndex 
                                                        ? 'bg-primary' 
                                                        : 'bg-muted hover:bg-muted'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={goToNext}
                                        className="ml-4"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}

                            {/* Current License Display */}
                            <div className="flex-1 p-6 overflow-hidden">
                                <div className="h-full flex flex-col">
                                    {/* License Info */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-xl font-medium">{currentLicense.specialty} License</h3>
                                            {currentLicense.uploadedAt && (
                                                <span className="text-sm text-muted-foreground">
                                                    Uploaded: {new Date(currentLicense.uploadedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleDownload(currentLicense.signedUrl, currentLicense.specialty)}
                                                className="flex items-center"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                            {displayLicenses.length > 1 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleDownloadAll}
                                                    className="flex items-center"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download All
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* License Content */}
                                    <div className="flex-1 overflow-hidden">
                                        {currentLicense.mimeType === 'application/pdf' ? (
                                            <PdfViewer
                                                src={currentLicense.signedUrl}
                                                title={`${currentLicense.specialty} Medical License`}
                                                className="h-full w-full"
                                                onDownload={() => handleDownload(currentLicense.signedUrl, currentLicense.specialty)}
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-card rounded-lg overflow-hidden">
                                                <TransformWrapper initialScale={1}>
                                                    {({ zoomIn, zoomOut, resetTransform }) => (
                                                        <div className="relative w-full h-full">
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
                                                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                                                <Image
                                                                    src={currentLicense.signedUrl}
                                                                    alt={`${currentLicense.specialty} Medical License`}
                                                                    width={1200}
                                                                    height={800}
                                                                    className="max-w-full max-h-full object-contain"
                                                                    style={{ objectFit: 'contain' }}
                                                                />
                                                            </TransformComponent>
                                                        </div>
                                                    )}
                                                </TransformWrapper>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
