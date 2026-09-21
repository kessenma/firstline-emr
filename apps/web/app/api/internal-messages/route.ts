import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  ensureDefaultInternalGroupsForUser,
  getAllFormattedInternalThreadsForUser,
} from "@/lib/internal-messages-helpers";

export async function GET(req: NextRequest) {
  console.log("🔵 [API] GET /api/internal-messages called");

  // Use DAL for secure authentication check
  // Works for both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await verifySessionFromRequest(req);

  if (!session) {
    console.error("❌ [API] Unauthorized - no valid session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("✅ [API] Authenticated user:", session.email);
  console.log("🔐 [API] User ID:", session.userId);
  console.log(
    "🔐 [API] Auth method:",
    session.accountType ? "JWT Token (mobile)" : "NextAuth Session (web)",
  );

  const userId = session.userId;
  const accountType = session.accountType || "";
  const specialties = Array.isArray(session.doctorSpecialty)
    ? session.doctorSpecialty
    : [];

  try {
    // Ensure default groups exist for this user
    await ensureDefaultInternalGroupsForUser(userId, accountType, specialties);

    // Get formatted threads for the user (includes both group and 1:1 threads)
    const threads = await getAllFormattedInternalThreadsForUser(userId, 50);

    console.log(
      "✅ [API] Returning",
      threads.length,
      "internal message threads",
    );
    return NextResponse.json({ threads });
  } catch (error) {
    console.error("❌ [API] Error fetching internal messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
