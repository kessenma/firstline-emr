// apps/web/app/api/auth/webauthn/passkeys/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db/connection";
import { passkeyCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/mobileAuth";

// DELETE - Remove a passkey
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Support both NextAuth session (web) and Bearer token (mobile)
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromRequest(request, session);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the passkey belongs to the user before deleting
    const passkey = await db.query.passkeyCredentials.findFirst({
      where: and(
        eq(passkeyCredentials.id, id),
        eq(passkeyCredentials.userId, userId)
      ),
    });

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await db
      .update(passkeyCredentials)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 }
    );
  }
}
