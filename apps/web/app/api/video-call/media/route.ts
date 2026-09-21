// app/api/video-call/media/route.ts
//
// The photos captured during *this* call, for the patient to see.
//
// Public, gated on the invite token. Deliberately takes no file path from the
// caller: the server derives the list from the session and signs each URL
// itself. The existing /api/media/get-signed-url will sign any key it is
// handed, which is tolerable behind a staff session and would not be here.
//
// Showing the patient what was taken is the other half of asking their consent.
// Consent to a photograph you never see is a weak kind of consent.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { patientMedia } from "@/db/schema";
import { storageService } from "@/lib/storage";
import { resolveInviteSession } from "@/lib/server/videoCall";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const lookup = await resolveInviteSession(body?.inviteToken);
    if (!lookup.ok) {
      return lookup.reason === "ended"
        ? NextResponse.json({ error: "This call has ended" }, { status: 410 })
        : NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    // Scoped to this session, not to the patient: the patient should see what
    // was taken during the call they are on, not their whole chart.
    const rows = await db
      .select({
        id: patientMedia.id,
        url: patientMedia.url,
        uploadedAt: patientMedia.uploadedAt,
      })
      .from(patientMedia)
      .where(eq(patientMedia.videoCallSessionId, lookup.session.id))
      .orderBy(desc(patientMedia.uploadedAt));

    const photos = await Promise.all(
      rows.map(async (row) => ({
        mediaId: row.id,
        capturedAt: row.uploadedAt.toISOString(),
        url: await storageService.getSignedUrl(row.url).catch(() => ""),
      })),
    );

    return NextResponse.json({ photos: photos.filter((p) => p.url) });
  } catch (error) {
    console.error("[video-call/media] failed:", error);
    return NextResponse.json(
      { error: "Failed to load photos" },
      { status: 500 },
    );
  }
}
