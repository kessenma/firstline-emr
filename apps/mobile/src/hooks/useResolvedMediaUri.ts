// apps/mobile/src/hooks/useResolvedMediaUri.ts
// Resolves a storage file path into something an <Image> can render.
//
// Grid tiles resolve individually rather than in one batch up front: FlatList
// windowing then bounds how many requests are ever in flight, and a tile that
// scrolls past never costs a request at all. MediaService de-duplicates
// concurrent lookups and applies a failure cooldown, so remounts stay cheap.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaType } from '@fajr/shared/media';
import { usePowerSync, useSyncConnection } from './powersync';
import { getCachedMedia, getSignedUrl } from '../services/MediaService';

export interface ResolvedMediaUri {
  /** Data URI from the offline cache, or a signed URL. Null when unresolvable. */
  uri: string | null;
  isResolving: boolean;
  /** True when nothing is cached and there is no connection to fetch with. */
  isOffline: boolean;
  /** Resolve the full-size original, bypassing any thumbnail preference. */
  resolveFull: () => Promise<string | null>;
}

export function useResolvedMediaUri(
  filePath: string | null | undefined,
  opts?: { preferThumb?: boolean; enabled?: boolean; type?: MediaType },
): ResolvedMediaUri {
  const preferThumb = opts?.preferThumb ?? false;
  const enabled = opts?.enabled ?? true;
  const type = opts?.type;

  // A thumbnail of a PDF is a rendered page one; the original bytes are not an
  // image at all. So for non-image types only the derived thumbnail will do —
  // neither the cached original nor the full-size URL can stand in for it.
  const thumbOnly = preferThumb && type !== undefined && type !== 'image';

  const { service } = usePowerSync();
  const { isConnected } = useSyncConnection();

  const [uri, setUri] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!filePath || !enabled) {
      setUri(null);
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    (async () => {
      try {
        if (!thumbOnly) {
          const cached = service ? await getCachedMedia(filePath, service) : null;
          if (cancelled) return;
          if (cached) {
            setUri(cached);
            setIsOffline(false);
            return;
          }
        }

        if (!isConnected) {
          setUri(null);
          setIsOffline(true);
          return;
        }

        // A missing thumbnail is normal (HEIC, oversized, unrenderable PDF, or
        // simply not generated yet).
        const thumb = preferThumb
          ? await getSignedUrl(filePath, { variant: 'thumb' })
          : null;
        const resolved = thumb ?? (thumbOnly ? null : await getSignedUrl(filePath));

        if (cancelled) return;
        setUri(resolved);
        setIsOffline(false);
      } finally {
        if (!cancelled && isMountedRef.current) setIsResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, enabled, preferThumb, thumbOnly, isConnected, service]);

  const resolveFull = useCallback(async () => {
    if (!filePath) return null;
    const cached = service ? await getCachedMedia(filePath, service) : null;
    if (cached) return cached;
    if (!isConnected) return null;
    return getSignedUrl(filePath);
  }, [filePath, service, isConnected]);

  return { uri, isResolving, isOffline, resolveFull };
}
