// app/api/patient/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, notes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    const params = await props.params;
    const patientId = params.id;
    const noteData = await request.json();

    // Validate patientId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return NextResponse.json(
        { message: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Check if patient exists
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 },
      );
    }

    // Validate note type
    const validNoteTypes = ["procedure", "subjective", "blank"];
    if (!noteData.noteType || !validNoteTypes.includes(noteData.noteType)) {
      return NextResponse.json(
        { message: "Invalid note type" },
        { status: 400 },
      );
    }

    // Create the note content based on type
    let noteContent: any = {};

    switch (noteData.noteType) {
      case "procedure":
        noteContent = {
          procedureName: noteData.procedureName || "",
          attendingPhysician: noteData.attendingPhysician || "",
          diagnosis: noteData.diagnosis || "",
          notes: noteData.notes || "",
          plan: noteData.plan || "",
        };
        break;
      case "subjective":
        noteContent = {
          subjective: noteData.subjective || "",
          objective: noteData.objective || "",
          assessment: noteData.assessment || "",
          plan: noteData.plan || "",
        };
        break;
      case "blank":
        noteContent = {
          noteField: noteData.noteField || "",
        };
        break;
      default:
        return NextResponse.json(
          { message: "Invalid note type" },
          { status: 400 },
        );
    }

    // Insert the note
    const [newNote] = await db
      .insert(notes)
      .values({
        patientId: patientId,
        authorId: session.userId,
        noteType: noteData.noteType,
        content: noteContent,
        date: noteData.date ? new Date(noteData.date) : new Date(),
        email: noteData.email || session.email || "",
      })
      .returning();

    return NextResponse.json(
      { message: "Note added successfully", note: newNote },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error adding note:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Failed to add note", error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Failed to add note", error: "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const patientId = params.id;

    // Validate patientId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return NextResponse.json(
        { message: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Check if patient exists
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 },
      );
    }

    // Fetch all notes for the patient
    const patientNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.patientId, patientId))
      .orderBy(desc(notes.date));

    type MappedNote = {
      id: string;
      title: string;
      email: string;
      date: string;
      content: string;
    };

    const sortedNotes: MappedNote[] = patientNotes.map((note) => ({
      id: note.id,
      title: note.noteType || "Note",
      email: note.email || "",
      date: new Date(note.date).toISOString(),
      content: getContentForNoteType(note),
    }));

    return NextResponse.json(sortedNotes);
  } catch (error: unknown) {
    console.error("Error fetching notes:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Failed to fetch notes", error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Failed to fetch notes", error: "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");
    const patientId = params.id;

    if (!noteId) {
      return NextResponse.json(
        { message: "Note ID is required" },
        { status: 400 },
      );
    }

    // Validate patientId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return NextResponse.json(
        { message: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Check if patient exists
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { message: "Patient not found" },
        { status: 404 },
      );
    }

    // Find the note
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1);

    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    // Verify the note belongs to this patient
    if (note.patientId !== patientId) {
      return NextResponse.json(
        { message: "Note does not belong to this patient" },
        { status: 403 },
      );
    }

    // Delete the note
    await db.delete(notes).where(eq(notes.id, noteId));

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting note:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Failed to delete note", error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Failed to delete note", error: "Unknown error" },
      { status: 500 },
    );
  }
}

function getContentForNoteType(note: any): string {
  let content;

  // Parse the content if it's a JSON string
  if (typeof note.content === "string") {
    try {
      content = JSON.parse(note.content);
    } catch (error) {
      console.error("Error parsing note content:", error);
      content = {};
    }
  } else {
    content = note.content || {};
  }

  switch (note.noteType) {
    case "procedure":
      return `
                Procedure Name: ${content.procedureName || ""}\n
                Attending Physician: ${content.attendingPhysician || ""}\n
                Diagnosis: ${content.diagnosis || ""}\n
                Notes: ${content.notes || ""}\n
                Plan: ${content.plan || ""}
            `;
    case "subjective":
      return `
                Subjective: ${content.subjective || ""}\n
                Objective: ${content.objective || ""}\n
                Assessment: ${content.assessment || ""}\n
                Plan: ${content.plan || ""}
            `;
    case "blank":
      return `
                noteField: ${content.noteField || ""}
            `;
    case "patient_call": {
      // Machine transcript. The disclaimer travels with the text: an exported
      // chart is exactly where a transcript is most likely to be mistaken for
      // something a clinician wrote and verified.
      const segments: Array<{
        speaker: string;
        text: string;
        startMs: number;
      }> = Array.isArray(content.segments) ? content.segments : [];

      const lines = segments
        .map((s) => {
          const seconds = Math.max(0, Math.floor(s.startMs / 1000));
          const stamp = `${Math.floor(seconds / 60)}:${(seconds % 60)
            .toString()
            .padStart(2, "0")}`;
          const who = s.speaker === "doctor" ? "Clinician" : "Patient";
          return `[${stamp}] ${who}: ${s.text}`;
        })
        .join("\n");

      const warning =
        content.languageSupported === false
          ? "\nWARNING: transcribed in an unsupported language — treat as unreliable.\n"
          : "";

      return `
                MACHINE TRANSCRIPT — NOT REVIEWED${warning}
                ${lines || "No speech was captured during this call."}
            `;
    }
    default:
      return "";
  }
}
