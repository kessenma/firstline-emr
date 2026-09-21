// app/api/admin/profile-update-requests/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  userProfileUpdateRequests,
  users,
  userProfileLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyUserOfProfileUpdateResponse } from "@/lib/notifications/profileUpdateNotifications";
import { verifySessionFromRequest } from "@/lib/dal";

export const dynamic = "force-dynamic";

// PATCH - Approve or deny a profile update request
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ requestId: string }> },
) {
  const params = await props.params;
  try {
    // Verify admin access using DAL (works with both cookies and Bearer tokens)
    const session = await verifySessionFromRequest(request);

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, reviewNotes } = body;

    // Validate action
    if (!action || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 },
      );
    }

    // Get the request
    const updateRequest = await db.query.userProfileUpdateRequests.findFirst({
      where: eq(userProfileUpdateRequests.id, params.requestId),
      with: {
        user: true,
      },
    });

    if (!updateRequest) {
      return NextResponse.json(
        { error: "Update request not found" },
        { status: 404 },
      );
    }

    // Check if already processed
    if (updateRequest.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${updateRequest.status}` },
        { status: 409 },
      );
    }

    // Get admin user details
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 },
      );
    }

    const newStatus = action === "approve" ? "approved" : "denied";

    // Start transaction
    await db.transaction(async (tx) => {
      // Update the request status
      await tx
        .update(userProfileUpdateRequests)
        .set({
          status: newStatus,
          reviewedBy: session.userId,
          reviewedByEmail: adminUser.email,
          reviewedByName: `${adminUser.firstName} ${adminUser.lastName}`,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(userProfileUpdateRequests.id, params.requestId));

      // If approved, update the user's profile
      if (action === "approve") {
        const fieldName = updateRequest.fieldName;
        const requestedValue = updateRequest.requestedValue;

        // Update the user's field
        await tx
          .update(users)
          .set({
            [fieldName]: requestedValue,
            updatedAt: new Date(),
          })
          .where(eq(users.id, updateRequest.userId));

        // Create a profile log entry
        await tx.insert(userProfileLogs).values({
          userId: updateRequest.userId,
          changedBy: session.userId,
          changes: [{
            field: fieldName,
            oldValue: updateRequest.currentValue,
            newValue: requestedValue,
          }],
          isAdminAction: true,
        });
      }
    });

    // Notify the user of the approval/denial
    try {
      await notifyUserOfProfileUpdateResponse({
        userId: updateRequest.userId,
        fieldName: updateRequest.fieldName,
        requestedValue: updateRequest.requestedValue,
        status: newStatus,
        reviewedByName: `${adminUser.firstName} ${adminUser.lastName}`,
        reviewNotes: reviewNotes,
        requestId: params.requestId,
      });
    } catch (notificationError) {
      console.error("Error sending user notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: `Profile update request ${action}d successfully`,
        status: newStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing profile update request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a profile update request
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ requestId: string }> },
) {
  const params = await props.params;
  try {
    // Verify admin access using DAL (works with both cookies and Bearer tokens)
    const session = await verifySessionFromRequest(request);

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the request
    await db
      .delete(userProfileUpdateRequests)
      .where(eq(userProfileUpdateRequests.id, params.requestId));

    return NextResponse.json(
      { message: "Profile update request deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting profile update request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
