# Storage Service Migration Guide

## Overview

This guide helps you migrate the remaining upload endpoints to use the shared `StorageService`.

**Progress: 2/7 endpoints migrated ✅**

## What is the StorageService?

The `StorageService` is a centralized service that handles all file uploads to RustFS object storage. It provides:

- ✅ Consistent upload logic across all endpoints
- ✅ Automatic environment prefixing (dev/staging/prod)
- ✅ File name sanitization and timestamping
- ✅ Signed URL generation
- ✅ Error handling and logging
- ✅ Type safety with TypeScript

## Migration Status

### ✅ Completed (2/7)

- [x] `apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts`
- [x] `apps/web/app/api/internal-messages/[id]/upload-audio/route.ts`

### 🔄 Remaining (5/7)

- [ ] `apps/web/app/api/telegram-thread/[telegramChatId]/upload-audio/route.ts`
- [ ] `apps/web/app/api/internal-messages/[id]/upload-document/route.ts`
- [ ] `apps/web/app/api/internal-messages/[id]/upload-photo/route.ts`
- [ ] `apps/web/app/api/patient/[id]/upload-photo/route.ts`
- [ ] `apps/web/app/api/upload-license/route.ts`

## Migration Steps

### Step 1: Import the Storage Service

**Before:**
```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: `https://${process.env.OBJECT_STORAGE_ENDPOINT}`,
  region: process.env.OBJECT_STORAGE_REGION || "fra1",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_KEY!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
  },
  forcePathStyle: true,
});
```

**After:**
```typescript
import { storageService } from "@/lib/storage";
```

### Step 2: Replace Upload Logic

**Before:**
```typescript
// Generate unique file name with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
const fileName = `${timestamp}-${sanitizedFileName}`;

// Determine environment folder
const folder = process.env.NODE_ENV === "development" ? "dev" : "prod";
const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
const filePath = `${folder}/some-path/${sanitizedId}/${fileName}`;

// Convert File to Buffer
const fileBuffer = await file.arrayBuffer();

// Upload to RustFS
await s3Client.send(
  new PutObjectCommand({
    Bucket: process.env.OBJECT_STORAGE_BUCKET!,
    Key: filePath,
    Body: Buffer.from(fileBuffer),
    ContentType: file.type || "application/octet-stream",
  })
);

// Generate signed URL
const signedUrl = await getSignedUrl(
  s3Client,
  new GetObjectCommand({
    Bucket: process.env.OBJECT_STORAGE_BUCKET!,
    Key: filePath,
  }),
  { expiresIn: 3600 }
);

return NextResponse.json({ filePath, signedUrl });
```

**After:**
```typescript
// Sanitize ID for use in file path
const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");

// Build base path (environment prefix added automatically)
const basePath = `some-path/${sanitizedId}`;

// Upload using shared storage service
const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "application/octet-stream",
  basePath,
  metadata: { /* optional metadata */ },
  signedUrlExpiry: 3600, // optional, defaults to 1 hour
});

return NextResponse.json(result);
```

### Step 3: Update the Tracking List

After migrating an endpoint, mark it as completed in `apps/web/lib/storage/storage-service.ts`:

```typescript
* ✅ MIGRATED TO USE THIS SERVICE:
* ─────────────────────────────────────────────────────────────────────────
* [✓] apps/web/app/api/your-endpoint/route.ts  // <-- Add checkmark
```

## Migration Examples

### Example 1: Telegram Audio Upload

**File:** `apps/web/app/api/telegram-thread/[telegramChatId]/upload-audio/route.ts`

**Path Pattern:** `telegram/audio/{chatId}`

```typescript
// Sanitize chat ID
const sanitizedChatId = telegramChatId.replace(/[^a-zA-Z0-9_-]/g, "");

// Build base path
const basePath = `telegram/audio/${sanitizedChatId}`;

// Upload with metadata
const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "audio/ogg",
  basePath,
  metadata: {
    duration: formData.get("duration") as string,
    sender: "patient", // or other sender info
  },
});

return NextResponse.json(result);
```

### Example 2: Internal Messages Document Upload

**File:** `apps/web/app/api/internal-messages/[id]/upload-document/route.ts`

**Path Pattern:** `internal-messages-documents/{threadId}`

```typescript
// Get thread ID
const pathnameParts = req.nextUrl.pathname.split("/");
const threadId = pathnameParts[pathnameParts.length - 2];

// Verify authentication
const session = await verifySessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Build sender info
const { firstName, lastName, accountType } = session;
const senderInfo = `${accountType}-${firstName}-${lastName}`
  .trim()
  .replace(/\s+/g, "_");

// Sanitize thread ID
const sanitizedThreadId = threadId.replace(/[^a-zA-Z0-9_-]/g, "");

// Build base path
const basePath = `internal-messages-documents/${sanitizedThreadId}`;

// Upload
const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "application/octet-stream",
  basePath,
  metadata: {
    sender: senderInfo,
    uploadedAt: new Date().toISOString(),
  },
});

return NextResponse.json({
  ...result,
  fileName: file.name, // Keep original filename in response if needed
});
```

### Example 3: Patient Photo Upload

**File:** `apps/web/app/api/patient/[id]/upload-photo/route.ts`

**Path Pattern:** `patient-photos/{patientId}`

```typescript
// Get patient ID from params
const { id: patientId } = await context.params;

// Verify authentication
const session = await verifySessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Sanitize patient ID
const sanitizedPatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, "");

// Build base path
const basePath = `patient-photos/${sanitizedPatientId}`;

// Upload
const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "image/jpeg",
  basePath,
  metadata: {
    uploadedBy: `${session.firstName} ${session.lastName}`,
    uploadedAt: new Date().toISOString(),
  },
});

return NextResponse.json(result);
```

### Example 4: Medical License Upload

**File:** `apps/web/app/api/upload-license/route.ts`

**Path Pattern:** `medical_license/{specialty}`

**Note:** This endpoint has custom file naming and database logic. Be careful to preserve it!

```typescript
// Get form data
const file = formData.get("file") as File;
const firstName = formData.get("firstName") as string;
const lastName = formData.get("lastName") as string;
const specialty = formData.get("specialty") as string;
const userId = formData.get("userId") as string;

// Clean specialty name for folder
const cleanSpecialty = specialty.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

// Build base path
const basePath = `medical_license/${cleanSpecialty}`;

// Upload
const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "application/octet-stream",
  basePath,
  metadata: {
    userId,
    specialty,
    uploadedBy: `${firstName} ${lastName}`,
  },
});

// Save to database (keep existing database logic)
const licenseData = {
  specialty,
  licenseUrl: result.filePath, // Use the filePath from result
  uploadedAt: new Date(),
};

// ... rest of database logic ...

return NextResponse.json({
  ...result,
  fileName: file.name,
  fileType: file.type,
});
```

## Path Patterns Reference

Quick reference for base paths used in each endpoint:

| Endpoint | Base Path Pattern | Example |
|----------|------------------|---------|
| Telegram Photo | `telegram/photos/{chatId}` | `telegram/photos/123456789` |
| Telegram Audio | `telegram/audio/{chatId}` | `telegram/audio/123456789` |
| Internal Message Audio | `internal-messages-audio/{threadId}` | `internal-messages-audio/thread-123` |
| Internal Message Document | `internal-messages-documents/{threadId}` | `internal-messages-documents/thread-123` |
| Internal Message Photo | `internal-messages-photos/{threadId}` | `internal-messages-photos/thread-123` |
| Patient Photo | `patient-photos/{patientId}` | `patient-photos/patient-456` |
| Medical License | `medical_license/{specialty}` | `medical_license/cardiology` |

**Note:** The storage service automatically adds the environment prefix (dev/staging/prod).

## Testing After Migration

After migrating an endpoint, test it thoroughly:

### 1. Unit Test the Endpoint

```bash
# If you have tests, run them
npm test -- upload-photo
```

### 2. Manual Testing

```bash
# Example: Test telegram photo upload
curl -X POST http://localhost:3000/api/telegram-thread/123456789/upload-photo \
  -F "file=@test-image.jpg"

# Expected response:
# {
#   "filePath": "dev/telegram/photos/123456789/2024-01-15T10-30-00-test-image.jpg",
#   "signedUrl": "https://...",
#   "fileName": "test-image.jpg",
#   "fileSize": 12345,
#   "contentType": "image/jpeg"
# }
```

### 3. Verify in RustFS Console

1. Open: http://localhost:9001
2. Navigate to your bucket
3. Check the file exists in the correct path
4. Verify the signed URL works

## Common Pitfalls

### ❌ Don't forget to sanitize IDs

```typescript
// BAD - using unsanitized ID
const basePath = `telegram/photos/${telegramChatId}`;

// GOOD - sanitize first
const sanitizedChatId = telegramChatId.replace(/[^a-zA-Z0-9_-]/g, "");
const basePath = `telegram/photos/${sanitizedChatId}`;
```

### ❌ Don't include environment in basePath

```typescript
// BAD - environment is added automatically
const folder = process.env.NODE_ENV === "development" ? "dev" : "prod";
const basePath = `${folder}/telegram/photos/${chatId}`;

// GOOD - let the service handle it
const basePath = `telegram/photos/${sanitizedChatId}`;
```

### ❌ Don't include timestamp in fileName

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

### ✅ Do preserve existing validation logic

```typescript
// KEEP all validation logic
if (!file) {
  return NextResponse.json({ error: "File is missing" }, { status: 400 });
}

// KEEP authentication checks
const session = await verifySessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// KEEP file type validation
const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
if (!allowedTypes.includes(file.type)) {
  return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
}
```

## Benefits After Migration

Once all endpoints are migrated, you'll have:

- ✅ **~60% less code** - No more duplicated upload logic
- ✅ **Consistent error handling** - All endpoints handle errors the same way
- ✅ **Easier to maintain** - One place to update upload logic
- ✅ **Better logging** - Centralized logging for all uploads
- ✅ **Type safety** - TypeScript ensures correct usage
- ✅ **Easy to add features** - Add compression, virus scanning, etc. in one place

## Need Help?

- **Storage Service Code:** `apps/web/lib/storage/storage-service.ts`
- **Migrated Examples:** 
  - `apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts`
  - `apps/web/app/api/internal-messages/[id]/upload-audio/route.ts`
- **Design Document:** `docs/STORAGE_SERVICE_DESIGN.md`

---

**Happy Migrating! 🚀**