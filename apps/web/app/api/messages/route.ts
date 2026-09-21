import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getTelegramThreadsForUser } from "@/lib/patient-messages-helpers";

export async function GET(req: NextRequest) {
  console.log("🟢 [API] GET /api/messages called");

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

  try {
    const threads = await getTelegramThreadsForUser(userId, 20);

    console.log("✅ [API] Returning", threads.length, "telegram threads");
    return NextResponse.json({ threads });
  } catch (error) {
    console.error("❌ [API] Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
