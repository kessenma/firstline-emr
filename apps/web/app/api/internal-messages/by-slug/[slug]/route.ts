import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  getInternalThreadBySlug,
  getThreadParticipantsWithUserData,
  getMessagesForThread,
} from "@/lib/internal-messages-helpers";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await props.params;

  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const thread = await getInternalThreadBySlug(slug, session.userId);

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get participant details and messages in parallel
    const [participants, messagesFromDb] = await Promise.all([
      getThreadParticipantsWithUserData(thread.participants || []),
      getMessagesForThread(thread.id),
    ]);

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title,
        isGroupChat: thread.isGroupChat,
        participants: participants.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          image: p.image,
          accountType: p.accountType,
          doctorSpecialty: p.doctorSpecialty || [],
        })),
        messages: messagesFromDb.map((m) => ({
          id: m.id,
          text: m.text,
          sender: m.sender,
          senderId: m.senderId,
          timestamp: m.timestamp,
          type: m.type,
          mediaUrl: m.mediaUrl,
          replyTo: m.replyTo,
          forwardedFrom: m.forwardedFrom,
          deletedAt: m.deletedAt,
          updatedAt: m.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching internal chat by slug:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
