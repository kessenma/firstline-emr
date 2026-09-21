# Storage Service Design - Unified Upload Architecture

## Overview

This document outlines the architectural design for consolidating object storage upload logic into a reusable service while maintaining backward compatibility with existing endpoints.

## Current Problems

1. **Code Duplication**: 10+ upload endpoints with nearly identical logic
2. **Inconsistent Error Handling**: Different endpoints handle errors differently
3. **Hard to Maintain**: Changes need to be made in multiple places
4. **Testing Overhead**: Each endpoint needs separate testing
5. **Feature Addition**: New features (compression, scanning) require 10+ file changes

## Proposed Solution: Three-Phase Approach

### Phase 1: Shared Storage Service (Immediate)

Create a centralized storage service that all endpoints can use.

#### File Structure

```
apps/web/lib/storage/
├── index.ts                    # Main exports
├── storage-service.ts          # Core upload service
├── path-builder.ts             # Path generation logic
├── types.ts                    # TypeScript types
└── __tests__/
    └── storage-service.test.ts
```

#### Core Service API

```typescript
// lib/storage/storage-service.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadOptions {
  file: File | Buffer;
  fileName: string;
  contentType: string;
  basePath: string;
  metadata?: Record<string, string>;
  signedUrlExpiry?: number; // seconds
}

export interface UploadResult {
  filePath: string;
  signedUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private environment: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: `https://${process.env.OBJECT_STORAGE_ENDPOINT}`,
      region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.OBJECT_STORAGE_KEY!,
        secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
      },
      forcePathStyle: true,
    });
    
    this.bucket = process.env.OBJECT_STORAGE_BUCKET!;
    this.environment = this.getEnvironment();
  }

  /**
   * Upload a file to RustFS object storage
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

    // Build full path
    const filePath = this.buildFilePath(basePath, fileName);

    // Convert to buffer if needed
    const buffer = file instanceof Buffer
      ? file
      : Buffer.from(await file.arrayBuffer());

    try {
      // Upload to RustFS
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
          Body: buffer,
          ContentType: contentType,
          // ACL removed - not supported by RustFS
          Metadata: metadata,
        })
      );

      // Generate signed URL
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
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate a signed URL for a file
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
        { expiresIn }
      );
    } catch (error) {
      console.error("[StorageService] Failed to generate signed URL:", {
        filePath,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Build full file path with environment prefix
   */
  private buildFilePath(basePath: string, fileName: string): string {
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Add timestamp to prevent collisions
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;

    return `${this.environment}/${basePath}/${uniqueFileName}`;
  }

  /**
   * Get environment prefix (dev/staging/prod)
   */
  private getEnvironment(): string {
    const env = process.env.NODE_ENV;
    if (env === "development") return "dev";
    if (env === "staging") return "staging";
    return "prod";
  }
}

// Singleton instance
export const storageService = new StorageService();
```

#### Path Builder Utility

```typescript
// lib/storage/path-builder.ts

export interface TelegramPhotoPathOptions {
  chatId: string;
}

export interface TelegramAudioPathOptions {
  chatId: string;
}

export interface InternalMessagePathOptions {
  threadId: string;
  messageType: "audio" | "document" | "photo";
}

export interface PatientPhotoPathOptions {
  patientId: string;
}

export interface MedicalLicensePathOptions {
  userId: string;
  specialty: string;
}

export class PathBuilder {
  /**
   * Build path for telegram photo uploads
   */
  static telegramPhoto(options: TelegramPhotoPathOptions): string {
    const { chatId } = options;
    const sanitizedChatId = chatId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `telegram/photos/${sanitizedChatId}`;
  }

  /**
   * Build path for telegram audio uploads
   */
  static telegramAudio(options: TelegramAudioPathOptions): string {
    const { chatId } = options;
    const sanitizedChatId = chatId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `telegram/audio/${sanitizedChatId}`;
  }

  /**
   * Build path for internal message uploads
   */
  static internalMessage(options: InternalMessagePathOptions): string {
    const { threadId, messageType } = options;
    const sanitizedThreadId = threadId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `internal-messages-${messageType}/${sanitizedThreadId}`;
  }

  /**
   * Build path for patient photo uploads
   */
  static patientPhoto(options: PatientPhotoPathOptions): string {
    const { patientId } = options;
    const sanitizedPatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `patient-photos/${sanitizedPatientId}`;
  }

  /**
   * Build path for medical license uploads
   */
  static medicalLicense(options: MedicalLicensePathOptions): string {
    const { userId, specialty } = options;
    const cleanSpecialty = specialty.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    return `medical_license/${cleanSpecialty}`;
  }
}
```

#### Type Definitions

```typescript
// lib/storage/types.ts

export type UploadContext = 
  | TelegramUploadContext
  | InternalMessageUploadContext
  | PatientUploadContext
  | MedicalLicenseUploadContext;

export interface TelegramUploadContext {
  type: "telegram";
  chatId: string;
  mediaType: "photo" | "audio" | "video";
  sender?: string;
  duration?: string;
}

export interface InternalMessageUploadContext {
  type: "internal-message";
  threadId: string;
  mediaType: "audio" | "document" | "photo";
  senderInfo: string;
  duration?: string;
}

export interface PatientUploadContext {
  type: "patient";
  patientId: string;
  uploadedBy: string;
}

export interface MedicalLicenseUploadContext {
  type: "medical-license";
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
}
```

### Phase 2: Refactor Existing Endpoints (Week 1-2)

Update existing endpoints to use the shared service while maintaining the same API.

#### Example: Before and After

**Before (Original):**
```typescript
// apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts

export async function POST(req: NextRequest, context: { params: Promise<{ telegramChatId: string }> }) {
  const { telegramChatId } = await context.params;
  const formData = await req.formData();
  const file = formData.get("file") as File;
  
  // ... validation ...
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-${file.name}`;
  const folder = process.env.NODE_ENV === "development" ? "dev" : "prod";
  const filePath = `${folder}/telegram/photos/${telegramChatId}/${fileName}`;
  
  const fileBuffer = await file.arrayBuffer();
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET!,
      Key: filePath,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type || "image/jpeg",
    })
  );
  
  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET!,
      Key: filePath,
    }),
    { expiresIn: 3600 }
  );
  
  return NextResponse.json({ filePath, signedUrl });
}
```

**After (Using Service):**
```typescript
// apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts

import { storageService } from "@/lib/storage";
import { PathBuilder } from "@/lib/storage/path-builder";

export async function POST(req: NextRequest, context: { params: Promise<{ telegramChatId: string }> }) {
  try {
    const { telegramChatId } = await context.params;
    
    if (!telegramChatId) {
      return NextResponse.json(
        { error: "Missing Telegram Chat ID" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is missing" },
        { status: 400 }
      );
    }

    // Use storage service
    const result = await storageService.upload({
      file,
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      basePath: PathBuilder.telegramPhoto({ chatId: telegramChatId }),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[upload-photo] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
```

**Result:**
- ✅ **40+ lines reduced to ~30 lines**
- ✅ **Same API surface** - no breaking changes
- ✅ **Better error handling** - consistent across all endpoints
- ✅ **Easier to test** - mock the service
- ✅ **Type-safe** - TypeScript ensures correct usage

### Phase 3: Optional Consolidation (Future)

After Phase 1 & 2, you can decide if you want to consolidate further.

#### Option A: Domain-Grouped Endpoints

```typescript
// POST /api/telegram/upload-media
{
  mediaType: "photo" | "audio" | "video",
  chatId: string,
  file: File,
  metadata?: { duration?, sender? }
}

// POST /api/internal-messages/upload-media
{
  mediaType: "audio" | "document" | "photo",
  threadId: string,
  file: File,
  metadata?: { duration?, senderInfo? }
}
```

#### Option B: Single Unified Endpoint

```typescript
// POST /api/upload-media
{
  uploadType: "telegram_photo" | "telegram_audio" | "internal_message_audio" | ...,
  context: Record<string, any>,
  file: File
}
```

## Benefits Summary

### Phase 1 (Shared Service) Benefits
- ✅ Eliminate code duplication
- ✅ Consistent error handling
- ✅ Easier testing (mock one service)
- ✅ Single place to add features
- ✅ Better logging and monitoring
- ✅ Type safety with TypeScript
- ✅ **No breaking changes**

### Phase 2 (Refactor Endpoints) Benefits
- ✅ Cleaner, more maintainable code
- ✅ Easier to understand
- ✅ Less prone to bugs
- ✅ **Still no breaking changes**

### Phase 3 (Optional Consolidation) Benefits
- ✅ Fewer endpoints to maintain
- ✅ More flexible API
- ✅ Easier client-side usage (one endpoint to call)
- ⚠️ **Breaking changes** - requires client updates

## Migration Path

### Week 1: Create Storage Service
1. Create `lib/storage/storage-service.ts`
2. Create `lib/storage/path-builder.ts`
3. Create `lib/storage/types.ts`
4. Add unit tests
5. Test in isolation

### Week 2: Refactor 2-3 Endpoints
1. Start with telegram photo upload (simplest)
2. Then telegram audio upload
3. Verify everything works

### Week 3: Refactor Remaining Endpoints
1. Internal message uploads
2. Patient uploads
3. Medical license uploads
4. Comprehensive testing

### Week 4+: Decide on Further Consolidation
1. Gather feedback from team
2. Review usage patterns
3. Decide if domain-grouped or unified endpoint makes sense
4. Plan migration if proceeding

## Testing Strategy

### Unit Tests
```typescript
// lib/storage/__tests__/storage-service.test.ts

describe("StorageService", () => {
  it("should upload file successfully", async () => {
    const mockFile = new File(["test"], "test.jpg");
    const result = await storageService.upload({
      file: mockFile,
      fileName: "test.jpg",
      contentType: "image/jpeg",
      basePath: "telegram/photos/123",
    });
    
    expect(result.filePath).toContain("telegram/photos/123");
    expect(result.signedUrl).toBeDefined();
  });
  
  it("should handle upload failures gracefully", async () => {
    // Test error handling
  });
});
```

### Integration Tests
```typescript
// Test actual endpoints still work after migration
describe("Upload Endpoints", () => {
  it("POST /api/telegram-thread/[id]/upload-photo", async () => {
    const response = await fetch("/api/telegram-thread/123/upload-photo", {
      method: "POST",
      body: formData,
    });
    
    expect(response.status).toBe(200);
    expect(response.json()).toHaveProperty("filePath");
    expect(response.json()).toHaveProperty("signedUrl");
  });
});
```

## Monitoring & Observability

Add metrics to the storage service:

```typescript
class StorageService {
  async upload(options: UploadOptions): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      const result = await this._upload(options);
      
      // Log success metrics
      console.log("[StorageService] Upload success", {
        basePath: options.basePath,
        fileSize: result.fileSize,
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      // Log failure metrics
      console.error("[StorageService] Upload failed", {
        basePath: options.basePath,
        duration: Date.now() - startTime,
        error,
      });
      throw error;
    }
  }
}
```

## Conclusion

**Recommendation: Start with Phase 1**

1. ✅ Create shared storage service
2. ✅ Refactor existing endpoints to use it
3. ⏸️ Pause and evaluate
4. 🤔 Decide if further consolidation is worth it

This gives you **immediate benefits** without breaking changes, and keeps the **option open** for further consolidation if you decide it's worth the migration effort.

---

**Status**: Design Complete - Ready for Implementation
**Effort**: Phase 1 (1-2 days), Phase 2 (1 week), Phase 3 (Optional)
**Risk**: Low - No breaking changes in Phase 1 & 2