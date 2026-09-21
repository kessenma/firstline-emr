// packages/shared/src/media/types.ts
// Shared media types used across web and mobile apps

/** Supported media types across the platform */
export type MediaType = 'image' | 'video' | 'pdf' | 'audio' | 'file';

/** A displayable media item (grid thumbnail, full-screen viewer, etc.) */
export interface MediaItem {
  id: string;
  uri: string;
  type?: MediaType;
  caption?: string;
}

/** Filter options for media galleries */
export type MediaFilter = 'all' | 'images' | 'videos' | 'audio' | 'files';

/** Status of a media upload in progress */
export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error';

/** An item being uploaded (for upload progress UIs) */
export interface UploadingMediaItem {
  id: string;
  fileName: string;
  mimeType: string;
  progress: number;
  status: UploadStatus;
  error?: string;
}
