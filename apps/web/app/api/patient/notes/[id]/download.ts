import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/db";
import { notes } from "@/db/schema/notes";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const noteId = params.id;
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1);

    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    const noteContent = `
Note ID: ${note.id}
Date: ${new Date(note.date).toLocaleString()}
Type: ${note.noteType}
Author: ${note.authorName || 'Unknown'}
Patient Email: ${note.email}

Content:
${JSON.stringify(note.content, null, 2)}
    `.trim();

    const response = new NextResponse(noteContent);
    response.headers.set('Content-Disposition', `attachment; filename=note-${noteId}.txt`);
    response.headers.set('Content-Type', 'text/plain');
    return response;

  } catch (error: unknown) {
    console.error('Error downloading note:', error);
    return NextResponse.json({ 
      message: 'Failed to download note', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
