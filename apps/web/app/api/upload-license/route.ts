// apps/web/app/api/upload-license/route.ts

import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/upload-license
 *
 * Uploads a medical license file to RustFS object storage and saves metadata to database.
 * Supports PDF and image file types.
 *
 * Uses the shared StorageService for consistent upload handling.
 * See: apps/web/lib/storage/storage-service.ts
 *
 * @body FormData with 'file', 'firstName', 'lastName', 'specialty', and 'userId' fields
 * @returns File path, signed URL (7 days expiry), and metadata
 *
 * @example
 * curl -X POST http://localhost:3000/api/upload-license \
 *   -F "file=@license.pdf" \
 *   -F "firstName=John" \
 *   -F "lastName=Doe" \
 *   -F "specialty=Cardiology" \
 *   -F "userId=user123"
 *
 * Response:
 * {
 *   "filePath": "dev/medical_license/{userId}/cardiology/2024-01-15T10-30-00-license.pdf",
 *   "signedUrl": "https://storage.example.com/...",
 *   "fileName": "license.pdf",
 *   "fileSize": 12345,
 *   "contentType": "application/pdf",
 *   "fileType": "application/pdf"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const firstName = formData.get("firstName") as string | null;
    const lastName = formData.get("lastName") as string | null;
    const specialty = formData.get("specialty") as string | null;
    const userId = formData.get("userId") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    if (!specialty) {
      return NextResponse.json(
        { error: "Specialty is required" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Validate file type - allow PDF and images
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF, PNG, and JPG files are allowed.",
        },
        { status: 400 },
      );
    }

    // Check file size - limit to 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    // Clean specialty name for folder (remove spaces, special chars)
    const cleanSpecialty = specialty
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    // Build base path for medical licenses
    // Format: medical_license/{userId}/{specialty}
    // The user id leads so the storage key itself names the owner — the admin
    // storage browser resolves ownership from the key's scope segment. Legacy
    // keys (medical_license/{specialty}/...) resolve via reverse lookup on
    // users.medicalLicenses instead.
    // Environment prefix (dev/staging/prod) is added automatically by storage service
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const basePath = `medical_license/${sanitizedUserId}/${cleanSpecialty}`;

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
      contentType: file.type || "application/octet-stream",
      basePath,
      metadata: {
        userId,
        specialty,
        firstName,
        lastName,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 604800, // 7 days (maximum allowed by AWS S3)
    });

    console.log(
      "[upload-license] Medical license uploaded successfully:",
      result.filePath,
    );

    // Save license information to database
    const existingUser = await db
      .select({
        medicalLicenses: users.medicalLicenses,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser || existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentLicenses = existingUser[0].medicalLicenses || [];
    const licenseData = {
      specialty,
      licenseUrl: result.filePath,
      uploadedAt: new Date(),
      mimeType: file.type, // Store the file's MIME type for proper rendering
    };

    // Check if license for this specialty already exists
    const existingLicenseIndex = currentLicenses.findIndex(
      (license: any) => license.specialty === specialty,
    );

    let updatedLicenses;
    if (existingLicenseIndex >= 0) {
      // Update existing license
      updatedLicenses = [...currentLicenses];
      updatedLicenses[existingLicenseIndex] = licenseData;
      console.log(
        "[upload-license] Updated existing license for specialty:",
        specialty,
      );
    } else {
      // Add new license
      updatedLicenses = [...currentLicenses, licenseData];
      console.log(
        "[upload-license] Added new license for specialty:",
        specialty,
      );
    }

    // Update the user record
    await db
      .update(users)
      .set({
        medicalLicenses: updatedLicenses,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log("[upload-license] Database updated for user:", userId);

    return NextResponse.json(
      {
        ...result,
        fileType: file.type, // Include original file type for backward compatibility
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "[upload-license] Error in upload-license route:",
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to upload license" },
      { status: 500 },
    );
  }
}
