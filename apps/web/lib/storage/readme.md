# Storage Service - Centralized Object Storage for RustFS

## Overview

This is the **"Octopus Head"** - the centralized service for all file uploads to RustFS object storage. All upload endpoints in the web application use this service to ensure consistency and eliminate code duplication.

## Quick Start

```typescript
import { storageService } from "@/lib/storage";

// Upload a file
const result = await storageService.upload({
  file,                                    // File or Buffer
  fileName: file.name,                     // Original filename
  contentType: file.type || "image/jpeg",  // MIME type
  basePath: "telegram/photos/123456789",   // Path (without env prefix)
});

// Use the result
console.log(result.filePath);   // "dev/telegram/photos/123456789/2024-01-15T10-30-00-photo.jpg"
console.log(result.signedUrl);  // Pre-signed URL (valid for 1 hour)
console.log(result.fileSize);   // File size in bytes
```

## Endpoints Using This Service

### ✅ All Endpoints Migrated! (7/7 - Complete! 🎉)

- [x] `apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts`
- [x] `apps/web/app/api/telegram-thread/[telegramChatId]/upload-audio/route.ts`
- [x] `apps/web/app/api/internal-messages/[id]/upload-audio/route.ts`
- [x] `apps/web/app/api/internal-messages/[id]/upload-document/route.ts`
- [x] `apps/web/app/api/internal-messages/[id]/upload-photo/route.ts`
- [x] `apps/web/app/api/patient/[id]/upload-photo/route.ts`
- [x] `apps/web/app/api/upload-license/route.ts`

### 📝 Note on Services

**Notifications Server (`apps/notifications-server`):** The new Go-based notifications server has its own S3-compatible storage implementation. Future integration with this TypeScript storage service is planned for consistency across the platform.

**Legacy Telegram Bot (Being Deprecated):** The legacy telegram bot (`apps/telegram-bot/`) is being phased out in favor of the notifications-server. The old bot has its own upload implementation and does NOT use this service.

## API Documentation

### `storageService.upload(options)`

Main method for uploading files to RustFS object storage.

#### Parameters

```typescript
interface UploadOptions {
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
```

#### Returns

```typescript
interface UploadResult {
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
```

#### Example

```typescript
const result = await storageService.upload({
  file: fileFromRequest,
  fileName: "photo.jpg",
  contentType: "image/jpeg",
  basePath: "telegram/photos/123456789",
  metadata: { uploadedBy: "user-123" },
  signedUrlExpiry: 7200, // 2 hours
});

console.log(result);
// {
//   filePath: "dev/telegram/photos/123456789/2024-01-15T10-30-00-photo.jpg",
//   signedUrl: "https://storage.example.com/...",
//   fileName: "photo.jpg",
//   fileSize: 12345,
//   contentType: "image/jpeg"
// }
```

### `storageService.deleteObject(filePath)`

Delete exactly one object, plus its derived thumbnail if one exists.

Prefer this over passing a full key to `deleteByPrefix`. That also works, but it
is a *prefix* match — a key ending `photo.jpg` would also match `photo.jpg.bak`.

Never throws; returns `false` if the delete failed so the caller can decide
whether to proceed. Typical use is to remove the database row regardless: an
orphaned object is recoverable, a row pointing at a missing file is not.

```typescript
const ok = await storageService.deleteObject(media.url);
await db.delete(patientMedia).where(eq(patientMedia.id, mediaId));
```

- `filePath` (string): Full key in object storage (including the env prefix)
- Returns `Promise<boolean>`

### `storageService.getSignedUrl(filePath, expiresIn?)`

Generate a signed URL for accessing a file in object storage.

#### Parameters

- `filePath` (string): Full path to the file in object storage
- `expiresIn` (number, optional): Expiry time in seconds (default: 3600 = 1 hour)

#### Returns

- `Promise<string>`: Pre-signed URL for accessing the file

#### Example

```typescript
const url = await storageService.getSignedUrl(
  "dev/telegram/photos/123/image.jpg",
  7200 // 2 hours
);
```

## What the Service Handles Automatically

- ✅ **Environment Prefixing**: Automatically adds `dev/`, `staging/`, or `prod/` based on `NODE_ENV`
- ✅ **Timestamp Generation**: Adds ISO timestamp to prevent filename collisions
- ✅ **File Name Sanitization**: Removes problematic characters from filenames
- ✅ **Upload to RustFS**: Handles S3-compatible upload with proper configuration
- ✅ **Signed URL Generation**: Creates pre-signed URLs for secure file access
- ✅ **Error Handling**: Comprehensive error logging and handling
- ✅ **Type Safety**: Full TypeScript support with strict types

## Path Patterns

All upload endpoints follow consistent path patterns:

| Upload Type | Base Path Pattern | Example |
|-------------|------------------|---------|
| Telegram Photos | `telegram/photos/{chatId}` | `telegram/photos/123456789` |
| Telegram Audio | `telegram/audio/{chatId}` | `telegram/audio/123456789` |
| Internal Message Audio | `internal-messages-audio/{threadId}` | `internal-messages-audio/thread-123` |
| Internal Message Documents | `internal-messages-documents/{threadId}` | `internal-messages-documents/thread-123` |
| Internal Message Photos | `internal-messages-photos/{threadId}` | `internal-messages-photos/thread-123` |
| Patient Photos | `patient-photos/{patientId}` | `patient-photos/patient-456` |
| Medical Licenses | `medical_license/{specialty}` | `medical_license/cardiology` |

**Important:** Do NOT include the environment prefix in your `basePath`. The service adds it automatically!

## Creating a New Upload Endpoint

### Step 1: Create Your Route

```typescript
// apps/web/app/api/your-domain/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "File is missing" },
        { status: 400 }
      );
    }

    // 2. Sanitize IDs and build base path
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    const basePath = `your-domain/uploads/${sanitizedId}`;

    // 3. Upload using storage service
    const result = await storageService.upload({
      file,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      basePath,
      metadata: {
        uploadedBy: "user-id",
        uploadedAt: new Date().toISOString(),
      },
    });

    // 4. Return result
    return NextResponse.json(result);
  } catch (error) {
    console.error("[upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
```

### Step 2: Update the Tracking List

Add your endpoint to the list at the top of this README and in `storage-service.ts`.

### Step 3: Test Your Endpoint

```bash
curl -X POST http://localhost:3000/api/your-domain/upload \
  -F "file=@test-file.jpg"
```

## Migrating an Existing Endpoint

See the detailed migration guide: [`docs/STORAGE_SERVICE_MIGRATION_GUIDE.md`](../../../docs/STORAGE_SERVICE_MIGRATION_GUIDE.md)

### Quick Migration Steps

1. **Replace imports:**
   ```typescript
   // Before
   import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
   
   // After
   import { storageService } from "@/lib/storage";
   ```

2. **Replace upload logic (~60 lines → ~10 lines):**
   ```typescript
   // Before: 60+ lines of S3 setup, path building, upload, signed URL...
   
   // After:
   const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
   const basePath = `domain/path/${sanitizedId}`;
   
   const result = await storageService.upload({
     file,
     fileName: file.name,
     contentType: file.type || "application/octet-stream",
     basePath,
   });
   
   return NextResponse.json(result);
   ```

3. **Update tracking:** Mark your endpoint as migrated in this README.

## Common Pitfalls

### ❌ Don't Include Environment in Base Path

```typescript
// BAD - environment is added automatically
const folder = process.env.NODE_ENV === "development" ? "dev" : "prod";
const basePath = `${folder}/telegram/photos/${chatId}`;

// GOOD - let the service handle it
const basePath = `telegram/photos/${sanitizedChatId}`;
```

### ❌ Don't Include Timestamp in File Name

```typescript
// BAD - timestamp is added automatically
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `${timestamp}-${file.name}`;

// GOOD - use original filename
const result = await storageService.upload({
  file,
  fileName: file.name, // Service handles timestamping
  // ...
});
```

### ✅ Do Sanitize IDs Before Using in Paths

```typescript
// ALWAYS sanitize IDs
const sanitizedChatId = chatId.replace(/[^a-zA-Z0-9_-]/g, "");
const basePath = `telegram/photos/${sanitizedChatId}`;
```

### ✅ Do Preserve Validation Logic

```typescript
// Keep all existing validation
if (!file) {
  return NextResponse.json({ error: "File is missing" }, { status: 400 });
}

// Keep authentication checks
const session = await verifySessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Environment Variables

Required environment variables (configured in `docker-compose.web.yml`):

```env
OBJECT_STORAGE_ENDPOINT=your-rustfs-endpoint.com
OBJECT_STORAGE_KEY=your-access-key
OBJECT_STORAGE_SECRET=your-secret-key
OBJECT_STORAGE_BUCKET=your-bucket-name
OBJECT_STORAGE_REGION=us-east-1
```

## Testing

### Unit Testing

```bash
# If you have tests
npm test -- storage-service
```

### Manual Testing

```bash
# Test an endpoint
curl -X POST http://localhost:3000/api/telegram-thread/123/upload-photo \
  -F "file=@test-image.jpg"

# Expected response
{
  "filePath": "dev/telegram/photos/123/2024-01-15T10-30-00-test-image.jpg",
  "signedUrl": "https://...",
  "fileName": "test-image.jpg",
  "fileSize": 12345,
  "contentType": "image/jpeg"
}
```

### Verify in RustFS Console

1. Open http://localhost:9001
2. Login with your credentials
3. Navigate to your bucket
4. Check file exists at the correct path
5. Test the signed URL in browser

## Benefits

- **60% Less Code**: Eliminates ~450 lines of duplicate upload logic
- **Consistent Errors**: All endpoints handle errors the same way
- **Single Source of Truth**: Update once, benefit everywhere
- **Type Safe**: TypeScript prevents common mistakes
- **Easy to Extend**: Add features like compression, virus scanning in one place
- **Well Documented**: Clear examples and instructions

## Future Enhancements

Potential features to add to the service:

- [ ] Image compression/optimization
- [ ] Virus scanning integration
- [ ] Automatic thumbnail generation
- [ ] File size validation
- [ ] CDN integration
- [ ] Upload progress tracking
- [ ] Batch upload support
- [ ] File metadata extraction

## Related Documentation

- **Migration Guide**: [`docs/STORAGE_SERVICE_MIGRATION_GUIDE.md`](../../../docs/STORAGE_SERVICE_MIGRATION_GUIDE.md)
- **Design Document**: [`docs/STORAGE_SERVICE_DESIGN.md`](../../../docs/STORAGE_SERVICE_DESIGN.md)
- **Implementation Summary**: [`STORAGE_SERVICE_IMPLEMENTATION_SUMMARY.md`](../../../STORAGE_SERVICE_IMPLEMENTATION_SUMMARY.md)
- **RustFS Testing**: [`docs/RUSTFS_TESTING_GUIDE.md`](../../../docs/RUSTFS_TESTING_GUIDE.md)
- **RustFS Migration**: [`RUSTFS_MIGRATION_SUMMARY.md`](../../../RUSTFS_MIGRATION_SUMMARY.md)

## Support

Need help? Check:
1. **This README** - Complete API documentation
2. **Migrated examples** - Look at the 2 migrated endpoints
3. **Migration guide** - Step-by-step instructions
4. **Design document** - Architectural rationale

---

**Maintained by:** Web Application Team  
**Last Updated:** 2024  
**Status:** ✅ Complete - 7/7 endpoints migrated! 🎉