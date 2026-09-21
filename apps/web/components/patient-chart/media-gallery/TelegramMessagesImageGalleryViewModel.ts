// apps/web/components/patient-chart/media-gallery/TelegramMessagesImageGalleryViewModel.tsx
import { useState, useEffect } from 'react';
import { usePatientDashboard } from '../PatientViewModelContext';
import { getMediaUrl } from '@/lib/media';

interface Photo {
    url: string;
}

export interface TelegramMessagesImageGalleryViewModelProps {
    patientId: string;
}

export const useTelegramMessagesImageGalleryViewModel = ({ patientId }: TelegramMessagesImageGalleryViewModelProps) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDoctor, setIsDoctor] = useState(false);

    const { patientInfo } = usePatientDashboard(); // get patientInfo which contains telegramChatId
    const telegramChatId = patientInfo?.telegramChatId;

    useEffect(() => {
        const fetchPhotos = async () => {
            if (!telegramChatId) {
                return; // no telegram ID, no files
            }
            setIsLoading(true);
            try {
                // 1. Fetch image messages from thread by chatId
                const listResponse = await fetch(`/api/telegram-thread/list-media?chatId=${encodeURIComponent(telegramChatId)}&mediaType=image`);
                if (!listResponse.ok) {
                    throw new Error(`Error listing media: ${listResponse.statusText}`);
                }
                const { media } = await listResponse.json();

                if (!media || media.length === 0) {
                    setPhotos([]);
                    return;
                }

                const tempPhotos: Photo[] = [];
                for (const msg of media) {
                    if (!msg.mediaUrl) continue;
                    // 2. Get signed URL for each media file (cached)
                    const signedUrl = await getMediaUrl(msg.mediaUrl);
                    if (signedUrl) {
                        tempPhotos.push({ url: signedUrl });
                    }
                }

                setPhotos(tempPhotos);
            } catch (error) {
                console.error('Error fetching photos:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPhotos();
    }, [telegramChatId]);

    useEffect(() => {
        // Check if user is a doctor
        // Assuming you have session or some logic here
        // setIsDoctor(true/false);
    }, []);

    const handleThumbnailClick = (index: number) => {
        setCurrentPhotoIndex(index);
    };

    const handlePrevClick = () => {
        setCurrentPhotoIndex(prevIndex => (prevIndex === 0 ? photos.length - 1 : prevIndex - 1));
    };

    const handleNextClick = () => {
        setCurrentPhotoIndex(prevIndex => (prevIndex === photos.length - 1 ? 0 : prevIndex + 1));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesArray = Array.from(event.target.files || []);
        setSelectedFiles(filesArray);
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Upload logic, similar to your existing code but pointing to DO
    };

    return {
        photos,
        currentPhotoIndex,
        isLoading,
        isDoctor,
        selectedFiles,
        handleThumbnailClick,
        handlePrevClick,
        handleNextClick,
        handleFileChange,
        handleFormSubmit,
    };
};