// apps/web/app/api/translation-models/download-url/route.ts
// Generates signed download URLs for CTranslate2 translation model archives

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";

// Model file paths in RustFS (uploaded via convert_to_ct2.py script)
const MODEL_PATHS: Record<string, string> = {
  "ar-en": "models/translation/ct2-opus-mt-ar-en.zip",
  "en-ar": "models/translation/ct2-opus-mt-en-ar.zip",
};

/**
 * GET /api/translation-models/download-url?direction=ar-en
 *
 * Returns a signed URL for downloading a CTranslate2 translation model.
 * Models are stored in RustFS object storage.
 *
 * @query direction - "ar-en" or "en-ar"
 * @returns { signedUrl, direction, filePath }
 */
export async function GET(req: NextRequest) {
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction");

  if (!direction || !MODEL_PATHS[direction]) {
    return NextResponse.json(
      { error: "Invalid direction. Use 'ar-en' or 'en-ar'." },
      { status: 400 },
    );
  }

  try {
    const filePath = MODEL_PATHS[direction];
    // 2 hour expiry - enough time to download ~75MB on slow connections
    const signedUrl = await storageService.getSignedUrl(filePath, 7200);

    console.log(
      `[translation-models] Generated download URL for ${direction} model`,
    );

    return NextResponse.json({
      signedUrl,
      direction,
      filePath,
    });
  } catch (error: any) {
    console.error(
      "[translation-models] Error generating download URL:",
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to generate download URL", details: error.message },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
