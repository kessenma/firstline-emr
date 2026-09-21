// apps/mobile/src/services/TelegramMediaCacheService.ts
// Thin wrapper that delegates to the centralized MediaService.
// Preserves the existing function signatures so all importers keep working.

import {
  fetchMedia,
  getCachedMedia as _getCachedMedia,
  preloadMediaCache as _preloadMediaCache,
  clearMediaCache as _clearMediaCache,
  type DbService,
} from './MediaService';

export { _getCachedMedia as getCachedMedia };
export { _preloadMediaCache as preloadMediaCache };
export { _clearMediaCache as clearMediaCache };

/**
 * Download a media file, convert to base64, and cache it.
 * Delegates to MediaService.fetchMedia.
 */
export async function downloadAndCacheMedia(
  mediaUrl: string,
  service: DbService,
): Promise<string | null> {
  return fetchMedia(mediaUrl, service);
}
