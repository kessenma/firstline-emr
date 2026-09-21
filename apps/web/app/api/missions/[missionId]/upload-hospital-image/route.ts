export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";
import { verifySessionFromRequest } from "@/lib/dal";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
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
    const hospitalName = formData.get("hospitalName") as string | null;

    if (!file) {
      return NextResponse.json(
        { message: "File is required" },
        { status: 400 },
      );
    }

    if (!hospitalName) {
      return NextResponse.json(
        { message: "Hospital name is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only PNG, JPG, and WebP images are allowed." },
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
    const sanitizedHospitalName = hospitalName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");
    const basePath = `missions/${sanitizedMissionId}/hospitals/${sanitizedHospitalName}`;

    const result = await storageService.upload({
      file,
      fileName: file.name,
      contentType: file.type,
      basePath,
      metadata: {
        missionId,
        hospitalName,
        uploadedBy: session.userId,
      },
    });

    return NextResponse.json({
      image: {
        filePath: result.filePath,
        fileName: result.fileName,
        fileSize: result.fileSize,
        contentType: result.contentType,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error uploading hospital image:", error);
    return NextResponse.json(
      { message: "Failed to upload hospital image" },
      { status: 500 },
    );
  }
}
