// apps/web/app/api/telegram-thread/[telegramChatId]/upload-photo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";

/**
 * POST /api/telegram-thread/[telegramChatId]/upload-photo
 *
 * Uploads a photo to RustFS object storage and returns a signed URL.
 * Does not require database access - purely file storage operation.
 *
 * Uses the shared StorageService for consistent upload handling.
 * See: apps/web/lib/storage/storage-service.ts
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @body FormData with 'file' field containing the photo
 * @returns File path and signed URL for accessing the uploaded photo
 *
 * @example
 * curl -X POST http://localhost:3000/api/telegram-thread/123456789/upload-photo \
 *   -F "file=@photo.jpg"
 *
 * Response:
 * {
 *   "filePath": "dev/telegram/photos/123456789/2024-01-15T10-30-00-photo.jpg",
 *   "signedUrl": "https://storage.example.com/...",
 *   "fileName": "photo.jpg",
 *   "fileSize": 12345,
 *   "contentType": "image/jpeg"
 * }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ telegramChatId: string }> },
) {
  try {
    const { telegramChatId } = await context.params;

    console.log("[upload-photo] Upload request for chat ID:", telegramChatId);

    // Validate telegram chat ID
    if (!telegramChatId) {
      console.error("[upload-photo] Missing Telegram Chat ID");
      return NextResponse.json(
        { error: "Missing Telegram Chat ID" },
        { status: 400 },
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("[upload-photo] File is missing from form data");
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    console.log("[upload-photo] File received:", file.name, "Size:", file.size);

    // Sanitize chat ID for use in file path
    const sanitizedChatId = telegramChatId.replace(/[^a-zA-Z0-9_-]/g, "");

    // Build base path for telegram photos
    // Format: telegram/photos/{chatId}
    // Environment prefix (dev/prod) is added automatically by storage service
    const basePath = `telegram/photos/${sanitizedChatId}`;

    // Upload using shared storage service
    // This handles:
    // - Environment prefixing (dev/staging/prod)
    // - File name sanitization and timestamping
    // - Upload to RustFS
    // - Signed URL generation
    // - Error handling
    const result = await storageService.upload({
      file,
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      basePath,
      signedUrlExpiry: 3600, // 1 hour
    });

    console.log("[upload-photo] Upload successful:", result.filePath);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[upload-photo] Error:", error.message);
    console.error("[upload-photo] Error stack:", error.stack);

    return NextResponse.json(
      { error: "Failed to upload photo", details: error.message },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
