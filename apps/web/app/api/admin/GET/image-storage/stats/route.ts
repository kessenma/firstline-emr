// apps/web/app/api/admin/GET/image-storage/stats/route.ts
// Storage totals and per-category breakdown for the admin storage browser.
// Reads the same cached index the list endpoint uses, so asking for stats costs
// nothing extra once the index is warm.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { getStorageIndex, buildStorageStats } from "@/lib/storage/storage-index";

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
    const refresh = searchParams.get("refresh") === "true";

    const index = await getStorageIndex(refresh);

    return NextResponse.json({
      stats: buildStorageStats(index),
      // Surfaced so the UI can caveat the totals when the listing hit its cap
      // or errored partway rather than presenting a floor as exact.
      truncated: index.truncated,
    });
  } catch (error) {
    console.error("Image storage stats error:", error);
    return NextResponse.json(
      { message: "Failed to load storage stats" },
      { status: 500 },
    );
  }
}
