// packages/shared/src/media/constants.ts
// Shared media constants used across web and mobile apps

/** Default number of columns for media grids */
export const MEDIA_GRID_COLUMNS = 3;

/** Accepted image MIME types for uploads */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Accepted media MIME types for uploads (images + video + pdf + audio) */
export const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'video/mp4',
  'application/pdf',
  'audio/mpeg',
  'audio/ogg',
] as const;

/** Max file sizes for uploads (in bytes) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB
