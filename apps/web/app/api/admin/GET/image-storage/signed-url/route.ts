// apps/web/app/api/admin/GET/image-storage/signed-url/route.ts
// Re-sign a single object. The listing endpoint returns URLs valid for an hour;
// this is what a client calls when one expires while a preview is still open.
//
// With `variant=thumb` it returns the derived thumbnail instead, generating it
// on demand. That is how a client without its own thumbnail pipeline (mobile)
// backfills previews for objects the listing had none for.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { getBrowsePrefix } from "@/lib/storage/storage-index";
import { thumbKeyFor } from "@/lib/storage/thumbnails";

const SIGNED_URL_TTL_SECONDS = 3600;

export async function GET(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ message: "key is required" }, { status: 400 });
    }

    // Constrain to the prefix this instance browses, so an arbitrary key cannot
    // be used to mint a URL for an object outside it.
    const env = getBrowsePrefix();
    if (!key.startsWith(`${env}/`)) {
      return NextResponse.json({ message: "Invalid key" }, { status: 400 });
    }

    if (searchParams.get("variant") === "thumb") {
      const thumbKey = thumbKeyFor(key);
      const status = thumbKey
        ? await storageService.ensureThumbnail(key)
        : "unavailable";

      // "unavailable" is a normal outcome (HEIC, oversized, unrenderable PDF).
      // The client shows a type icon rather than treating it as an error.
      if (status !== "ready" || !thumbKey) {
        return NextResponse.json({ url: null, thumbStatus: "unavailable" });
      }

      const thumbUrl = await storageService.getSignedUrl(
        thumbKey,
        SIGNED_URL_TTL_SECONDS,
      );
      return NextResponse.json({ url: thumbUrl, thumbStatus: "ready" });
    }

    const url = await storageService.getSignedUrl(key, SIGNED_URL_TTL_SECONDS);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Image storage signed URL error:", error);
    return NextResponse.json(
      { message: "Failed to generate signed URL" },
      { status: 500 },
    );
  }
}
