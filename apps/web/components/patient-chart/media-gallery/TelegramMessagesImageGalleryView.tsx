// apps/web/components/patient-chart/media-gallery/TelegramMessagesImageGalleryView.tsx
"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/iconButton";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from "lucide-react";
import { ClipLoader } from "react-spinners";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useTelegramMessagesImageGalleryViewModel, type TelegramMessagesImageGalleryViewModelProps } from "./TelegramMessagesImageGalleryViewModel";
import { MediaViewer } from "@/components/ui/MediaViewer";

const TelegramMessagesImageGalleryView: React.FC<TelegramMessagesImageGalleryViewModelProps> = ({ patientId }) => {
    const {
        photos,
        currentPhotoIndex,
        isLoading,
        isDoctor,
        handleThumbnailClick,
        handlePrevClick,
        handleNextClick,
        handleFileChange,
        handleFormSubmit,
    } = useTelegramMessagesImageGalleryViewModel({ patientId });

    const carouselRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Open full-screen view for Telegram photos
    const openFullScreen = (index: number) => {
        setIsFullScreen(true);
        handleThumbnailClick(index); // Sync selected image with state
    };

    const closeFullScreen = () => {
        setIsFullScreen(false);
    };

    return (
        <div className="bg-background">
            <div className="w-full max-w-4xl mx-auto pb-16 text-foreground">
                <div className="border border-border p-8 my-2 bg-card text-foreground shadow-sm rounded-lg">
                    <div style={{ minWidth: "75%" }}>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <ClipLoader size={50} color={"hsl(var(--primary))"} loading={isLoading} />
                            </div>
                        ) : (
                            <>
                                {photos.length > 0 ? (
                                    <div className="flex flex-col items-center">
                                        <div className="relative mb-4 w-full max-w-[600px]">
                                            <TransformWrapper initialScale={1}>
                                                {({ zoomIn, zoomOut }) => (
                                                    <div className="relative">
                                                        <TransformComponent>
                                                            <Image
                                                                src={photos[currentPhotoIndex].url || "/placeholder.svg"}
                                                                alt={`Photo ${currentPhotoIndex + 1}`}
                                                                className="max-w-full h-auto mx-auto cursor-pointer"
                                                                width={400}
                                                                height={400}
                                                                onClick={() => openFullScreen(currentPhotoIndex)}
                                                            />
                                                        </TransformComponent>
                                                        <div className="absolute bottom-3 left-5 flex gap-5 text-lg rounded-md border border-border bg-muted p-2">
                                                            <Button
                                                                variant="ghost"
                                                                className="border-none bg-transparent text-foreground p-0"
                                                                onClick={() => zoomOut(0.8)}
                                                            >
                                                                <Minus />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                className="border-none bg-transparent text-foreground p-0"
                                                                onClick={() => zoomIn(1.2)}
                                                            >
                                                                <Plus />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                className="border-none bg-transparent text-foreground p-0"
                                                                onClick={() => openFullScreen(currentPhotoIndex)}
                                                            >
                                                                <Maximize2 />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </TransformWrapper>
                                        </div>

                                        {photos.length > 1 && (
                                            <div className="flex items-center mt-2">
                                                <IconButton icon={<ChevronLeft />} onClick={handlePrevClick} />
                                                <div ref={carouselRef} className="flex overflow-x-auto max-w-[300px] flex-1">
                                                    {photos.map((photo, index) => (
                                                        <Button
                                                            key={index}
                                                            variant="ghost"
                                                            className="min-w-[75px] min-h-[75px] p-[10px]"
                                                            onClick={() => handleThumbnailClick(index)}
                                                        >
                                                            <Image
                                                                src={photo.url || "/placeholder.svg"}
                                                                alt={`Thumbnail ${index + 1}`}
                                                                className={`object-cover rounded ${currentPhotoIndex === index ? 'ring-2 ring-border' : ''}`}
                                                                width={75}
                                                                height={75}
                                                            />
                                                        </Button>
                                                    ))}
                                                </div>
                                                <IconButton icon={<ChevronRight />} onClick={handleNextClick} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground mt-8">This user has no associated files.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {isDoctor && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4 mt-4">Upload Files</h1>
                        <form onSubmit={handleFormSubmit} className="flex flex-col">
                            <input type="file" multiple onChange={handleFileChange} ref={fileInputRef} />
                            <Button type="submit" variant="submit" className="w-[110px] mt-[5px]">
                                Submit
                            </Button>
                        </form>
                    </div>
                )}
            </div>

            {/* Full-Screen View for Telegram Photos */}
            {isFullScreen && (
                <MediaViewer
                    media={photos[currentPhotoIndex] ? { url: photos[currentPhotoIndex].url } : null}
                    onClose={closeFullScreen}
                    onPrev={handlePrevClick}
                    onNext={handleNextClick}
                    hasMultiple={photos.length > 1}
                    currentIndex={currentPhotoIndex + 1}
                    totalItems={photos.length}
                />
            )}
        </div>
    );
};

export default TelegramMessagesImageGalleryView;
