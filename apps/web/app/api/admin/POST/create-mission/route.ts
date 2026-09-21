export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { eq } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { createGroupThread } from "@/lib/internal-messages-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { name, country, city, hospitals, description, status, startDate, endDate, urls } =
      await request.json();

    if (!name || !country) {
      return NextResponse.json(
        { message: "Name and country are required" },
        { status: 400 },
      );
    }

    const [mission] = await db
      .insert(missions)
      .values({
        name,
        country,
        city: city || null,
        hospitals: Array.isArray(hospitals) ? hospitals : [],
        description: description || null,
        status: status || "planned",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        urls: urls || [],
        isActiveIntake: false,
        createdBy: session.userId,
      })
      .returning();

    // Auto-create a mission group chat
    try {
      const result = await createGroupThread(session.userId, [], name);
      if (result.thread) {
        await db
          .update(missions)
          .set({ groupChatThreadId: result.thread.id })
          .where(eq(missions.id, mission.id));
        mission.groupChatThreadId = result.thread.id;
      }
    } catch (err) {
      console.error("Failed to create mission group chat:", err);
    }

    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    console.error("Error creating mission:", error);
    return NextResponse.json(
      { message: "Failed to create mission" },
      { status: 500 },
    );
  }
}
