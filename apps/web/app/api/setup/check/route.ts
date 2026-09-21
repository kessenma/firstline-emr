// apps/web/app/api/setup/check/route.ts
// Returns whether the database is empty (no users) — used by setup wizard.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(users);

    return NextResponse.json({ isEmpty: userCount === 0 });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json(
      { message: "Failed to check database status" },
      { status: 500 },
    );
  }
}
