// app/api/patient/care-team/route.ts
// CRUD API for patient care team with conflict detection
// Called by PowerSync upload connector (POST/PATCH/DELETE) and web UI (GET)

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import {
  patientCareTeam,
  careTeamConflicts,
  users,
} from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { notificationService } from "@/lib/NotificationService";
import { syncCareTeamToPatient } from "@/lib/server/syncCareTeamToPatient";
import {
  addUserToPatientTelegramThread,
  removeUserFromPatientTelegramThread,
} from "@/lib/telegram-thread-sync";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: List care team members for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Valid patientId is required" },
        { status: 400 },
      );
    }

    const careTeam = await db
      .select({
        id: patientCareTeam.id,
        patientId: patientCareTeam.patientId,
        userId: patientCareTeam.userId,
        role: patientCareTeam.role,
        isLead: patientCareTeam.isLead,
        assignedAt: patientCareTeam.assignedAt,
        assignedBy: patientCareTeam.assignedBy,
        removedAt: patientCareTeam.removedAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userAccountType: users.accountType,
      })
      .from(patientCareTeam)
      .leftJoin(users, eq(patientCareTeam.userId, users.id))
      .where(
        and(
          eq(patientCareTeam.patientId, patientId),
          isNull(patientCareTeam.removedAt),
        ),
      )
      .orderBy(
        sql`${patientCareTeam.isLead} DESC`,
        patientCareTeam.assignedAt,
      );

    return NextResponse.json({ careTeam });
  } catch (error) {
    console.error("[care-team GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Create/upsert care team record (called by PowerSync upload connector)
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, patientId, userId, role, isLead, assignedAt, assignedBy } =
      body;

    if (!patientId || !userId || !role) {
      return NextResponse.json(
        { error: "patientId, userId, and role are required" },
        { status: 400 },
      );
    }

    // Convert isLead to boolean (mobile sends 0/1 integers from SQLite)
    const isLeadBool = Boolean(isLead);

    // Check for existing active or removed record for this patient+user
    const existing = await db
      .select()
      .from(patientCareTeam)
      .where(
        and(
          eq(patientCareTeam.patientId, patientId),
          eq(patientCareTeam.userId, userId),
        ),
      )
      .orderBy(sql`${patientCareTeam.removedAt} IS NULL DESC`)
      .limit(1);

    let inserted;
    if (existing.length > 0) {
      // Update existing record (re-activate if previously removed)
      [inserted] = await db
        .update(patientCareTeam)
        .set({
          role,
          isLead: isLeadBool,
          removedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(patientCareTeam.id, existing[0].id))
        .returning();
    } else {
      // Insert new record
      [inserted] = await db
        .insert(patientCareTeam)
        .values({
          ...(id ? { id } : {}),
          patientId,
          userId,
          role,
          isLead: isLeadBool,
          assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
          assignedBy: assignedBy || session.userId,
        })
        .returning();
    }

    // Conflict detection: check for multiple active leads on the same patient
    let conflict = null;
    if (isLeadBool) {
      const activeLeads = await db
        .select({ userId: patientCareTeam.userId })
        .from(patientCareTeam)
        .where(
          and(
            eq(patientCareTeam.patientId, patientId),
            eq(patientCareTeam.isLead, true),
            isNull(patientCareTeam.removedAt),
          ),
        );

      if (activeLeads.length > 1) {
        const conflictingIds = activeLeads.map((l) => l.userId);

        // Check if unresolved conflict already exists for this patient
        const existingConflict = await db
          .select()
          .from(careTeamConflicts)
          .where(
            and(
              eq(careTeamConflicts.patientId, patientId),
              eq(careTeamConflicts.status, "unresolved"),
            ),
          )
          .limit(1);

        if (existingConflict.length === 0) {
          // Create new conflict record
          const [newConflict] = await db
            .insert(careTeamConflicts)
            .values({
              patientId,
              conflictingUserIds: conflictingIds,
              status: "unresolved",
            })
            .returning();

          conflict = {
            id: newConflict.id,
            conflictingUserIds: conflictingIds,
          };

          console.log(
            `[care-team] Conflict detected for patient ${patientId}: ${conflictingIds.length} leads`,
          );

          // Notify conflicting users
          try {
            await notificationService.send({
              type: "alert",
              message:
                "Multiple doctors claimed lead for the same patient. Please coordinate to resolve.",
              recipientIds: conflictingIds,
              title: "Care Team Conflict",
              patientId,
              redirectTo: `/patient/${patientId}`,
            });
          } catch (notifError) {
            console.error(
              "[care-team] Failed to send conflict notification:",
              notifError,
            );
          }

          // Notify admins
          try {
            await notificationService.sendToAdmins({
              type: "alert",
              message: `Care team conflict: ${conflictingIds.length} doctors claimed lead for a patient. Resolution needed.`,
              title: "Care Team Conflict (Admin)",
              patientId,
              redirectTo: `/patient/${patientId}`,
            });
          } catch (notifError) {
            console.error(
              "[care-team] Failed to send admin notification:",
              notifError,
            );
          }
        } else {
          // Update existing conflict with new user IDs
          await db
            .update(careTeamConflicts)
            .set({ conflictingUserIds: conflictingIds })
            .where(eq(careTeamConflicts.id, existingConflict[0].id));

          conflict = {
            id: existingConflict[0].id,
            conflictingUserIds: conflictingIds,
          };
        }
      }
    }

    // Sync care team JSON to patient record
    await syncCareTeamToPatient(patientId);

    // Sync user to patient's telegram thread (so patient messages appear for them)
    try {
      await addUserToPatientTelegramThread(patientId, userId);
    } catch (syncError) {
      console.error("[care-team POST] Telegram thread sync failed (non-fatal):", syncError);
    }

    return NextResponse.json({
      success: true,
      careTeamMember: inserted,
      conflict,
    });
  } catch (error) {
    console.error("[care-team POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH: Update existing care team record (e.g., yield lead, change role)
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isLead, role, removedAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (isLead !== undefined) updateData.isLead = Boolean(isLead);
    if (role !== undefined) updateData.role = role;
    if (removedAt !== undefined)
      updateData.removedAt = removedAt ? new Date(removedAt) : null;

    const [updated] = await db
      .update(patientCareTeam)
      .set(updateData)
      .where(eq(patientCareTeam.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Care team record not found" },
        { status: 404 },
      );
    }

    // If yielding lead (isLead changed to false/0), check if this resolves a conflict
    if (isLead !== undefined && !Boolean(isLead)) {
      const remainingLeads = await db
        .select({ userId: patientCareTeam.userId })
        .from(patientCareTeam)
        .where(
          and(
            eq(patientCareTeam.patientId, updated.patientId),
            eq(patientCareTeam.isLead, true),
            isNull(patientCareTeam.removedAt),
          ),
        );

      if (remainingLeads.length <= 1) {
        // Conflict resolved — only one (or zero) leads remain
        await db
          .update(careTeamConflicts)
          .set({
            status: "resolved",
            resolvedBy: session.userId,
            resolvedAt: new Date(),
            resolutionNotes: "Resolved automatically when a doctor yielded lead.",
          })
          .where(
            and(
              eq(careTeamConflicts.patientId, updated.patientId),
              eq(careTeamConflicts.status, "unresolved"),
            ),
          );
      }

      // Sync care team JSON to patient record
      await syncCareTeamToPatient(updated.patientId);
    }

    // If user is being removed via PATCH (removedAt set), remove from telegram thread
    if (removedAt) {
      try {
        await removeUserFromPatientTelegramThread(updated.patientId, updated.userId);
      } catch (syncError) {
        console.error("[care-team PATCH] Telegram thread sync failed (non-fatal):", syncError);
      }
    }

    return NextResponse.json({ success: true, careTeamMember: updated });
  } catch (error) {
    console.error("[care-team PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE: Soft-delete a care team record (set removed_at)
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [removed] = await db
      .update(patientCareTeam)
      .set({
        removedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(patientCareTeam.id, id))
      .returning();

    if (!removed) {
      return NextResponse.json(
        { error: "Care team record not found" },
        { status: 404 },
      );
    }

    // Sync care team JSON to patient record
    await syncCareTeamToPatient(removed.patientId);

    // Remove user from patient's telegram thread
    try {
      await removeUserFromPatientTelegramThread(removed.patientId, removed.userId);
    } catch (syncError) {
      console.error("[care-team DELETE] Telegram thread sync failed (non-fatal):", syncError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[care-team DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
