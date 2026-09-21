// apps/web/app/api/internal-messages/[id]/upload-photo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";

/**
 * POST /api/internal-messages/[id]/upload-photo
 *
 * Uploads a photo to RustFS object storage for internal messaging.
 * Requires authentication via session or JWT token.
 *
 * Uses the shared StorageService for consistent upload handling.
 * See: apps/web/lib/storage/storage-service.ts
 *
 * @param id - Thread ID (from URL path)
 * @body FormData with 'file' field
 * @returns File path, signed URL, and metadata
 *
 * @example
 * curl -X POST http://localhost:3000/api/internal-messages/thread123/upload-photo \
 *   -H "Authorization: Bearer TOKEN" \
 *   -F "file=@photo.jpg"
 *
 * Response:
 * {
 *   "filePath": "dev/internal-messages-photos/thread123/2024-01-15T10-30-00-photo.jpg",
 *   "signedUrl": "https://storage.example.com/...",
 *   "fileName": "photo.jpg",
 *   "fileSize": 12345,
 *   "contentType": "image/jpeg"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Extract thread ID from request URL
    const pathnameParts = req.nextUrl.pathname.split("/");
    const threadId = pathnameParts[pathnameParts.length - 2];

    if (!threadId) {
      return NextResponse.json({ error: "Missing Thread ID" }, { status: 400 });
    }

    // Verify authentication (supports both NextAuth sessions and JWT tokens)
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in." },
        { status: 401 },
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    // Build sender info from session
    const { firstName, lastName, accountType } = session;
    const senderInfo = `${accountType}-${firstName}-${lastName}`
      .trim()
      .replace(/\s+/g, "_");

    // Sanitize thread ID for use in file path
    const sanitizedThreadId = threadId.replace(/[^a-zA-Z0-9_-]/g, "");

    // Build base path for internal message photos
    // Format: internal-messages-photos/{threadId}
    // Environment prefix (dev/staging/prod) is added automatically by storage service
    const basePath = `internal-messages-photos/${sanitizedThreadId}`;

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
      metadata: {
        sender: senderInfo,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 3600, // 1 hour
    });

    console.log("[upload-photo] Photo uploaded successfully:", result.filePath);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(
      "[upload-photo] Error in internal-messages upload-photo route:",
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 },
    );
  }
}
