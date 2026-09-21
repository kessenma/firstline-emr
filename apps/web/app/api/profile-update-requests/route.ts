// app/api/profile-update-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { userProfileUpdateRequests, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyAdminsOfProfileUpdateRequest } from "@/lib/notifications/profileUpdateNotifications";

// POST - Create a new profile update request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fieldName, requestedValue, currentValue } = body;

    // Validate required fields
    if (!fieldName || requestedValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: fieldName and requestedValue" },
        { status: 400 },
      );
    }

    // Validate fieldName is an admin-approval field
    const validFields = ["doctorSpecialty", "accountType"];
    if (!validFields.includes(fieldName)) {
      return NextResponse.json(
        {
          error:
            "Invalid field name. Only doctorSpecialty and accountType require admin approval.",
        },
        { status: 400 },
      );
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if there's already a pending request for this field
    const existingPendingRequest =
      await db.query.userProfileUpdateRequests.findFirst({
        where: and(
          eq(userProfileUpdateRequests.userId, session.user.id),
          eq(userProfileUpdateRequests.fieldName, fieldName as any),
          eq(userProfileUpdateRequests.status, "pending"),
        ),
      });

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending request for this field. Please wait for admin review.",
        },
        { status: 409 },
      );
    }

    // Create the update request
    const [newRequest] = await db
      .insert(userProfileUpdateRequests)
      .values({
        userId: session.user.id,
        fieldName: fieldName as any,
        currentValue: currentValue,
        requestedValue: requestedValue,
        status: "pending",
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
      })
      .returning();

    // Notify admins of the new profile update request
    try {
      await notifyAdminsOfProfileUpdateRequest({
        userId: session.user.id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        fieldName: fieldName,
        requestedValue: requestedValue,
        requestId: newRequest.id,
      });
    } catch (notificationError) {
      console.error("Error sending admin notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: "Profile update request created successfully",
        request: newRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating profile update request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET - Get user's profile update requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let whereConditions: any = eq(
      userProfileUpdateRequests.userId,
      session.user.id,
    );

    if (status && ["pending", "approved", "denied"].includes(status)) {
      whereConditions = and(
        whereConditions,
        eq(userProfileUpdateRequests.status, status as any),
      );
    }

    const requests = await db.query.userProfileUpdateRequests.findMany({
      where: whereConditions,
      orderBy: (userProfileUpdateRequests, { desc }) => [
        desc(userProfileUpdateRequests.requestedAt),
      ],
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile update requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
