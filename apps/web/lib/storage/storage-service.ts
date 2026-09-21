/**
 * 🎯 SHARED STORAGE SERVICE - "OCTOPUS HEAD"
 *
 * This is the centralized service for all file uploads to RustFS object storage.
 * All upload endpoints should use this service to ensure consistency.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 📚 FULL DOCUMENTATION: See ./readme.md
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 📍 ENDPOINTS USING THIS SERVICE (7/7 migrated - COMPLETE! 🎉):
 * ─────────────────────────────────────────────────────────────────────────
 * [✓] apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts
 * [✓] apps/web/app/api/telegram-thread/[telegramChatId]/upload-audio/route.ts
 * [✓] apps/web/app/api/internal-messages/[id]/upload-audio/route.ts
 * [✓] apps/web/app/api/internal-messages/[id]/upload-document/route.ts
 * [✓] apps/web/app/api/internal-messages/[id]/upload-photo/route.ts
 * [✓] apps/web/app/api/patient/[id]/upload-photo/route.ts
 * [✓] apps/web/app/api/upload-license/route.ts
 *
 * 📝 NOTE: Legacy telegram-bot app (apps/telegram-bot) is being deprecated in
 *          favor of apps/notifications-server. The old bot does not use this
 *          service. Future notification uploads will integrate here.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 QUICK GUIDE FOR AI ASSISTANTS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Creating a NEW upload endpoint? Follow this pattern:
 *
 * ```typescript
 * import { storageService } from "@/lib/storage";
 *
 * export async function POST(req: NextRequest) {
 *   const formData = await req.formData();
 *   const file = formData.get("file") as File;
 *
 *   const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
 *   const basePath = "domain/subdomain/${sanitizedId}";
 *
 *   const result = await storageService.upload({
 *     file,
 *     fileName: file.name,
 *     contentType: file.type || "application/octet-stream",
 *     basePath,
 *   });
 *
 *   return NextResponse.json(result);
 * }
 * ```
 *
 * Then add your endpoint to the list above and in ./readme.md
 *
 * For complete API docs, examples, and migration guide: See ./readme.md
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  generateThumbnailBuffer,
  generatePdfThumbnailBuffer,
  thumbnailSourceKind,
  thumbKeyFor,
  thumbPrefixFor,
  THUMB_CONTENT_TYPE,
  THUMB_MAX_SOURCE_BYTES,
  type ThumbStatus,
} from "./thumbnails";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface UploadOptions {
  /** The file to upload (can be a File object or Buffer) */
  file: File | Buffer;

  /** Original filename (will be sanitized and timestamped) */
  fileName: string;

  /** MIME type of the file (e.g., "image/jpeg", "audio/ogg") */
  contentType: string;

  /**
   * Base path for the file (without environment prefix or timestamp)
   * Example: "telegram/photos/123456789"
   * The service will add environment prefix and timestamp automatically
   */
  basePath: string;

  /**
   * Optional metadata to attach to the file
   * Example: { duration: "30", sender: "patient" }
   */
  metadata?: Record<string, string>;

  /**
   * Optional expiry time for signed URL in seconds
   * Default: 3600 (1 hour)
   */
  signedUrlExpiry?: number;
}

export interface UploadResult {
  /** Full path to the file in object storage (with environment prefix) */
  filePath: string;

  /** Pre-signed URL for accessing the file (expires after signedUrlExpiry) */
  signedUrl: string;

  /** Original filename */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  /** MIME type of the uploaded file */
  contentType: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private environment: string;

  /** Dedup concurrent lazy-thumbnail requests for the same original. */
  private thumbInFlight = new Map<string, Promise<ThumbStatus>>();

  /**
   * Originals that recently failed to thumbnail (HEIC, corrupt, oversized),
   * so a grid re-render doesn't re-download and re-fail them every time.
   * Value is the epoch-ms until which the failure is remembered.
   */
  private thumbFailedUntil = new Map<string, number>();

  constructor() {
    // Initialize S3 client for RustFS
    // Use path-style URLs for RustFS behind Caddy reverse proxy
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT!;
    const bucket = process.env.OBJECT_STORAGE_BUCKET!;

    this.s3Client = new S3Client({
      endpoint: `https://${endpoint}`,
      region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.OBJECT_STORAGE_KEY!,
        secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
      },
      forcePathStyle: true, // Required for RustFS - use path-style URLs (endpoint/bucket)
    });

    this.bucket = bucket;
    this.environment = this.getEnvironment();

    // Validate configuration
    try {
      this.validateConfiguration();
    } catch (error) {
      console.warn("[StorageService] Initialization warning:", error);
    }
  }

  /**
   * Upload a file to RustFS object storage
   *
   * This is the main method that all upload endpoints should use.
   * It handles all the complexity of uploading to RustFS including:
   * - Environment prefixing (dev/staging/prod)
   * - File name sanitization and timestamping
   * - Upload execution
   * - Signed URL generation
   * - Error handling
   *
   * @param options - Upload configuration options
   * @returns Upload result with file path and signed URL
   * @throws Error if upload fails
   *
   * @example
   * ```typescript
   * const result = await storageService.upload({
   *   file: fileFromRequest,
   *   fileName: "photo.jpg",
   *   contentType: "image/jpeg",
   *   basePath: "telegram/photos/123456789"
   * });
   *
   * console.log(result.filePath); // "dev/telegram/photos/123456789/2024-01-15T10-30-00-photo.jpg"
   * console.log(result.signedUrl); // Pre-signed URL valid for 1 hour
   * ```
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const {
      file,
      fileName,
      contentType,
      basePath,
      metadata,
      signedUrlExpiry = 3600,
    } = options;

    // Build full path with environment prefix and timestamp
    const filePath = this.buildFilePath(basePath, fileName);

    // Convert file to buffer if needed
    const buffer = await this.fileToBuffer(file);

    try {
      console.log("[StorageService] Starting upload:", {
        basePath,
        fileName,
        filePath,
        fileSize: buffer.length,
        contentType,
      });

      // Upload to RustFS
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
          Body: buffer,
          ContentType: contentType,
          // ACL removed - not supported by RustFS
          Metadata: metadata,
        }),
      );

      console.log("[StorageService] Upload successful:", filePath);

      // Best-effort thumbnail — we already hold the buffer, so this skips the
      // S3 round-trip the lazy path pays. Never fails the upload.
      if (thumbnailSourceKind(contentType, filePath)) {
        await this.createThumbnailQuietly(filePath, buffer, contentType);
      }

      // Generate signed URL for file access
      const signedUrl = await this.getSignedUrl(filePath, signedUrlExpiry);

      return {
        filePath,
        signedUrl,
        fileName,
        fileSize: buffer.length,
        contentType,
      };
    } catch (error) {
      console.error("[StorageService] Upload failed:", {
        basePath,
        fileName,
        filePath,
        error: error instanceof Error ? error.message : error,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate a signed URL for accessing a file in object storage
   *
   * @param filePath - Full path to the file in object storage
   * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
   * @returns Pre-signed URL for accessing the file
   * @throws Error if URL generation fails
   *
   * @example
   * ```typescript
   * const url = await storageService.getSignedUrl(
   *   "dev/telegram/photos/123/image.jpg",
   *   7200 // 2 hours
   * );
   * ```
   */
  async getSignedUrl(
    filePath: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      return await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
        { expiresIn },
      );
    } catch (error) {
      console.error("[StorageService] Failed to generate signed URL:", {
        filePath,
        error: error instanceof Error ? error.message : error,
      });

      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete all files matching a prefix
   *
   * This is useful for cleaning up all media associated with a patient or telegram thread.
   * For example, deleting all files under "dev/patient-photos/{patientId}/"
   *
   * @param prefix - The prefix to match files (e.g., "dev/patient-photos/123-456-789")
   * @returns Number of files deleted
   * @throws Error if deletion fails
   *
   * @example
   * ```typescript
   * // Delete all patient photos for a specific patient
   * const count = await storageService.deleteByPrefix(
   *   `${env}/patient-photos/${patientId}`
   * );
   *
   * // Delete all telegram media for a specific chat
   * const count = await storageService.deleteByPrefix(
   *   `${env}/telegram/photos/${chatId}`
   * );
   * ```
   */
  /**
   * Delete exactly one object, plus its thumbnail if one was generated.
   *
   * Prefer this over passing a full key to `deleteByPrefix`. That works, but it
   * is a prefix match: a key ending `photo.jpg` also matches `photo.jpg.bak`
   * and anything else sharing those leading characters. Timestamped filenames
   * make a collision unlikely rather than impossible.
   *
   * Never throws. A failed storage delete must not block the caller from
   * removing the database row — an orphaned object is recoverable, a row
   * pointing at nothing is what users actually see.
   *
   * @returns true if the delete call succeeded
   */
  async deleteObject(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      const thumbKey = thumbKeyFor(key);
      if (thumbKey) {
        await this.s3Client
          .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: thumbKey }))
          .catch(() => {
            // A missing thumbnail is the normal case for non-image uploads.
          });
      }

      // Drop any remembered thumbnail failure so a re-upload to the same key
      // isn't shadowed by the old cooldown.
      this.thumbFailedUntil.delete(key);

      console.log("[StorageService] Deleted object:", key);
      return true;
    } catch (error) {
      console.error("[StorageService] Failed to delete object:", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let count = await this.deleteObjectsMatching(prefix);

    // Thumbnails mirror the original tree under `{env}/thumbs/` — deleting an
    // entity's media must sweep those too or they orphan forever.
    const thumbPrefix = thumbPrefixFor(prefix);
    if (thumbPrefix) {
      count += await this.deleteObjectsMatching(thumbPrefix);
    }

    return count;
  }

  private async deleteObjectsMatching(prefix: string): Promise<number> {
    try {
      console.log("[StorageService] Deleting files with prefix:", prefix);

      // List all objects with the given prefix
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );

      const objects = listResponse.Contents || [];

      if (objects.length === 0) {
        console.log("[StorageService] No files found with prefix:", prefix);
        return 0;
      }

      console.log(
        `[StorageService] Found ${objects.length} files to delete with prefix:`,
        prefix,
      );

      // Delete all objects (max 1000 per request)
      const deleteParams = {
        Bucket: this.bucket,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key! })),
          Quiet: true,
        },
      };

      await this.s3Client.send(new DeleteObjectsCommand(deleteParams));

      console.log(
        `[StorageService] Successfully deleted ${objects.length} files with prefix:`,
        prefix,
      );

      return objects.length;
    } catch (error) {
      console.error("[StorageService] Failed to delete files by prefix:", {
        prefix,
        error: error instanceof Error ? error.message : error,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - log the error and continue
      // Media deletion shouldn't block patient deletion
      console.warn(
        "[StorageService] Continuing despite deletion failure - media may remain in storage",
      );
      return 0;
    }
  }

  /**
   * Ensure a thumbnail exists for an original object key, generating it on
   * demand if missing. This is the lazy path that covers legacy images and
   * Go-bot uploads, which never pass through `upload()`.
   *
   * Returns "ready" when the thumbnail exists (or was just created) and
   * "unavailable" when one cannot be made — not an image, too large, HEIC,
   * corrupt, or the original is gone. "unavailable" is a normal outcome the
   * UI renders as a placeholder, not an error.
   */
  async ensureThumbnail(originalKey: string): Promise<ThumbStatus> {
    const thumbKey = thumbKeyFor(originalKey);
    if (!thumbKey) return "unavailable";

    const failedUntil = this.thumbFailedUntil.get(originalKey);
    if (failedUntil && failedUntil > Date.now()) return "unavailable";

    const inFlight = this.thumbInFlight.get(originalKey);
    if (inFlight) return inFlight;

    const task = this.ensureThumbnailUncached(originalKey, thumbKey).finally(
      () => this.thumbInFlight.delete(originalKey),
    );
    this.thumbInFlight.set(originalKey, task);
    return task;
  }

  private async ensureThumbnailUncached(
    originalKey: string,
    thumbKey: string,
  ): Promise<ThumbStatus> {
    try {
      if ((await this.objectExists(thumbKey)).exists) return "ready";

      const original = await this.objectExists(originalKey);
      const sourceKind = thumbnailSourceKind(original.contentType, originalKey);

      if (
        !original.exists ||
        !sourceKind ||
        original.size > THUMB_MAX_SOURCE_BYTES
      ) {
        return this.rememberThumbFailure(originalKey);
      }

      const buffer = await this.getObjectBuffer(originalKey);
      const thumb =
        sourceKind === "pdf"
          ? await generatePdfThumbnailBuffer(buffer)
          : await generateThumbnailBuffer(buffer);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbKey,
          Body: thumb,
          ContentType: THUMB_CONTENT_TYPE,
        }),
      );

      return "ready";
    } catch (error) {
      console.warn("[StorageService] Lazy thumbnail failed:", {
        originalKey,
        error: error instanceof Error ? error.message : error,
      });
      return this.rememberThumbFailure(originalKey);
    }
  }

  private rememberThumbFailure(originalKey: string): "unavailable" {
    // Crude bound: wholesale reset rather than LRU — the map only exists to
    // stop repeated decode attempts within a browsing session.
    if (this.thumbFailedUntil.size > 500) this.thumbFailedUntil.clear();
    this.thumbFailedUntil.set(originalKey, Date.now() + 15 * 60 * 1000);
    return "unavailable";
  }

  /**
   * Best-effort thumbnail at upload time, reusing the buffer already in hand.
   * Never throws — an upload must not fail because thumbnailing did.
   */
  private async createThumbnailQuietly(
    originalKey: string,
    original: Buffer,
    contentType?: string,
  ): Promise<void> {
    const thumbKey = thumbKeyFor(originalKey);
    if (!thumbKey || original.length > THUMB_MAX_SOURCE_BYTES) return;

    try {
      const thumb =
        thumbnailSourceKind(contentType, originalKey) === "pdf"
          ? await generatePdfThumbnailBuffer(original)
          : await generateThumbnailBuffer(original);
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbKey,
          Body: thumb,
          ContentType: THUMB_CONTENT_TYPE,
        }),
      );
    } catch (error) {
      console.warn("[StorageService] Upload-time thumbnail failed:", {
        originalKey,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * HEAD an object: existence, size, stored content type, and user metadata.
   * S3 lowercases metadata keys — `userId` at upload comes back as `userid`.
   */
  async objectExists(key: string): Promise<{
    exists: boolean;
    size: number;
    contentType?: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const head = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        exists: true,
        size: head.ContentLength ?? 0,
        contentType: head.ContentType,
        metadata: head.Metadata,
      };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  /** Download an object into memory. Only for size-capped internal use. */
  private async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`Object has no body: ${key}`);
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  /**
   * List files in object storage matching a prefix.
   * Returns file metadata (key, size, lastModified) without downloading content.
   */
  async listFiles(
    prefix: string,
    maxKeys: number = 100,
  ): Promise<
    { key: string; size: number; lastModified: Date | undefined }[]
  > {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        }),
      );

      return (response.Contents || []).map((obj) => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified,
      }));
    } catch (error) {
      console.error("[StorageService] Failed to list files:", {
        prefix,
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  /**
   * List every file under a prefix, following S3 continuation tokens.
   *
   * `listFiles` returns at most one page (1000 keys, per the S3 API) and gives
   * no indication that it truncated. Use this when the count matters — summing
   * sizes, or building an index that has to sort across the whole set.
   *
   * @param prefix - Prefix to match (include the environment prefix)
   * @param limit - Safety cap on total keys returned. Defaults to 100k, which
   *                is far above expected volume; the cap existing at all is what
   *                keeps a runaway bucket from exhausting memory.
   * @returns All matching files, plus whether the cap cut the listing short
   */
  async listAllFiles(
    prefix: string,
    limit: number = 100_000,
  ): Promise<{
    files: { key: string; size: number; lastModified: Date | undefined }[];
    truncated: boolean;
  }> {
    const files: { key: string; size: number; lastModified: Date | undefined }[] =
      [];
    let continuationToken: string | undefined = undefined;

    try {
      do {
        const response: ListObjectsV2CommandOutput = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          }),
        );

        for (const obj of response.Contents || []) {
          if (!obj.Key) continue;
          files.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified,
          });
          if (files.length >= limit) {
            return { files, truncated: true };
          }
        }

        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (continuationToken);

      return { files, truncated: false };
    } catch (error) {
      console.error("[StorageService] Failed to list all files:", {
        prefix,
        collected: files.length,
        error: error instanceof Error ? error.message : error,
      });
      // Return what we managed to collect rather than nothing — a partial
      // listing still renders, and `truncated` tells the caller not to trust
      // the totals.
      return { files, truncated: true };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PUBLIC HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get the current environment prefix (dev/staging/prod)
   *
   * @returns Environment string ("dev", "staging", or "prod")
   *
   * @example
   * ```typescript
   * const env = storageService.getEnvironmentPrefix();
   * const path = `${env}/patient-photos/${patientId}`;
   * ```
   */
  getEnvironmentPrefix(): string {
    return this.environment;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Build full file path with environment prefix and timestamp
   *
   * Format: {environment}/{basePath}/{timestamp}-{sanitizedFileName}
   * Example: "dev/telegram/photos/123/2024-01-15T10-30-00-photo.jpg"
   */
  private buildFilePath(basePath: string, fileName: string): string {
    // Sanitize filename to remove potentially problematic characters
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Add timestamp to prevent filename collisions
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;

    // Combine environment, base path, and unique filename
    return `${this.environment}/${basePath}/${uniqueFileName}`;
  }

  /**
   * Convert File or Buffer to Buffer
   * Handles both browser File objects and Node.js Buffers
   */
  private async fileToBuffer(file: File | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(file)) {
      return file;
    }

    // File object - convert to buffer
    const arrayBuffer = await (file as File).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get environment prefix (dev/staging/prod)
   * Based on NODE_ENV environment variable
   */
  private getEnvironment(): string {
    const env = process.env.NODE_ENV as string | undefined;
    if (env === "development") return "dev";
    // Handle staging environment (custom env value)
    if (env === "stage" || env === "staging") return "staging";
    return "prod";
  }

  /**
   * Validate that all required environment variables are set
   * Throws an error if configuration is invalid
   */
  private validateConfiguration(): void {
    const requiredVars = [
      "OBJECT_STORAGE_ENDPOINT",
      "OBJECT_STORAGE_KEY",
      "OBJECT_STORAGE_SECRET",
      "OBJECT_STORAGE_BUCKET",
    ];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(
        `[StorageService] Missing required environment variables: ${missing.join(", ")}`,
      );
    }

    // console.log("[StorageService] Configuration validated:", {
    //   endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    //   bucket: this.bucket,
    //   region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
    //   environment: this.environment,
    // });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE - USE THIS IN YOUR ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Singleton instance of the StorageService
 *
 * Import this in your upload endpoints:
 *
 * ```typescript
 * import { storageService } from "@/lib/storage";
 *
 * const result = await storageService.upload({ ... });
 * ```
 */
const globalForStorage = global as unknown as { storageService: StorageService };

export const storageService = globalForStorage.storageService || new StorageService();

if (process.env.NODE_ENV !== "production") globalForStorage.storageService = storageService;
