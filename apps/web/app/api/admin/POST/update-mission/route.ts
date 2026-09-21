export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missions } from "@/db/schema/missions";
import { users } from "@/db/schema/users";
import { eq, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { createNotificationForUser } from "@/utils/notifications/createNotification";
import { pushNotificationService } from "@/lib/pushNotifications";
import type { MissionHospital } from "@/db/schema/missions";

function computeChangeSummary(
  oldMission: typeof missions.$inferSelect,
  updates: Record<string, any>,
): string[] {
  const changes: string[] = [];

  if (updates.name !== undefined && updates.name !== oldMission.name) {
    changes.push(`renamed mission to "${updates.name}"`);
  }
  if (updates.description !== undefined && (updates.description || null) !== (oldMission.description || null)) {
    changes.push("updated the description");
  }
  if (updates.country !== undefined && updates.country !== oldMission.country) {
    changes.push(`changed country to ${updates.country}`);
  }
  if (updates.city !== undefined && (updates.city || null) !== (oldMission.city || null)) {
    changes.push(updates.city ? `changed city to ${updates.city}` : "removed city");
  }
  if (updates.status !== undefined && updates.status !== oldMission.status) {
    changes.push(`changed status to ${updates.status}`);
  }
  if (updates.startDate !== undefined) {
    changes.push("updated start date");
  }
  if (updates.endDate !== undefined) {
    changes.push("updated end date");
  }

  // Compare hospitals
  if (updates.hospitals !== undefined) {
    const oldHospitals: MissionHospital[] = (oldMission.hospitals || []) as MissionHospital[];
    const newHospitals: MissionHospital[] = Array.isArray(updates.hospitals) ? updates.hospitals : [];
    const oldNames = new Set(oldHospitals.map((h) => h.name));
    const newNames = new Set(newHospitals.map((h) => h.name));

    const added = newHospitals.filter((h) => !oldNames.has(h.name));
    const removed = oldHospitals.filter((h) => !newNames.has(h.name));

    if (added.length > 0) {
      changes.push(`added hospital${added.length > 1 ? "s" : ""}: ${added.map((h) => h.name).join(", ")}`);
    }
    if (removed.length > 0) {
      changes.push(`removed hospital${removed.length > 1 ? "s" : ""}: ${removed.map((h) => h.name).join(", ")}`);
    }

    // Check for field updates on existing hospitals
    for (const newH of newHospitals) {
      const oldH = oldHospitals.find((h) => h.name === newH.name);
      if (!oldH) continue;
      const fieldChanges: string[] = [];
      if ((newH.url || "") !== (oldH.url || "")) fieldChanges.push("URL");
      if ((newH.mapLink || "") !== (oldH.mapLink || "")) fieldChanges.push("map link");
      if ((newH.website || "") !== (oldH.website || "")) fieldChanges.push("website");
      if ((newH.description || "") !== (oldH.description || "")) fieldChanges.push("description");
      if ((newH.visibility || "public") !== (oldH.visibility || "public")) fieldChanges.push("visibility");
      const oldImgCount = oldH.images?.length || 0;
      const newImgCount = newH.images?.length || 0;
      if (newImgCount !== oldImgCount) {
        fieldChanges.push(`images (${oldImgCount} → ${newImgCount})`);
      }
      if (fieldChanges.length > 0) {
        changes.push(`updated ${fieldChanges.join(", ")} for ${newH.name}`);
      }
    }
  }

  if (updates.urls !== undefined) {
    const oldUrlCount = (oldMission.urls || []).length;
    const newUrlCount = Array.isArray(updates.urls) ? updates.urls.length : 0;
    if (newUrlCount !== oldUrlCount) {
      changes.push(`updated links (${oldUrlCount} → ${newUrlCount})`);
    }
  }

  return changes;
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { missionId, name, country, city, hospitals, defaultIntakeHospital, description, status, startDate, endDate, urls } =
      await request.json();

    if (!missionId) {
      return NextResponse.json(
        { message: "Mission ID is required" },
        { status: 400 },
      );
    }

    // Fetch old mission for change comparison
    const [oldMission] = await db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId));

    if (!oldMission) {
      return NextResponse.json(
        { message: "Mission not found" },
        { status: 404 },
      );
    }

    const updatePayload: Record<string, any> = {
      ...(name !== undefined && { name }),
      ...(country !== undefined && { country }),
      ...(city !== undefined && { city: city || null }),
      ...(hospitals !== undefined && { hospitals: Array.isArray(hospitals) ? hospitals : [] }),
      ...(defaultIntakeHospital !== undefined && { defaultIntakeHospital: defaultIntakeHospital || null }),
      ...(description !== undefined && { description: description || null }),
      ...(status !== undefined && { status }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(urls !== undefined && { urls }),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(missions)
      .set(updatePayload)
      .where(eq(missions.id, missionId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { message: "Mission not found" },
        { status: 404 },
      );
    }

    // Compute change summary and send notifications
    const changes = computeChangeSummary(oldMission, {
      name, country, city, hospitals, description, status, startDate, endDate, urls,
    });

    if (changes.length > 0) {
      const changeSummary = changes.join(", ");
      const missionDisplayName = updated.name;
      const notificationMessage = `Mission "${missionDisplayName}" updated: ${changeSummary}`;

      // Find all mission members
      try {
        const memberRows = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`${users.missions} @> ARRAY[${missionId}]`);

        const memberIds = memberRows.map((r) => r.id);

        if (memberIds.length > 0) {
          // Send in-app notifications
          for (const memberId of memberIds) {
            await createNotificationForUser({
              userId: memberId,
              message: notificationMessage,
              type: "alert",
              redirectTo: `/missions/${missionId}`,
            });
          }

          // Send push notifications
          await pushNotificationService.sendNotificationToUsers(memberIds, {
            title: `${missionDisplayName} Updated`,
            body: changeSummary.length > 100 ? changeSummary.slice(0, 97) + "..." : changeSummary,
            data: { type: "mission_updated", missionId },
          });

          console.log(`Sent mission update notifications to ${memberIds.length} members`);
        }
      } catch (notifErr) {
        // Don't fail the update if notifications fail
        console.error("Failed to send mission update notifications:", notifErr);
      }
    }

    return NextResponse.json({ mission: updated, changes }, { status: 200 });
  } catch (error) {
    console.error("Error updating mission:", error);
    return NextResponse.json(
      { message: "Failed to update mission" },
      { status: 500 },
    );
  }
}
