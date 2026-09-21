// app/api/patient/[id]/take-case/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, patientCareTeam } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { PatientStatusList } from "@/data/patientStatus.enum";
import { isLeadRole, CARE_TEAM_ROLES, type CareTeamRole } from "@fajr/shared/care-team";
import { syncCareTeamToPatient } from "@/lib/server/syncCareTeamToPatient";
import { addUserToPatientTelegramThread } from "@/lib/telegram-thread-sync";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the patient ID from the URL
    const { id: patientId } = await props.params;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Parse optional role from request body (default: surgeon for backward compat)
    let role: CareTeamRole = "surgeon";
    try {
      const body = await request.json();
      if (body?.role && CARE_TEAM_ROLES.includes(body.role)) {
        role = body.role as CareTeamRole;
      }
    } catch {
      // No body or invalid JSON — use default role
    }

    const isLead = isLeadRole(role);

    console.log("[Debug] User joining care team for patient:", patientId, "role:", role, "isLead:", isLead);

    // Get the user information
    const userId = session.userId;

    let updatedPatient;

    // Only update patient status if taking lead role (surgeon)
    if (isLead) {
      updatedPatient = await db
        .update(patients)
        .set({
          status: PatientStatusList.PERI_OP_IN_SURGERY,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patientId))
        .returning();

      if (!updatedPatient || updatedPatient.length === 0) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      console.log("[Debug] Patient status updated to Peri-Op / In Surgery:", updatedPatient[0].id);
    } else {
      // Verify patient exists without modifying it
      updatedPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!updatedPatient || updatedPatient.length === 0) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      console.log("[Debug] Non-lead role, patient record unchanged:", updatedPatient[0].id);
    }

    // Insert or update care team record
    try {
      // Check for existing record (active or removed)
      const existingCareTeam = await db
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

      if (existingCareTeam.length > 0) {
        // Update existing record (re-activate if previously removed)
        await db
          .update(patientCareTeam)
          .set({
            role,
            isLead,
            removedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(patientCareTeam.id, existingCareTeam[0].id));
      } else {
        // Insert new record
        await db
          .insert(patientCareTeam)
          .values({
            patientId,
            userId,
            role,
            isLead,
            assignedAt: new Date(),
            assignedBy: userId,
          });
      }

      console.log("[Debug] Care team record upserted for user:", userId, "role:", role);

      // Sync care team JSON to patient record
      await syncCareTeamToPatient(patientId);
    } catch (careTeamError) {
      // Log but don't fail the operation
      console.error("[Debug] Care team upsert failed (non-fatal):", careTeamError);
    }

    // Sync user to patient's telegram thread (all roles, not just lead)
    let threadAssigned = false;
    try {
      threadAssigned = await addUserToPatientTelegramThread(patientId, userId);
    } catch (syncError) {
      console.error("[take-case] Telegram thread sync failed (non-fatal):", syncError);
    }

    return NextResponse.json({
      success: true,
      patient: updatedPatient[0],
      role,
      isLead,
      threadAssigned,
    });
  } catch (error) {
    console.error("[Error] Error taking case:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
