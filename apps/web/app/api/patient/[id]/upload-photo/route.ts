// apps/web/app/api/patient/[id]/upload-photo/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { patients, patientMedia, PATIENT_MEDIA_SOURCE } from "@/db/schema";
import { eq } from "drizzle-orm";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/patient/[id]/upload-photo
 *
 * Uploads a patient photo to RustFS object storage and saves metadata to database.
 * Requires authentication via session or JWT token.
 *
 * Uses the shared StorageService for consistent upload handling.
 * See: apps/web/lib/storage/storage-service.ts
 *
 * @param id - Patient ID (UUID, from URL path)
 * @body FormData with 'file' field
 * @returns File path, signed URL, and metadata
 *
 * @example
 * curl -X POST http://localhost:3000/api/patient/123e4567-e89b-12d3-a456-426614174000/upload-photo \
 *   -H "Authorization: Bearer TOKEN" \
 *   -F "file=@photo.jpg"
 *
 * Response:
 * {
 *   "filePath": "dev/patient-photos/123e4567-e89b-12d3-a456-426614174000/2024-01-15T10-30-00-photo.jpg",
 *   "signedUrl": "https://storage.example.com/...",
 *   "fileName": "photo.jpg",
 *   "fileSize": 12345,
 *   "contentType": "image/jpeg"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication (supports both NextAuth sessions and JWT tokens)
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract patient ID from pathname
    const pathnameParts = req.nextUrl.pathname.split("/");
    const patientId = pathnameParts[pathnameParts.length - 2];

    console.log("[upload-photo] Uploading photo for patient:", patientId);

    if (!patientId) {
      return NextResponse.json(
        { error: "Missing patient ID" },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    console.log("[upload-photo] File received:", file.name, "size:", file.size);

    // Build base path for patient media
    // Format: patient-media/{patientId}
    // Environment prefix (dev/staging/prod) is added automatically by storage service
    const basePath = `patient-media/${patientId}`;

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
        patientId,
        uploadedBy: `${session.firstName} ${session.lastName}`,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 3600, // 1 hour
    });

    console.log("[upload-photo] File uploaded successfully:", result.filePath);

    // Store the file path in database (patientMedia table)
    const mediaRecord = await db
      .insert(patientMedia)
      .values({
        patientId: patientId,
        url: result.filePath,
        contentType: file.type || "image/jpeg",
        source: PATIENT_MEDIA_SOURCE.UPLOAD,
        uploadedAt: new Date(),
      })
      .returning();

    console.log(
      "[upload-photo] Media record created in database:",
      mediaRecord[0].id,
    );

    // `mediaId` is additive to the UploadResult shape: the client needs it to
    // address this photo for deletion without refetching the whole chart.
    return NextResponse.json(
      { ...result, mediaId: mediaRecord[0].id },
      { status: 200 },
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "[upload-photo] Error in patient upload-photo route:",
      errorMessage,
      error.stack,
    );
    return NextResponse.json(
      {
        error: "Failed to upload photo",
        ...(process.env.NODE_ENV === "development" && { details: errorMessage }),
      },
      { status: 500 },
    );
  }
}
