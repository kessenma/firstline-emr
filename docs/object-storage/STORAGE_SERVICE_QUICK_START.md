# Storage Service Quick Start Guide

## 🚀 Quick Start (30 seconds)

You now have a shared storage service for all file uploads. Here's how to use it:

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

## 📍 The "Octopus Head"

**All upload endpoints are tracked here:**
`apps/web/lib/storage/storage-service.ts`

This file contains:
- ✅ List of all endpoints using the service
- 🤖 Instructions for AI assistants
- 📚 Usage examples
- 🔧 Core upload logic

## 📊 Migration Status

**Migrated (2/7):** ✅
- Telegram photo upload
- Internal message audio upload

**To Migrate (5/7):** 🔄
- Telegram audio upload
- Internal message document upload
- Internal message photo upload
- Patient photo upload
- Medical license upload

## 🎯 How to Migrate an Endpoint

### Step 1: Replace imports

**Before:**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ ... }); // 10+ lines
```

**After:**
```typescript
import { storageService } from "@/lib/storage";
```

### Step 2: Replace upload logic

**Before (~60 lines):**
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `${timestamp}-${file.name}`;
const folder = process.env.NODE_ENV === "development" ? "dev" : "prod";
const filePath = `${folder}/path/${fileName}`;
const fileBuffer = await file.arrayBuffer();

await s3Client.send(
  new PutObjectCommand({
    Bucket: process.env.OBJECT_STORAGE_BUCKET!,
    Key: filePath,
    Body: Buffer.from(fileBuffer),
    ContentType: file.type,
  })
);

const signedUrl = await getSignedUrl(s3Client, ...);
return NextResponse.json({ filePath, signedUrl });
```

**After (~10 lines):**
```typescript
const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
const basePath = `path/${sanitizedId}`;

const result = await storageService.upload({
  file,
  fileName: file.name,
  contentType: file.type || "application/octet-stream",
  basePath,
});

return NextResponse.json(result);
```

### Step 3: Update tracking list

Mark endpoint as migrated in `apps/web/lib/storage/storage-service.ts`:
```typescript
* [✓] apps/web/app/api/your-endpoint/route.ts
```

## 📋 Path Patterns

| Upload Type | Base Path | Example |
|-------------|-----------|---------|
| Telegram Photo | `telegram/photos/{chatId}` | `telegram/photos/123456789` |
| Telegram Audio | `telegram/audio/{chatId}` | `telegram/audio/123456789` |
| Internal Message Audio | `internal-messages-audio/{threadId}` | `internal-messages-audio/thread-123` |
| Internal Message Document | `internal-messages-documents/{threadId}` | `internal-messages-documents/thread-123` |
| Internal Message Photo | `internal-messages-photos/{threadId}` | `internal-messages-photos/thread-123` |
| Patient Photo | `patient-photos/{patientId}` | `patient-photos/patient-456` |
| Medical License | `medical_license/{specialty}` | `medical_license/cardiology` |

**Note:** Environment prefix (dev/staging/prod) is added automatically!

## 🔍 Adding a NEW Upload Endpoint

1. **Create your endpoint file:**
```typescript
// apps/web/app/api/your-domain/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";

export async function POST(req: NextRequest) {
  // 1. Validate request
  const formData = await req.formData();
  const file = formData.get("file") as File;
  
  if (!file) {
    return NextResponse.json({ error: "File is missing" }, { status: 400 });
  }

  // 2. Build base path
  const basePath = "your-domain/uploads";

  // 3. Upload
  const result = await storageService.upload({
    file,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    basePath,
  });

  // 4. Return result
  return NextResponse.json(result);
}
```

2. **Add to tracking list** in `apps/web/lib/storage/storage-service.ts`:
```typescript
* [✓] apps/web/app/api/your-domain/upload/route.ts
```

## ✅ What the Service Handles Automatically

- ✅ Environment prefixing (dev/staging/prod)
- ✅ Timestamp generation (prevents filename collisions)
- ✅ File name sanitization (removes problematic characters)
- ✅ Upload to RustFS
- ✅ Signed URL generation
- ✅ Error handling and logging
- ✅ Type safety with TypeScript

## ❌ What You Still Need to Handle

- ❌ Request validation (check if file exists, correct type, etc.)
- ❌ Authentication/authorization
- ❌ File size limits
- ❌ Database operations (if needed)
- ❌ Custom business logic

## 🧪 Testing

```bash
# 1. Test a migrated endpoint
curl -X POST http://localhost:3000/api/telegram-thread/123/upload-photo \
  -F "file=@test-image.jpg"

# 2. Check response
# {
#   "filePath": "dev/telegram/photos/123/2024-01-15T10-30-00-test-image.jpg",
#   "signedUrl": "https://...",
#   "fileName": "test-image.jpg",
#   "fileSize": 12345,
#   "contentType": "image/jpeg"
# }

# 3. Verify in RustFS Console
# Open http://localhost:9001
# Navigate to bucket → dev/telegram/photos/123/
# File should be there!
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `apps/web/lib/storage/storage-service.ts` | 🐙 **THE OCTOPUS HEAD** - Start here! |
| `docs/STORAGE_SERVICE_MIGRATION_GUIDE.md` | Detailed migration instructions |
| `docs/STORAGE_SERVICE_DESIGN.md` | Architecture and design rationale |
| `STORAGE_SERVICE_IMPLEMENTATION_SUMMARY.md` | What we built and why |

## 💡 Pro Tips

1. **Always sanitize IDs** before using in paths:
   ```typescript
   const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
   ```

2. **Don't include environment in basePath** - it's added automatically:
   ```typescript
   // ❌ BAD
   const basePath = `dev/telegram/photos/${chatId}`;
   
   // ✅ GOOD
   const basePath = `telegram/photos/${sanitizedChatId}`;
   ```

3. **Use metadata for context**:
   ```typescript
   const result = await storageService.upload({
     file,
     fileName: file.name,
     contentType: file.type,
     basePath: "path",
     metadata: {
       duration: "30",
       sender: "patient",
       uploadedBy: userId,
     },
   });
   ```

4. **Check migrated endpoints for examples**:
   - `apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts`
   - `apps/web/app/api/internal-messages/[id]/upload-audio/route.ts`

## 🎯 Benefits

- **60% less code** - No more duplicating upload logic
- **Consistent errors** - All endpoints handle errors the same way
- **Easy to maintain** - Update once, benefit everywhere
- **Type safe** - TypeScript prevents mistakes
- **Well documented** - Clear examples and instructions
- **Future proof** - Easy to add features like compression, scanning, etc.

## 🆘 Need Help?

1. **Check the Octopus Head**: `apps/web/lib/storage/storage-service.ts`
2. **See examples**: Look at the 2 migrated endpoints
3. **Read migration guide**: `docs/STORAGE_SERVICE_MIGRATION_GUIDE.md`
4. **Test connection**: Run `node test-rustfs-connection.js`

---

**Quick Summary:**
- 🐙 One service to rule them all
- 📍 All endpoints tracked in one place
- 🤖 Instructions for AI assistants included
- 📚 Well documented
- ✅ No breaking changes
- 🚀 Easy to use

**Start migrating today - your future self will thank you! 🎉**