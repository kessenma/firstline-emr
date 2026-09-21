// app/api/video-call/capture/route.ts
//
// Receives a still captured by the patient's browser during a consult and files
// it in the patient chart.
//
// Authenticated *only* by a capture token — a 90-second JWT that an
// authenticated clinician had to request. There is deliberately no session
// check and no invite-token path: the caller here is a patient's browser, which
// has neither, and accepting the invite token would let anyone holding the
// Telegram link write images into a medical record.
//
// Nothing about the target is taken from the request body. The patient id comes
// out of the signed token, so a caller cannot redirect an upload at a different
// patient's chart.

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  patientMedia,
  videoCallSessions,
  PATIENT_MEDIA_SOURCE,
} from "@/db/schema";
import { storageService } from "@/lib/storage";
import { verifyCaptureToken } from "@/lib/server/videoCall";
import {
  PHOTO_CAPTURE_CONTENT_TYPE,
  PHOTO_CAPTURE_MAX_BYTES,
  isInviteExpired,
} from "@fajr/shared/video-call";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const claims = rawToken ? verifyCaptureToken(rawToken) : null;
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid or expired capture token" },
        { status: 401 },
      );
    }

    // Re-check the call itself. The token is short-lived, but a clinician can
    // end a call inside those 90 seconds and the patient's page may not have
    // noticed yet.
    const callSession = await db.query.videoCallSessions.findFirst({
      where: eq(videoCallSessions.id, claims.sid),
      columns: {
        id: true,
        patientId: true,
        isRevoked: true,
        status: true,
        expiresAt: true,
        photoConsentAt: true,
      },
    });

    if (!callSession || callSession.patientId !== claims.pid) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (
      callSession.isRevoked ||
      callSession.status === "expired" ||
      isInviteExpired(callSession.expiresAt)
    ) {
      return NextResponse.json(
        { error: "This call has ended" },
        { status: 410 },
      );
    }

    // Consent can be withdrawn between minting and upload.
    if (!callSession.photoConsentAt) {
      return NextResponse.json(
        { error: "The patient has not agreed to photos for this call" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is missing" }, { status: 400 });
    }

    if (file.size > PHOTO_CAPTURE_MAX_BYTES) {
      return NextResponse.json({ error: "File is too large" }, { status: 413 });
    }

    // Only images. This endpoint is reachable by a patient's browser, so the
    // content type is an assertion, not a fact — but it costs nothing to
    // refuse anything that isn't claiming to be an image.
    if (file.type && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only images can be captured" },
        { status: 415 },
      );
    }

    const width = Number(formData.get("width")) || 0;
    const height = Number(formData.get("height")) || 0;

    // Same bucket path as manual chart uploads: a capture is a patient photo,
    // and splitting the storage tree would break the existing per-patient
    // media sweep on patient deletion.
    const result = await storageService.upload({
      file,
      fileName: `video-consult-${Date.now()}.jpg`,
      contentType: file.type || PHOTO_CAPTURE_CONTENT_TYPE,
      basePath: `patient-media/${callSession.patientId}`,
      metadata: {
        patientId: callSession.patientId,
        source: PATIENT_MEDIA_SOURCE.VIDEO_CALL,
        videoCallSessionId: callSession.id,
        capturedBy: claims.uid,
        capturedAt: new Date().toISOString(),
      },
    });

    const [media] = await db
      .insert(patientMedia)
      .values({
        patientId: callSession.patientId,
        url: result.filePath,
        contentType: result.contentType,
        source: PATIENT_MEDIA_SOURCE.VIDEO_CALL,
        videoCallSessionId: callSession.id,
        uploadedAt: new Date(),
      })
      .returning({ id: patientMedia.id });

    console.log("[video-call/capture] saved:", {
      mediaId: media.id,
      sessionId: callSession.id,
      capturedBy: claims.uid,
      bytes: result.fileSize,
    });

    return NextResponse.json({
      v: 1,
      mediaId: media.id,
      filePath: result.filePath,
      width,
      height,
    });
  } catch (error) {
    console.error("[video-call/capture] failed:", error);
    return NextResponse.json(
      { error: "Failed to save the photo" },
      { status: 500 },
    );
  }
}
