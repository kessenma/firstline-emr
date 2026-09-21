// apps/web/app/api/auth/webauthn/passkeys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db/connection";
import { passkeyCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/mobileAuth";

// GET - List user's passkeys
export async function GET(request: NextRequest) {
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

    const passkeys = await db.query.passkeyCredentials.findMany({
      where: and(
        eq(passkeyCredentials.userId, userId),
        eq(passkeyCredentials.isActive, true)
      ),
      columns: {
        id: true,
        deviceName: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: (credentials, { desc }) => [desc(credentials.createdAt)],
    });

    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error("Error fetching passkeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch passkeys" },
      { status: 500 }
    );
  }
}
