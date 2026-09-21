// apps/web/app/api/admin/push-devices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { PushDevicesService } from "@/lib/pushDevicesService";

// PATCH - Deactivate or Reactivate a device
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    console.log("🔄 [PATCH] Device update request received");
    console.log("  - Device ID:", id);

    // Verify admin session
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await request.json();

    if (!["deactivate", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'deactivate' or 'reactivate'" },
        { status: 400 },
      );
    }

    // Update device status using service
    let success: boolean;
    if (action === "reactivate") {
      success = await PushDevicesService.reactivateDevice(id);
    } else {
      success = await PushDevicesService.deactivateDevice(id);
    }

    if (!success) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Fetch the updated device
    const updatedDevice = await PushDevicesService.fetchDeviceById(id);

    console.log(
      `✅ [PATCH] Device ${id} ${action === "reactivate" ? "reactivated" : "deactivated"} by admin ${session.userId}`,
    );

    return NextResponse.json({
      success: true,
      message: `Device ${action === "reactivate" ? "reactivated" : "deactivated"} successfully`,
      device: updatedDevice,
    });
  } catch (error) {
    console.error("❌ [PATCH] Error updating device:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE - Permanently delete a device
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    console.log("🗑️ [DELETE] Device deletion request received");
    console.log("  - Device ID:", id);
    console.log("  - ID type:", typeof id);

    // Verify admin session
    const session = await verifySessionFromRequest(request);
    console.log("  - Session verified:", !!session);
    console.log("  - Is admin:", session?.isAdmin);

    if (!session || !session.isAdmin) {
      console.log("❌ [DELETE] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("  - Attempting to delete device:", id);

    // First check if device exists
    const existingDevice = await PushDevicesService.fetchDeviceById(id);
    console.log("  - Device exists:", !!existingDevice);
    if (existingDevice) {
      console.log("  - Existing device:", {
        id: existingDevice.id,
        platform: existingDevice.platform,
        userId: existingDevice.userId,
      });
    }

    // Delete device using service
    const success = await PushDevicesService.deleteDevice(id);
    console.log("  - Delete operation success:", success);

    if (!success) {
      console.log("❌ [DELETE] Device not found:", id);
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    console.log(
      `✅ [DELETE] Device ${id} permanently deleted by admin ${session.userId}`,
    );

    return NextResponse.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error) {
    console.error("❌ [DELETE] Error deleting device:", error);
    console.error(
      "  - Error details:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
