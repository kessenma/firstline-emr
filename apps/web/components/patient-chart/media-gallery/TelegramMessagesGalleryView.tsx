// apps/web/components/patient-chart/media-gallery/TelegramMessagesGalleryView.tsx
"use client";

import type React from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/iconButton";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ImageIcon,
  Video,
  Minus,
  Plus,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useTelegramMessagesImageGalleryViewModel } from "./TelegramMessagesImageGalleryViewModel";
import { useTelegramMessagesVideoGalleryViewModel } from "./TelegramMessagesVideoGalleryViewModel";
import { MediaViewer } from "@/components/ui/MediaViewer";
import { RadioCard } from "@/components/ui/radio-card";

interface TelegramMessagesGalleryViewProps {
  patientId: string;
}

const TelegramMessagesGalleryView: React.FC<
  TelegramMessagesGalleryViewProps
> = ({ patientId }) => {
  const [mediaType, setMediaType] = useState<"images" | "videos">("images");

  // Use both view models
  const {
    photos,
    currentPhotoIndex,
    isLoading: isLoadingImages,
    isDoctor,
    handleThumbnailClick: handleImageThumbnailClick,
    handlePrevClick: handleImagePrevClick,
    handleNextClick: handleImageNextClick,
    handleFileChange: handleImageFileChange,
    handleFormSubmit: handleImageFormSubmit,
  } = useTelegramMessagesImageGalleryViewModel({ patientId });

  const {
    videos,
    currentVideoIndex,
    isLoading: isLoadingVideos,
    handleThumbnailClick: handleVideoThumbnailClick,
    handlePrevClick: handleVideoPrevClick,
    handleNextClick: handleVideoNextClick,
    handleFileChange: handleVideoFileChange,
    handleFormSubmit: handleVideoFormSubmit,
  } = useTelegramMessagesVideoGalleryViewModel({ patientId });

  const carouselRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Open full-screen view
  const openFullScreen = () => {
    setIsFullScreen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
  };

  // Determine if we're showing images or videos
  const isShowingImages = mediaType === "images";
  const isLoading = isShowingImages ? isLoadingImages : isLoadingVideos;
  const mediaItems = isShowingImages ? photos : videos;
  const currentIndex = isShowingImages ? currentPhotoIndex : currentVideoIndex;
  const handleThumbnailClick = isShowingImages
    ? handleImageThumbnailClick
    : handleVideoThumbnailClick;
  const handlePrevClick = isShowingImages
    ? handleImagePrevClick
    : handleVideoPrevClick;
  const handleNextClick = isShowingImages
    ? handleImageNextClick
    : handleVideoNextClick;

  // Get current media item with type
  const currentMedia = isShowingImages
    ? photos[currentPhotoIndex]
      ? { ...photos[currentPhotoIndex], type: "image" as const }
      : null
    : videos[currentVideoIndex]
      ? { ...videos[currentVideoIndex], type: "video" as const }
      : null;

  return (
    <div className="bg-background">
      <div className="w-full max-w-4xl mx-auto pb-16 text-foreground">
        {/* Media Type Toggle */}
        <RadioCard.Root
          className="flex justify-center w-full mb-6 gap-4"
          value={mediaType}
          onValueChange={(value) => setMediaType(value as "images" | "videos")}
        >
          <RadioCard.Item
            value="images"
            className={`text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              mediaType === "images"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <ImageIcon size={16} />
            Images
          </RadioCard.Item>
          <RadioCard.Item
            value="videos"
            className={`text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              mediaType === "videos"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Video size={16} />
            Videos
          </RadioCard.Item>
        </RadioCard.Root>

        <div className="border border-border p-8 my-2 bg-card text-foreground shadow-sm rounded-lg">
          <div style={{ minWidth: "75%" }}>
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <ClipLoader
                  size={50}
                  color={"hsl(var(--primary))"}
                  loading={isLoading}
                />
              </div>
            ) : (
              <>
                {mediaItems.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4 w-full max-w-[600px]">
                      {isShowingImages ? (
                        // Image display with zoom
                        <TransformWrapper initialScale={1}>
                          {({ zoomIn, zoomOut }) => (
                            <div className="relative">
                              <TransformComponent>
                                <Image
                                  src={
                                    photos[currentPhotoIndex]?.url ||
                                    "/placeholder.svg"
                                  }
                                  alt={`Photo ${currentPhotoIndex + 1}`}
                                  className="max-w-full h-auto mx-auto cursor-pointer"
                                  width={400}
                                  height={400}
                                  onClick={openFullScreen}
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
                                  onClick={openFullScreen}
                                >
                                  <Maximize2 />
                                </Button>
                              </div>
                            </div>
                          )}
                        </TransformWrapper>
                      ) : (
                        // Video player
                        <div className="relative">
                          <video
                            src={videos[currentVideoIndex]?.url}
                            controls
                            className="max-w-full h-auto mx-auto"
                            style={{ maxHeight: "400px" }}
                          />
                          <Button
                            variant="ghost"
                            className="absolute bottom-3 right-3 border-none bg-background/80 text-foreground p-2"
                            onClick={openFullScreen}
                          >
                            <Maximize2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {mediaItems.length > 1 && (
                      <div className="flex items-center mt-2">
                        <IconButton
                          icon={<ChevronLeft />}
                          onClick={handlePrevClick}
                        />
                        <div
                          ref={carouselRef}
                          className="flex overflow-x-auto max-w-[300px] flex-1"
                        >
                          {mediaItems.map((item, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              className="min-w-[75px] min-h-[75px] p-[10px]"
                              onClick={() => handleThumbnailClick(index)}
                            >
                              {isShowingImages ? (
                                <Image
                                  src={item.url || "/placeholder.svg"}
                                  alt={`Thumbnail ${index + 1}`}
                                  className={`object-cover rounded ${currentIndex === index ? "ring-2 ring-border" : ""}`}
                                  width={75}
                                  height={75}
                                />
                              ) : (
                                <div className="relative w-[75px] h-[75px]">
                                  <Image
                                    src={"/placeholder.svg"}
                                    alt={`Video Thumbnail ${index + 1}`}
                                    width={75}
                                    height={75}
                                    className={`object-cover rounded ${currentIndex === index ? "ring-2 ring-border" : ""}`}
                                  />
                                  {/* Video play icon overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center">
                                      <div className="w-0 h-0 border-y-4 border-y-transparent border-l-6 border-l-foreground ml-0.5"></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Button>
                          ))}
                        </div>
                        <IconButton
                          icon={<ChevronRight />}
                          onClick={handleNextClick}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground mt-8">
                    This user has no associated{" "}
                    {isShowingImages ? "images" : "videos"}.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {isDoctor && (
          <div>
            <h1 className="text-2xl font-bold mb-4 mt-4">
              Upload {isShowingImages ? "Images" : "Videos"}
            </h1>
            <form
              onSubmit={
                isShowingImages ? handleImageFormSubmit : handleVideoFormSubmit
              }
              className="flex flex-col"
            >
              <input
                type="file"
                multiple
                accept={isShowingImages ? "image/*" : "video/*"}
                onChange={
                  isShowingImages
                    ? handleImageFileChange
                    : handleVideoFileChange
                }
                ref={isShowingImages ? imageFileInputRef : videoFileInputRef}
              />
              <Button
                type="submit"
                variant="submit"
                className="w-[110px] mt-[5px]"
              >
                Submit
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Full-Screen View */}
      {isFullScreen && currentMedia && (
        <MediaViewer
          media={currentMedia}
          onClose={closeFullScreen}
          onPrev={handlePrevClick}
          onNext={handleNextClick}
          hasMultiple={mediaItems.length > 1}
          currentIndex={currentIndex + 1}
          totalItems={mediaItems.length}
        />
      )}
    </div>
  );
};

export default TelegramMessagesGalleryView;
