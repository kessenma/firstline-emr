// app/api/patient/[id]/notes/doctor-notes/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { notes, noteEdits, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ListNotesResponse } from "@fajr/shared/patient";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Full rows, published and drafts together — the client splits them on
    // `draft`. The older GET at /api/patient/notes/[id] flattens content to a
    // string and drops `draft`, so it cannot drive the patient chart.
    const patientNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.patientId, id))
      .orderBy(desc(notes.date));

    console.log("[Debug] Found", patientNotes.length, "notes for patient", id);

    return NextResponse.json({
      notes: patientNotes,
    } satisfies ListNotesResponse);
  } catch (error) {
    console.error("[Error] Failed to fetch notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      noteType, content, email, authorName, authorID, draft,
      attendingPhysicianId, attendingPhysicianName,
      lastEditorAccountType, lastEditorCareTeamRole,
    } = await request.json();
    const { id } = await params;

    console.log("[Debug] Creating note for patient:", id);

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify patient exists
    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: `Patient with ID ${id} not found` },
        { status: 404 },
      );
    }

    // Validate authorID if provided
    if (authorID && !UUID_REGEX.test(authorID)) {
      return NextResponse.json(
        { error: "Invalid author ID format" },
        { status: 400 },
      );
    }

    // Create new note
    const newNote = await db
      .insert(notes)
      .values({
        patientId: id,
        email: email,
        noteType: noteType,
        date: new Date(),
        authorName: authorName,
        authorId: authorID || null,
        attendingPhysicianId: attendingPhysicianId && UUID_REGEX.test(attendingPhysicianId) ? attendingPhysicianId : null,
        attendingPhysicianName: attendingPhysicianName || null,
        content: content,
        draft: draft !== undefined ? draft : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Insert 'created' edit record
    await db.insert(noteEdits).values({
      noteId: newNote[0].id,
      editorId: authorID && UUID_REGEX.test(authorID) ? authorID : null,
      editorName: authorName || null,
      editorAccountType: lastEditorAccountType || null,
      editorCareTeamRole: lastEditorCareTeamRole || null,
      editType: "created",
      contentSnapshot: content || null,
    });

    console.log("[Debug] Note created successfully:", newNote[0].id);

    return NextResponse.json(newNote[0], { status: 201 });
  } catch (error) {
    console.error("[Error] Failed to add doctor note:", error);
    return NextResponse.json(
      { error: `Failed to add doctor note: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      noteId, noteType, content, email, authorName, authorID, draft,
      attendingPhysicianId, attendingPhysicianName,
      lastEditorAccountType, lastEditorCareTeamRole,
      skipEditRecord,
    } = body;
    // Editor ID/name: prefer new last_editor_* columns, fall back to legacy field names
    const lastEditedById = body.lastEditorId || body.lastEditedById;
    const lastEditedByName = body.lastEditorName || body.lastEditedByName;

    console.log("[Debug] Updating note for patient:", id, "noteId:", noteId);

    // Validate patient UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: `Patient with ID ${id} not found` },
        { status: 404 },
      );
    }

    // If noteId is provided, try to update existing note
    if (noteId) {
      // Validate note UUID format
      if (!UUID_REGEX.test(noteId)) {
        return NextResponse.json(
          { error: "Invalid note ID format" },
          { status: 400 },
        );
      }

      // Check if note exists
      const existingNote = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.patientId, id)))
        .limit(1);

      // If note is not found, create a new note instead
      if (!existingNote || existingNote.length === 0) {
        console.log(
          "[Debug] Note not found, creating new note instead:",
          noteId,
        );
        const newNote = await db
          .insert(notes)
          .values({
            id: noteId,
            patientId: id,
            email: email,
            noteType: noteType,
            date: new Date(),
            authorName: authorName,
            authorId: authorID || null,
            attendingPhysicianId: attendingPhysicianId && UUID_REGEX.test(attendingPhysicianId) ? attendingPhysicianId : null,
            attendingPhysicianName: attendingPhysicianName || null,
            content: content,
            draft: draft !== undefined ? draft : true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Insert 'created' edit record
        await db.insert(noteEdits).values({
          noteId: newNote[0].id,
          editorId: authorID && UUID_REGEX.test(authorID) ? authorID : null,
          editorName: authorName || null,
          editorAccountType: lastEditorAccountType || null,
          editorCareTeamRole: lastEditorCareTeamRole || null,
          editType: "created",
          contentSnapshot: content || null,
        });

        console.log("[Debug] Note created successfully:", newNote[0].id);
        return NextResponse.json(newNote[0], { status: 201 });
      }

      // Determine if this is a publish (draft → non-draft transition)
      const wasPublished = existingNote[0].draft === true && draft === false;

      // Update the note
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (noteType !== undefined) updateData.noteType = noteType;
      if (content !== undefined) updateData.content = content;
      if (email !== undefined) updateData.email = email;
      if (authorName !== undefined) updateData.authorName = authorName;
      if (authorID !== undefined) {
        updateData.authorId =
          authorID && UUID_REGEX.test(authorID) ? authorID : null;
      }
      if (draft !== undefined) updateData.draft = draft;
      if (attendingPhysicianId !== undefined) {
        updateData.attendingPhysicianId =
          attendingPhysicianId && UUID_REGEX.test(attendingPhysicianId) ? attendingPhysicianId : null;
      }
      if (attendingPhysicianName !== undefined) {
        updateData.attendingPhysicianName = attendingPhysicianName || null;
      }

      const updatedNote = await db
        .update(notes)
        .set(updateData)
        .where(eq(notes.id, noteId))
        .returning();

      // Insert edit record (skip when flagged, e.g. auto-saves)
      if (!skipEditRecord) {
        const editorId = lastEditedById || authorID;
        const editorName = lastEditedByName || authorName;
        await db.insert(noteEdits).values({
          noteId: noteId,
          editorId: editorId && UUID_REGEX.test(editorId) ? editorId : null,
          editorName: editorName || null,
          editorAccountType: lastEditorAccountType || null,
          editorCareTeamRole: lastEditorCareTeamRole || null,
          editType: wasPublished ? "published" : "updated",
          contentSnapshot: content || null,
        });
      }

      console.log("[Debug] Note updated successfully:", updatedNote[0].id);

      // Return updated patient with notes
      const patientWithNotes = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id))
        .limit(1);

      return NextResponse.json(patientWithNotes[0], { status: 200 });
    } else {
      // No noteId provided, create new note
      console.log("[Debug] No noteId provided, creating new note");
      const newNote = await db
        .insert(notes)
        .values({
          patientId: id,
          email: email,
          noteType: noteType,
          date: new Date(),
          authorName: authorName,
          authorId: authorID || null,
          attendingPhysicianId: attendingPhysicianId && UUID_REGEX.test(attendingPhysicianId) ? attendingPhysicianId : null,
          attendingPhysicianName: attendingPhysicianName || null,
          content: content,
          draft: draft !== undefined ? draft : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Insert 'created' edit record
      await db.insert(noteEdits).values({
        noteId: newNote[0].id,
        editorId: authorID && UUID_REGEX.test(authorID) ? authorID : null,
        editorName: authorName || null,
        editorAccountType: lastEditorAccountType || null,
        editorCareTeamRole: lastEditorCareTeamRole || null,
        editType: "created",
        contentSnapshot: content || null,
      });

      console.log("[Debug] Note created successfully:", newNote[0].id);
      return NextResponse.json(newNote[0], { status: 201 });
    }
  } catch (error) {
    console.error("[Error] Failed to update doctor note:", error);
    return NextResponse.json(
      { error: `Failed to update doctor note: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { noteId } = await request.json();

    console.log("[Debug] Deleting note for patient:", id, "noteId:", noteId);

    // Validate patient UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 },
      );
    }

    // Validate note UUID format
    if (!noteId || !UUID_REGEX.test(noteId)) {
      return NextResponse.json(
        { error: "Invalid note ID format" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: `Patient with ID ${id} not found` },
        { status: 404 },
      );
    }

    // Delete the note (idempotent — if already gone, just return success)
    const deleted = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.patientId, id)))
      .returning({ id: notes.id });

    console.log("[Debug] Note deleted:", noteId, deleted.length > 0 ? "(found)" : "(already gone)");

    return NextResponse.json({ success: true, noteId }, { status: 200 });
  } catch (error) {
    console.error("[Error] Failed to delete doctor note:", error);
    return NextResponse.json(
      { error: `Failed to delete doctor note: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
