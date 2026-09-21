export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage";
import { verifySessionFromRequest } from "@/lib/dal";

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

    // Validate missionId param exists
    await params;

    const { filePath } = await request.json();

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { message: "filePath is required" },
        { status: 400 },
      );
    }

    // Delete the single file by using deleteByPrefix with the exact path
    await storageService.deleteByPrefix(filePath);

    return NextResponse.json({ message: "Image deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting hospital image:", error);
    return NextResponse.json(
      { message: "Failed to delete hospital image" },
      { status: 500 },
    );
  }
}
