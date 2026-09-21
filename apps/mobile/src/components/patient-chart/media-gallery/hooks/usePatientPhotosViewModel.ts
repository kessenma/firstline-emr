// apps/mobile/src/components/patient-chart/media-gallery/hooks/usePatientPhotosViewModel.ts
// ViewModel for patient photos: resolves signed URLs, manages fullscreen state

import { useState, useEffect, useCallback } from 'react';
import { usePatientChart } from '../../PatientChartContext';
import { usePowerSync, useSyncConnection } from '../../../../hooks/powersync';
import {
  getPatientPhotoSignedUrl,
  downloadAndCachePatientPhoto,
} from '../../../../services/PatientMediaService';
import { getCachedMedia } from '../../../../services/TelegramMediaCacheService';
import type { MediaThumbnailItem } from '../../../ui/MediaThumbnail';
import { inferMediaTypeFromUrl } from '@fajr/shared/media';

function inferMediaType(photo: { url: string; type?: string }): 'image' | 'pdf' {
  if (photo.type === 'pdf') return 'pdf';
  const inferred = inferMediaTypeFromUrl(photo.url);
  return inferred === 'pdf' ? 'pdf' : 'image';
}

interface ResolvedPhoto extends MediaThumbnailItem {
  originalUrl: string;
}

interface UsePatientPhotosViewModelReturn {
  photos: ResolvedPhoto[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectedIndex: number | null;
  openFullScreen: (index: number) => void;
  closeFullScreen: () => void;
}

export function usePatientPhotosViewModel(
  mediaCacheEnabled: boolean,
): UsePatientPhotosViewModelReturn {
  const { patientInfo, photos: rawPhotos, loadingMedia } = usePatientChart();
  const { service } = usePowerSync();
  const { isConnected } = useSyncConnection();

  const [resolvedPhotos, setResolvedPhotos] = useState<ResolvedPhoto[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const patientId = patientInfo?.id || '';

  // Resolve signed URLs for all photos
  const resolvePhotos = useCallback(async () => {
    if (!rawPhotos || rawPhotos.length === 0 || !patientId) {
      setResolvedPhotos([]);
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const resolved = await Promise.all(
        rawPhotos.map(async (photo, index) => {
          const id = photo.id || `patient-photo-${index}`;
          const filePath = photo.url;
          const mediaType = inferMediaType(photo);

          // Try cache first (works offline)
          const cached = await getCachedMedia(filePath, service);
          if (cached) {
            return {
              id,
              uri: cached,
              type: mediaType,
              originalUrl: filePath,
              caption: photo.caption,
            };
          }

          // Online: get signed URL
          if (isConnected) {
            const signedUrl = await getPatientPhotoSignedUrl(patientId, filePath);

            // Cache if consent given
            if (mediaCacheEnabled && signedUrl) {
              downloadAndCachePatientPhoto(patientId, filePath, service).catch(() => {
                // background cache, don't block UI
              });
            }

            if (signedUrl) {
              return {
                id,
                uri: signedUrl,
                type: mediaType,
                originalUrl: filePath,
                caption: photo.caption,
              };
            }
          }

          // Fallback: use raw URL (may not work without signing)
          return {
            id,
            uri: filePath,
            type: mediaType,
            originalUrl: filePath,
            caption: photo.caption,
          };
        }),
      );

      setResolvedPhotos(resolved);
    } catch (err) {
      console.error('[PatientPhotosVM] Error resolving photos:', err);
      setError('Failed to load photos');
    } finally {
      setIsResolving(false);
    }
  }, [rawPhotos, patientId, service, isConnected, mediaCacheEnabled]);

  // Resolve on mount and when raw photos change
  useEffect(() => {
    resolvePhotos();
  }, [resolvePhotos]);

  const refresh = useCallback(async () => {
    await resolvePhotos();
  }, [resolvePhotos]);

  const openFullScreen = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const closeFullScreen = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  return {
    photos: resolvedPhotos,
    isLoading: loadingMedia || isResolving,
    error,
    refresh,
    selectedIndex,
    openFullScreen,
    closeFullScreen,
  };
}
