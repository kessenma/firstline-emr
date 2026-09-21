// apps/mobile/src/components/patient-chart/media-gallery/hooks/useTelegramMediaViewModel.ts
// ViewModel for telegram media: fetches all media types, filters client-side, resolves signed URLs

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientChart } from '../../PatientChartContext';
import { usePowerSync, useSyncConnection } from '../../../../hooks/powersync';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import {
  getCachedMedia,
  downloadAndCacheMedia,
} from '../../../../services/TelegramMediaCacheService';
import type { MediaThumbnailItem } from '../../../ui/MediaThumbnail';
import { mapApiMediaType, matchesMediaFilter } from '@fajr/shared/media';
import type { MediaFilter } from '@fajr/shared/media';

export type TelegramMediaFilter = MediaFilter;

interface UseTelegramMediaViewModelReturn {
  mediaFilter: TelegramMediaFilter;
  setMediaFilter: (filter: TelegramMediaFilter) => void;
  items: MediaThumbnailItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectedIndex: number | null;
  openFullScreen: (index: number) => void;
  closeFullScreen: () => void;
}

export function useTelegramMediaViewModel(
  mediaCacheEnabled: boolean,
): UseTelegramMediaViewModelReturn {
  const { patientInfo } = usePatientChart();
  const { service } = usePowerSync();
  const { isConnected } = useSyncConnection();

  const [mediaFilter, setMediaFilter] = useState<TelegramMediaFilter>('all');
  const [allItems, setAllItems] = useState<MediaThumbnailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const telegramChatId = patientInfo?.telegramChatId;

  // Fetch ALL media types at once (no mediaType param → API returns image, video, audio, file)
  const fetchMedia = useCallback(async () => {
    if (!telegramChatId) {
      setAllItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getStoredToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const listResponse = await fetch(
        getApiUrl(`/telegram-thread/list-media?chatId=${encodeURIComponent(telegramChatId)}`),
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!listResponse.ok) {
        if (listResponse.status === 404) {
          setAllItems([]);
          return;
        }
        throw new Error(`Failed to list media: ${listResponse.status}`);
      }

      const { media } = await listResponse.json();

      if (!media || media.length === 0) {
        setAllItems([]);
        return;
      }

      // Resolve signed URLs for each media message
      const resolved: MediaThumbnailItem[] = [];

      for (const msg of media) {
        if (!msg.mediaUrl) continue;
        const fileKey = msg.mediaUrl;
        const id = msg.id || fileKey;
        const itemType = mapApiMediaType(msg.type);

        // Try cache first (works offline)
        const cached = await getCachedMedia(fileKey, service);
        if (cached) {
          resolved.push({ id, uri: cached, type: itemType });
          continue;
        }

        // Online: get signed URL
        if (isConnected) {
          try {
            const mediaResponse = await fetch(
              getApiUrl(`/telegram-thread/get-media?filePath=${encodeURIComponent(fileKey)}`),
              {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (!mediaResponse.ok) continue;

            const mediaData = await mediaResponse.json();
            const signedUrl = mediaData.signedUrl || mediaData.url;

            if (signedUrl) {
              resolved.push({ id, uri: signedUrl, type: itemType });

              // Cache images in background if consent given
              if (mediaCacheEnabled && itemType === 'image') {
                downloadAndCacheMedia(fileKey, service).catch(() => {});
              }
            }
          } catch {
            // Skip individual file errors
          }
        }
      }

      setAllItems(resolved);
    } catch (err) {
      console.error('[TelegramMediaVM] Error fetching media:', err);
      setError('Failed to load media');
    } finally {
      setIsLoading(false);
    }
  }, [telegramChatId, service, isConnected, mediaCacheEnabled]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Filter items client-side based on selected filter
  const items = useMemo(
    () => allItems.filter(item => matchesMediaFilter(item.type, mediaFilter)),
    [allItems, mediaFilter],
  );

  const refresh = useCallback(async () => {
    await fetchMedia();
  }, [fetchMedia]);

  const openFullScreen = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const closeFullScreen = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  return {
    mediaFilter,
    setMediaFilter,
    items,
    isLoading,
    error,
    refresh,
    selectedIndex,
    openFullScreen,
    closeFullScreen,
  };
}
