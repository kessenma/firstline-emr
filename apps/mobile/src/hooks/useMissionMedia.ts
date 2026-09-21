// apps/mobile/src/hooks/useMissionMedia.ts
// Hook for fetching mission attachment media with offline caching.
// Delegates to the centralized MediaService.

import { useState, useCallback } from 'react';
import { fetchMedia, getCachedMedia } from '../services/MediaService';
import { PowerSyncService } from '../services/powersync/PowerSyncService';

export function useMissionMedia() {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const viewAttachment = useCallback(async (filePath: string): Promise<string | null> => {
    const service = PowerSyncService.getInstance();
    if (!service.hasDatabase) return null;

    setLoadingFile(filePath);
    try {
      const cached = await getCachedMedia(filePath, service);
      if (cached) return cached;

      return await fetchMedia(filePath, service);
    } finally {
      setLoadingFile(null);
    }
  }, []);

  return {
    viewAttachment,
    loadingFile,
  };
}
