// fajr-medflow-emr/apps/web/app/api/user/device-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      token,
      platform,
      environment = "prod",
      deviceId,
      deviceModel,
      appVersion,
      buildNumber,
    } = await request.json();

    // Validate required fields
    if (!token || !platform) {
      return NextResponse.json(
        { error: "Token and platform are required" },
        { status: 400 },
      );
    }

    // Validate platform.
    //
    // "ios_voip" is a PushKit token — a *different* token from the same device
    // than the "ios" APNs one, hence its own row rather than a column. Keeping
    // them as separate platforms is also what stops an alert push from ever
    // targeting a VoIP token, which APNs silently drops.
    if (!["ios", "android", "ios_voip"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be 'ios', 'android' or 'ios_voip'" },
        { status: 400 },
      );
    }

    // Validate environment
    if (!["dev", "prod"].includes(environment)) {
      return NextResponse.json(
        { error: "Invalid environment. Must be 'dev' or 'prod'" },
        { status: 400 },
      );
    }

    // Upsert device token using PostgreSQL's ON CONFLICT
    // This handles three scenarios:
    // 1. New token -> insert new row
    // 2. Existing token for same user -> update last_seen_at
    // 3. Existing token for different user -> reassign to current user (device switched accounts)
    const result = await db
      .insert(pushDevices)
      .values({
        userId: session.userId,
        platform,
        token,
        environment,
        isActive: true,
        lastSeenAt: new Date(),
        deviceId,
        deviceModel,
        appVersion,
        buildNumber,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          pushDevices.token,
          pushDevices.platform,
          pushDevices.environment,
        ],
        set: {
          userId: session.userId, // Reassign to current user
          isActive: true,
          lastSeenAt: new Date(),
          deviceId,
          deviceModel,
          appVersion,
          buildNumber,
          updatedAt: new Date(),
        },
      })
      .returning();

    const device = result[0];

    console.log(
      `✅ Device token registered for user ${session.userId} on ${platform} (${environment})`,
      {
        deviceId: device.id,
        wasReassigned: device.createdAt < device.updatedAt,
      },
    );

    return NextResponse.json({
      success: true,
      message: "Device token registered successfully",
      device: {
        id: device.id,
        platform: device.platform,
        environment: device.environment,
      },
    });
  } catch (error) {
    console.error("❌ Error registering device token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve active device tokens for current user
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active devices for this user
    const devices = await db.query.pushDevices.findMany({
      where: and(
        eq(pushDevices.userId, session.userId),
        eq(pushDevices.isActive, true),
      ),
      orderBy: (pushDevices, { desc }) => [desc(pushDevices.lastSeenAt)],
    });

    // Group by platform for easier consumption by client
    const groupedDevices = {
      ios: devices
        .filter((d) => d.platform === "ios")
        .map((d) => ({
          id: d.id,
          token: d.token,
          environment: d.environment,
          lastSeenAt: d.lastSeenAt,
          deviceId: d.deviceId,
          appVersion: d.appVersion,
        })),
      android: devices
        .filter((d) => d.platform === "android")
        .map((d) => ({
          id: d.id,
          token: d.token,
          environment: d.environment,
          lastSeenAt: d.lastSeenAt,
          deviceId: d.deviceId,
          appVersion: d.appVersion,
        })),
    };

    return NextResponse.json({
      devices: groupedDevices,
      totalActive: devices.length,
    });
  } catch (error) {
    console.error("❌ Error retrieving device tokens:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE endpoint to deactivate device token (for logout)
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, platform, deviceId } = await request.json();

    // Build where clause based on what's provided
    let whereClause;

    if (token && platform) {
      // Deactivate specific token
      whereClause = and(
        eq(pushDevices.userId, session.userId),
        eq(pushDevices.token, token),
        eq(pushDevices.platform, platform),
      );
    } else if (deviceId) {
      // Deactivate by device ID
      whereClause = and(
        eq(pushDevices.userId, session.userId),
        eq(pushDevices.deviceId, deviceId),
      );
    } else if (platform) {
      // Deactivate all tokens for a platform
      whereClause = and(
        eq(pushDevices.userId, session.userId),
        eq(pushDevices.platform, platform),
      );
    } else {
      // Deactivate all tokens for user
      whereClause = eq(pushDevices.userId, session.userId);
    }

    // Mark devices as inactive instead of deleting (better for audit trail)
    const deactivated = await db
      .update(pushDevices)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(whereClause)
      .returning();

    console.log(
      `🗑️ Deactivated ${deactivated.length} device(s) for user ${session.userId}`,
      {
        token: token ? `${token.substring(0, 10)}...` : "all",
        platform: platform || "all platforms",
      },
    );

    return NextResponse.json({
      success: true,
      message: "Device token(s) deactivated successfully",
      deactivatedCount: deactivated.length,
    });
  } catch (error) {
    console.error("❌ Error deactivating device token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH endpoint to reactivate a device (if user logs back in on same device)
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 },
      );
    }

    // Reactivate the device
    const reactivated = await db
      .update(pushDevices)
      .set({
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pushDevices.userId, session.userId),
          eq(pushDevices.id, deviceId),
        ),
      )
      .returning();

    if (reactivated.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    console.log(`♻️ Reactivated device ${deviceId} for user ${session.userId}`);

    return NextResponse.json({
      success: true,
      message: "Device token reactivated successfully",
      device: reactivated[0],
    });
  } catch (error) {
    console.error("❌ Error reactivating device token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
