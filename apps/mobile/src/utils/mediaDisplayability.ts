// apps/mobile/src/utils/mediaDisplayability.ts
// React Native side of the shared media renderability helpers.
//
// Two things differ from the web: the device decodes formats a browser won't
// (HEIC on both platforms, TIFF on iOS), and MediaService hands back base64
// data URIs from its offline cache — those carry no file extension, so the
// shared extension sniffing has nothing to work with and must be bypassed.

import { Platform } from 'react-native';
import {
  isDisplayableMedia,
  resolveMediaType,
  type MediaDisplayPlatform,
  type MediaType,
} from '@fajr/shared/media';

const DEVICE_PLATFORM: MediaDisplayPlatform =
  Platform.OS === 'android' ? 'android' : 'ios';

/** True when a value is a `data:` URI rather than a remote URL or file path. */
export function isDataUri(uri: string | null | undefined): boolean {
  return typeof uri === 'string' && uri.startsWith('data:');
}

/** MIME type embedded in a data URI ("data:image/jpeg;base64,…"), or null. */
export function dataUriMimeType(uri: string): string | null {
  if (!isDataUri(uri)) return null;
  const mime = uri.slice(5).split(/[;,]/)[0];
  return mime || null;
}

/**
 * Resolve a media type without letting a data URI's base64 payload get
 * mistaken for a file extension — its own MIME type is used instead.
 */
export function resolveItemMediaType(item: {
  type?: MediaType | string | null;
  mimeType?: string | null;
  uri?: string | null;
  fileName?: string | null;
}): MediaType {
  const { type, mimeType, uri, fileName } = item;

  if (uri && isDataUri(uri)) {
    return resolveMediaType({
      type,
      mimeType: mimeType ?? dataUriMimeType(uri),
      fileName,
    });
  }

  return resolveMediaType({ type, mimeType, url: uri, fileName });
}

/**
 * Whether this device can render the media inline. A false means "hand it to
 * another app", not "the file is broken" — load failures are handled separately.
 */
export function isDisplayableOnDevice(
  type: MediaType,
  urlOrName?: string | null,
): boolean {
  // Cached bytes are already decoded into a displayable form.
  if (urlOrName && isDataUri(urlOrName)) return type !== 'file';

  return isDisplayableMedia(type, urlOrName, DEVICE_PLATFORM);
}
