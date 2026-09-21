export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { missionId } = await request.json();

    // Transaction: clear all active intake flags, then set the new one
    await db.transaction(async (tx) => {
      // Clear all active intake flags
      await tx
        .update(missions)
        .set({ isActiveIntake: false, updatedAt: new Date() })
        .where(eq(missions.isActiveIntake, true));

      // Set the new active intake mission (if missionId provided)
      if (missionId) {
        await tx
          .update(missions)
          .set({ isActiveIntake: true, updatedAt: new Date() })
          .where(eq(missions.id, missionId));
      }
    });

    return NextResponse.json(
      { message: missionId ? "Active intake mission updated" : "Active intake mission cleared" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error setting active intake mission:", error);
    return NextResponse.json(
      { message: "Failed to update active intake mission" },
      { status: 500 },
    );
  }
}
