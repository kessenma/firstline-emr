import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { addParticipantsToThread, getThreadParticipantsWithUserData } from "@/lib/internal-messages-helpers";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
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
    const body = await request.json();
    const { participantIds } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "participantIds array is required" },
        { status: 400 },
      );
    }

    const result = await addParticipantsToThread(id, participantIds, session.userId);

    // Get updated participant details
    const participantDetails = await getThreadParticipantsWithUserData(
      result.thread.participants || [],
    );

    return NextResponse.json({
      success: true,
      thread: {
        id: result.thread.id,
        participants: participantDetails.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          image: p.image,
          accountType: p.accountType,
          doctorSpecialty: p.doctorSpecialty || [],
        })),
      },
    });
  } catch (error) {
    console.error("Error adding participants:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
