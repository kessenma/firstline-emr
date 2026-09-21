// packages/shared/src/media/utils.ts
// Shared media utility functions (pure, no React / platform dependencies)

import type { MediaType, MediaFilter } from './types';

// ── Extension → MediaType mapping ──

const EXTENSION_MAP: Record<string, MediaType> = {
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  // Video
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video',
  // PDF
  pdf: 'pdf',
  // Audio
  ogg: 'audio', opus: 'audio', mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio', flac: 'audio',
  // Files (catch-all is handled by default)
};

// ── MIME → MediaType mapping ──

const MIME_PREFIX_MAP: [string, MediaType][] = [
  ['image/', 'image'],
  ['video/', 'video'],
  ['audio/', 'audio'],
  ['application/pdf', 'pdf'],
];

/**
 * Infer MediaType from a URL or file path by its extension.
 * Handles signed URLs with query strings (e.g. "photo.jpg?token=...").
 */
export function inferMediaTypeFromUrl(url: string): MediaType {
  if (!url) return 'file';

  // Strip query string and hash, then get extension
  const pathPart = url.split('?')[0].split('#')[0];
  const ext = pathPart.split('.').pop()?.toLowerCase();

  if (ext && EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  return 'file';
}

/**
 * Infer MediaType from a MIME type string.
 * e.g. "image/jpeg" → "image", "application/pdf" → "pdf"
 */
export function inferMediaTypeFromMime(mimeType: string): MediaType {
  if (!mimeType) return 'file';

  const lower = mimeType.toLowerCase();
  for (const [prefix, type] of MIME_PREFIX_MAP) {
    if (lower.startsWith(prefix) || lower === prefix) {
      return type;
    }
  }

  return 'file';
}

/**
 * Map an API media type string to MediaType.
 * Handles common API responses like "image", "video", "audio", "file", "document", etc.
 */
export function mapApiMediaType(apiType: string): MediaType {
  switch (apiType?.toLowerCase()) {
    case 'image': case 'photo': return 'image';
    case 'video': return 'video';
    case 'audio': case 'voice': return 'audio';
    case 'pdf': return 'pdf';
    case 'file': case 'document': return 'file';
    default: return 'image';
  }
}

// ── Renderability ──
//
// A MediaType says what a file *is*, not whether the current platform can paint
// it. `image/heic` is genuinely an image, but no major browser decodes one — an
// <img> pointed at it fails silently with a broken-image icon. Callers need to
// distinguish "we don't handle this" from "it failed to load", so viewers can
// explain the difference instead of showing an empty box.
//
// Support differs sharply by platform, so the lists are per-platform: iOS
// decodes HEIC and TIFF through ImageIO, Android decodes HEIC (API 28+) but not
// TIFF, and video containers split along AVPlayer vs ExoPlayer lines.

/** Image formats that are valid images but which browsers cannot decode. */
export const UNDISPLAYABLE_IMAGE_EXTENSIONS = [
  'heic', 'heif', // iOS default camera format
  'tif', 'tiff',
  'raw', 'cr2', 'nef', 'arw', 'dng', // camera raw
  'psd',
] as const;

/** Video containers/codecs browsers commonly refuse. */
export const UNDISPLAYABLE_VIDEO_EXTENSIONS = [
  'avi', 'mkv', 'wmv', 'flv', 'mpg', 'mpeg', '3gp',
] as const;

/** Platforms with distinct native decoding support. */
export type MediaDisplayPlatform = 'browser' | 'ios' | 'android';

const UNDISPLAYABLE_IMAGE_BY_PLATFORM: Record<MediaDisplayPlatform, readonly string[]> = {
  browser: UNDISPLAYABLE_IMAGE_EXTENSIONS,
  // ImageIO handles HEIC/HEIF and TIFF; camera raw and PSD it does not.
  ios: ['raw', 'cr2', 'nef', 'arw', 'dng', 'psd'],
  // API 28+ decodes HEIC/HEIF, but TIFF has never been supported.
  android: ['tif', 'tiff', 'raw', 'cr2', 'nef', 'arw', 'dng', 'psd'],
};

const UNDISPLAYABLE_VIDEO_BY_PLATFORM: Record<MediaDisplayPlatform, readonly string[]> = {
  browser: UNDISPLAYABLE_VIDEO_EXTENSIONS,
  // AVPlayer plays MP4/MOV/M4V/3GP families only.
  ios: ['avi', 'mkv', 'wmv', 'flv', 'mpg', 'mpeg'],
  // ExoPlayer additionally handles Matroska, MPEG-PS and 3GP.
  android: ['avi', 'wmv', 'flv'],
};

/**
 * Extract a lowercase file extension from a URL, path, or bare file name.
 * Tolerates signed URLs with query strings and hashes.
 */
export function getFileExtension(urlOrName: string): string {
  if (!urlOrName) return '';
  const pathPart = urlOrName.split('?')[0].split('#')[0];
  const lastSegment = pathPart.split('/').pop() ?? '';
  if (!lastSegment.includes('.')) return '';
  return lastSegment.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Resolve a media type from whatever a caller happens to know, most reliable
 * source first: an explicit type, then the MIME type, then the file extension.
 *
 * Every argument is optional because callers genuinely differ — object storage
 * listings carry a MIME type, chart photos carry an explicit type, and a bare
 * signed URL carries neither.
 */
export function resolveMediaType(input: {
  type?: MediaType | string | null;
  mimeType?: string | null;
  url?: string | null;
  fileName?: string | null;
}): MediaType {
  const { type, mimeType, url, fileName } = input;

  if (type) {
    const known: MediaType[] = ['image', 'video', 'audio', 'pdf', 'file'];
    if (known.includes(type as MediaType)) return type as MediaType;
  }

  if (mimeType) {
    const fromMime = inferMediaTypeFromMime(mimeType);
    if (fromMime !== 'file') return fromMime;
  }

  // Prefer the file name's extension: signed URLs sometimes end in a token
  // rather than the object name.
  if (fileName) {
    const fromName = inferMediaTypeFromUrl(fileName);
    if (fromName !== 'file') return fromName;
  }

  if (url) return inferMediaTypeFromUrl(url);

  return 'file';
}

/**
 * Whether the given platform can render this media inline.
 *
 * Returns false for `file`, and for image/video formats that are well-formed
 * but undecodable there (HEIC in a browser, TIFF on Android, AVI anywhere).
 * A false here means "offer a download or hand it to another app", not "the
 * file is broken" — callers should still handle load failures separately.
 */
export function isDisplayableMedia(
  type: MediaType,
  urlOrName?: string | null,
  platform: MediaDisplayPlatform = 'browser',
): boolean {
  if (type === 'file') return false;

  const ext = urlOrName ? getFileExtension(urlOrName) : '';
  if (!ext) return true; // no extension to judge by — let the player try

  if (type === 'image') {
    return !UNDISPLAYABLE_IMAGE_BY_PLATFORM[platform].includes(ext);
  }
  if (type === 'video') {
    return !UNDISPLAYABLE_VIDEO_BY_PLATFORM[platform].includes(ext);
  }

  return true;
}

/** Browser-specific shorthand for {@link isDisplayableMedia}. */
export function isDisplayableInBrowser(
  type: MediaType,
  urlOrName?: string | null,
): boolean {
  return isDisplayableMedia(type, urlOrName, 'browser');
}

/**
 * Check if a media item's type matches the given filter.
 */
export function matchesMediaFilter(itemType: MediaType | undefined, filter: MediaFilter): boolean {
  if (filter === 'all') return true;
  if (!itemType) return filter === 'images'; // default to image

  switch (filter) {
    case 'images': return itemType === 'image';
    case 'videos': return itemType === 'video';
    case 'audio': return itemType === 'audio';
    case 'files': return itemType === 'file' || itemType === 'pdf';
    default: return true;
  }
}
