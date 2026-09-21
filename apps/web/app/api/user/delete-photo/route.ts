
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

/**
 * DELETE /api/user/delete-photo
 *
 * Deletes the user's profile photo from storage and updates the database.
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify authentication
    const session = await verifySessionFromRequest(req);

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    // Get current user to find the image path
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has an image and it's not a Google URL (starts with http/https)
    // We assume it's a storage path if it doesn't start with http
    // However, our auth.ts logic now signs URLs, so the frontend might see a signed URL.
    // But the DB should contain the raw path (e.g., "dev/user_pictures/...")
    // Unless the user hasn't uploaded a new photo yet and still has an old one.
    // If we just migrated, the DB might have signed URLs from previous uploads?
    // No, I just changed the upload route. Previous uploads might be broken or expired signed URLs.
    // We should try to delete if it looks like a path.
    
    if (user.image) {
        const isStoragePath = !user.image.startsWith("http") && !user.image.startsWith("https");
        
        if (isStoragePath) {
            // Delete from storage
            try {
                // We use deleteByPrefix but with the full key it acts as deleting that object
                // storageService.deleteByPrefix expects a prefix.
                // If we pass the full key, it should work.
                await storageService.deleteByPrefix(user.image);
            } catch (storageError) {
                console.error("Failed to delete file from storage:", storageError);
                // Continue to update DB even if storage delete fails
            }
        }
    }

    // Update user record to remove image
    await db
      .update(users)
      .set({ 
        image: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(
      "[user-delete-photo] Error in user delete-photo route:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
