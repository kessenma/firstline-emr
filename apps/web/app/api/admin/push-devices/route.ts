// apps/web/app/api/admin/push-devices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PushDevicesService } from "@/lib/pushDevicesService";

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all devices with user information using service
    const { devices, stats } = await PushDevicesService.fetchDevices();

    return NextResponse.json({
      devices,
      stats,
    });
  } catch (error) {
    console.error("❌ Error fetching push devices:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
