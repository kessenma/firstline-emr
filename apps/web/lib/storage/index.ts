/**
 * Storage Module - Centralized Object Storage Service
 *
 * This module provides a unified interface for uploading files to RustFS object storage.
 *
 * @example
 * ```typescript
 * import { storageService } from "@/lib/storage";
 *
 * const result = await storageService.upload({
 *   file: myFile,
 *   fileName: "photo.jpg",
 *   contentType: "image/jpeg",
 *   basePath: "telegram/photos/123456789"
 * });
 * ```
 */

export { storageService, StorageService } from "./storage-service";
export type { UploadOptions, UploadResult } from "./storage-service";
