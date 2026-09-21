export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { missionAttachments } from "@/db/schema/missionAttachments";
import { storageService } from "@/lib/storage";
import { verifySessionFromRequest } from "@/lib/dal";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { missionId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const displayName = formData.get("displayName") as string | null;

    if (!file) {
      return NextResponse.json(
        { message: "File is required" },
        { status: 400 },
      );
    }

    if (!displayName) {
      return NextResponse.json(
        { message: "Display name is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only PDF, PNG, and JPG files are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "File size too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const sanitizedMissionId = missionId.replace(/[^a-zA-Z0-9-]/g, "");
    const basePath = `missions/${sanitizedMissionId}`;

    const result = await storageService.upload({
      file,
      fileName: file.name,
      contentType: file.type,
      basePath,
      metadata: {
        missionId,
        uploadedBy: session.userId,
        displayName,
      },
    });

    const [attachment] = await db
      .insert(missionAttachments)
      .values({
        missionId,
        uploadedBy: session.userId,
        filePath: result.filePath,
        fileName: result.fileName,
        displayName,
        fileSize: result.fileSize,
        contentType: result.contentType,
        uploadType: "admin_document",
      })
      .returning();

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Error uploading mission attachment:", error);
    return NextResponse.json(
      { message: "Failed to upload attachment" },
      { status: 500 },
    );
  }
}
