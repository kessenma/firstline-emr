// apps/web/app/api/admin/push-devices/[id]/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Verify admin session
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: deviceId } = await params;

    // Fetch device details
    const device = await db.query.pushDevices.findFirst({
      where: eq(pushDevices.id, deviceId),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (!device.isActive) {
      return NextResponse.json(
        { error: "Cannot send test notification to inactive device" },
        { status: 400 },
      );
    }

    // Get notifications server URL from environment
    const notificationsServerUrl =
      process.env.NOTIFICATIONS_SERVER_URL ||
      process.env.NEXT_PUBLIC_NOTIFICATIONS_SERVER_URL ||
      "http://notifications-server:8080";

    // Prepare the test notification
    const notification = {
      user_id: device.userId,
      title: "Test Notification",
      message: `This is a test notification sent from the admin dashboard at ${new Date().toLocaleString()}`,
      data: {
        type: "test",
        device_id: device.id,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `📤 Sending test notification to device ${device.id} (${device.platform}, ${device.environment})`,
    );
    console.log(`   User: ${device.userId}`);
    console.log(`   Notifications server: ${notificationsServerUrl}`);

    // Send notification to notifications server
    const response = await fetch(`${notificationsServerUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `❌ Notifications server error (${response.status}):`,
        errorText,
      );
      return NextResponse.json(
        {
          error: "Failed to send notification",
          details: errorText,
          status: response.status,
        },
        { status: 500 },
      );
    }

    const result = await response.json();
    console.log("✅ Test notification sent successfully:", result);

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
      device: {
        id: device.id,
        platform: device.platform,
        environment: device.environment,
        userName:
          device.user?.firstName && device.user?.lastName
            ? `${device.user.firstName} ${device.user.lastName}`
            : device.user?.email || "Unknown",
      },
      result,
    });
  } catch (error) {
    console.error("❌ Error sending test notification:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
