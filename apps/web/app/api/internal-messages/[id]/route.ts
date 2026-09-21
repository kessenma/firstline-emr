import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  getInternalThreadById,
  getInternalThreadBySlug,
  getThreadParticipantsWithUserData,
  getMessagesForThread,
  addMessageToInternalThread,
} from "@/lib/internal-messages-helpers";
import { notificationService } from "@/lib/NotificationService";
import {
  parsePatientCard,
  serializePatientCard,
  summarizePatientCardText,
} from "@fajr/shared/patient-share";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the push/notification body for a message.
 *
 * Several message types carry a JSON payload in `text` rather than prose.
 * Previewing those verbatim used to dump raw JSON — including the patient's
 * full name — into a lock-screen notification, so they get fixed summaries.
 */
function buildNotificationPreview(type: string, text: string): string {
  switch (type) {
    case "patient-card":
      return summarizePatientCardText(text);
    case "lead-request":
      return "Care team lead request";
    case "call-summary":
      return "Call summary";
    case "audio":
      return "Audio message";
    case "image":
    case "video":
    case "file":
      return "Media";
    default:
      return text ? text.substring(0, 100) : "Media";
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  try {
    // Check if id is a UUID or a slug
    const isUUID = UUID_REGEX.test(id);
    const thread = isUUID
      ? await getInternalThreadById(id, session.userId)
      : await getInternalThreadBySlug(id, session.userId);

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
        status: thread.status,
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
    console.error("Error fetching internal chat messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  const { text, type, mediaUrl } = await request.json();

  if (!id) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  // Validate message content - either text or media required
  if (type === "text" && (!text || text.trim() === "")) {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 },
    );
  }
  if ((type === "image" || type === "audio") && !mediaUrl) {
    return NextResponse.json(
      { error: "Media URL is required for media messages" },
      { status: 400 },
    );
  }

  // `patient-card` carries a JSON payload in `text`. Validate it here so a
  // malformed card can't reach the DB and both renderers, and store the
  // canonical form so every consumer sees identically normalised fields.
  let messageText: string = typeof text === "string" ? text : "";
  if (type === "patient-card") {
    const payload = parsePatientCard(messageText);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid patient card payload" },
        { status: 400 },
      );
    }
    messageText = serializePatientCard(payload);
  }

  try {
    // Check if id is a UUID or a slug
    const isUUID = UUID_REGEX.test(id);
    const thread = isUUID
      ? await getInternalThreadById(id, session.userId)
      : await getInternalThreadBySlug(id, session.userId);

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Block sending to archived threads
    if (thread.status === "archived") {
      return NextResponse.json(
        { error: "This thread has been archived and is read-only" },
        { status: 403 },
      );
    }

    const sender = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.email || 'Unknown User';

    // Use the actual thread ID (UUID) for adding the message
    const newMessage = await addMessageToInternalThread(thread.id, {
      text: messageText,
      sender,
      senderId: session.userId,
      type: type || "text",
      mediaUrl: mediaUrl || "",
    });

    // Notify other thread participants (fire-and-forget)
    const otherParticipants = (thread.participants || []).filter(
      (pid: string) => pid !== session.userId,
    );
    if (otherParticipants.length > 0) {
      const preview = buildNotificationPreview(type || "text", messageText);
      notificationService
        .send({
          type: "message",
          category: "internal_message",
          message: `${sender}: ${preview}`,
          recipientIds: otherParticipants,
          title: thread.title || "New Message",
          redirectTo: `/messages/${thread.id}`,
          sourceId: thread.id,
        })
        .catch((err) =>
          console.error("Failed to send internal message notification:", err),
        );
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error sending internal message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
