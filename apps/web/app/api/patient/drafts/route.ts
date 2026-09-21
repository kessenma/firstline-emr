export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patientDrafts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// List all drafts for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await db
      .select()
      .from(patientDrafts)
      .where(eq(patientDrafts.createdById, session.userId))
      .orderBy(desc(patientDrafts.updatedAt));

    return NextResponse.json({ data: drafts }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to fetch patient drafts:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch drafts: ${error.message}` },
      { status: 500 },
    );
  }
}

// Create a new draft (auto-save from form)
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();

    const draftData: typeof patientDrafts.$inferInsert = {
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      phone: payload.phone || null,
      email: payload.email || null,
      dob: payload.dob ? new Date(payload.dob) : null,
      gender: payload.gender || null,
      country: payload.country || null,
      city: payload.city || null,
      language: payload.language || null,
      chiefComplaint: payload.chiefComplaint || null,
      allergies: payload.allergies || null,
      currentMeds: payload.currentMeds || null,
      specialties: payload.specialty
        ? [payload.specialty]
        : payload.specialties || null,
      hospital: payload.hospital || null,
      missionId: payload.missionId || null,
      createdById: session.userId,
      updatedAt: new Date(),
    };

    // Allow client-provided UUID (for PowerSync compatibility)
    if (payload.id && UUID_REGEX.test(payload.id)) {
      draftData.id = payload.id;
    }

    const newDraft = await db
      .insert(patientDrafts)
      .values(draftData)
      .returning();

    return NextResponse.json({ data: newDraft[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[Error] Failed to create patient draft:", error.message);
    return NextResponse.json(
      { error: `Failed to create draft: ${error.message}` },
      { status: 500 },
    );
  }
}

// Update an existing draft (auto-save from form)
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { id, ...fields } = payload;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Valid draft ID is required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Map incoming fields to draft columns
    const fieldMap: Record<string, string> = {
      firstName: "firstName",
      lastName: "lastName",
      phone: "phone",
      email: "email",
      dob: "dob",
      gender: "gender",
      country: "country",
      city: "city",
      language: "language",
      chiefComplaint: "chiefComplaint",
      allergies: "allergies",
      currentMeds: "currentMeds",
      hospital: "hospital",
      missionId: "missionId",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in fields) {
        updateData[col] = fields[key] || null;
      }
    }

    // Handle dob as Date
    if ("dob" in fields) {
      updateData.dob = fields.dob ? new Date(fields.dob) : null;
    }

    // Handle specialty -> specialties array
    if ("specialty" in fields) {
      updateData.specialties = fields.specialty ? [fields.specialty] : null;
    } else if ("specialties" in fields) {
      updateData.specialties = fields.specialties || null;
    }

    const updated = await db
      .update(patientDrafts)
      .set(updateData)
      .where(
        and(
          eq(patientDrafts.id, id),
          eq(patientDrafts.createdById, session.userId),
        ),
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Draft not found or not owned by you" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated[0] }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to update patient draft:", error.message);
    return NextResponse.json(
      { error: `Failed to update draft: ${error.message}` },
      { status: 500 },
    );
  }
}

// Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("id");

    if (!draftId) {
      return NextResponse.json(
        { error: "Draft ID is required" },
        { status: 400 },
      );
    }

    // Only allow deleting own drafts
    const deleted = await db
      .delete(patientDrafts)
      .where(
        and(
          eq(patientDrafts.id, draftId),
          eq(patientDrafts.createdById, session.userId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Draft not found or not owned by you" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Draft deleted successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Error] Failed to delete patient draft:", error.message);
    return NextResponse.json(
      { error: `Failed to delete draft: ${error.message}` },
      { status: 500 },
    );
  }
}
