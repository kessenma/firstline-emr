// apps/web/app/api/telegram-thread/[telegramChatId]/upload-audio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { storageService } from "@/lib/storage";

/**
 * POST /api/telegram-thread/[telegramChatId]/upload-audio
 *
 * Uploads an audio file to RustFS object storage and returns a signed URL.
 * Requires session authentication and includes sender information in metadata.
 *
 * Uses the shared StorageService for consistent upload handling.
 * See: apps/web/lib/storage/storage-service.ts
 *
 * @param telegramChatId - Telegram chat ID (from URL path)
 * @body FormData with 'file' and 'duration' fields
 * @returns File path, signed URL, and metadata
 *
 * @example
 * curl -X POST http://localhost:3000/api/telegram-thread/123456789/upload-audio \
 *   -H "Cookie: next-auth.session-token=..." \
 *   -F "file=@audio.ogg" \
 *   -F "duration=30"
 *
 * Response:
 * {
 *   "filePath": "dev/telegram/audio/123456789/2024-01-15T10-30-00-audio.ogg",
 *   "signedUrl": "https://storage.example.com/...",
 *   "fileName": "audio.ogg",
 *   "fileSize": 12345,
 *   "contentType": "audio/ogg"
 * }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ telegramChatId: string }> },
) {
  try {
    const { telegramChatId } = await context.params;

    console.log("[upload-audio] Upload request for chat ID:", telegramChatId);

    // Validate telegram chat ID
    if (!telegramChatId) {
      console.error("[upload-audio] Missing Telegram Chat ID");
      return NextResponse.json(
        { error: "Missing Telegram Chat ID" },
        { status: 400 },
      );
    }

    // Validate session authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.warn("[upload-audio] Unauthorized - No session");
      return NextResponse.json(
        { error: "Unauthorized access. Please log in." },
        { status: 401 },
      );
    }

    console.log("[upload-audio] User authenticated:", session.user.email);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const duration = formData.get("duration") as string;

    if (!file || !duration) {
      console.error("[upload-audio] File or duration is missing");
      return NextResponse.json(
        { error: "File or duration is missing" },
        { status: 400 },
      );
    }

    console.log(
      "[upload-audio] File received:",
      file.name,
      "Duration:",
      duration,
      "Size:",
      file.size,
    );

    // Build sender info from session
    const { firstName, lastName, accountType } = session.user;
    const senderInfo =
      `${accountType || "User"}-${firstName || "Unknown"}-${lastName || "User"}`
        .trim()
        .replace(/\s+/g, "_");

    // Sanitize chat ID for use in file path
    const sanitizedChatId = telegramChatId.replace(/[^a-zA-Z0-9_-]/g, "");

    // Build base path for telegram audio
    // Format: telegram/audio/{chatId}
    // Environment prefix (dev/staging/prod) is added automatically by storage service
    const basePath = `telegram/audio/${sanitizedChatId}`;

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
      contentType: file.type || "audio/mp4",
      basePath,
      metadata: {
        duration,
        sender: senderInfo,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 3600, // 1 hour
    });

    console.log("[upload-audio] Upload successful:", result.filePath);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[upload-audio] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
