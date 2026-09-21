
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

/**
 * POST /api/user/upload-photo
 *
 * Uploads a user profile photo to RustFS object storage and updates the user record.
 * Requires authentication.
 *
 * @body FormData with 'file' field
 * @returns File path, signed URL, and metadata
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await verifySessionFromRequest(req);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;
    const lastName = session.lastName || "User";

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    console.log("[user-upload-photo] File received:", file.name, "size:", file.size);

    // Build base path for user photos
    // Format: user_pictures/{userId}_{lastName}
    const basePath = `user_pictures/${userId}_${lastName}`;

    // Upload using shared storage service
    const result = await storageService.upload({
      file,
      fileName: file.name, // The service will append a timestamp
      contentType: file.type || "image/jpeg",
      basePath,
      metadata: {
        userId,
        uploadedBy: `${session.firstName} ${session.lastName}`,
        uploadedAt: new Date().toISOString(),
      },
      signedUrlExpiry: 3600, // 1 hour
    });

    console.log("[user-upload-photo] File uploaded successfully:", result.filePath);

    // Update the user's image URL in database
    // We store the file path (key) so we can generate fresh signed URLs on demand
    await db
      .update(users)
      .set({ 
        image: result.filePath,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(
      "[user-upload-photo] Error in user upload-photo route:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
