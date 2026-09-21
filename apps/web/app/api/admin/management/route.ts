// app/api/admin/management/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import {
  getAllAdmins,
  addAdmin,
  removeAdmin,
  findAdminById,
} from "@/lib/auth-db-helpers";

// POST: Add a user to the admin collection
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 },
      );
    }

    const newAdmin = await addAdmin(userId);

    if (!newAdmin) {
      // Check if user exists or is already admin
      return NextResponse.json(
        { message: "User not found or is already an admin" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "User added as admin successfully", admin: newAdmin },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json(
      { message: "Failed to add user as admin" },
      { status: 500 },
    );
  }
}

// GET: Fetch all admins
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const admins = await getAllAdmins();

    if (!admins || admins.length === 0) {
      return NextResponse.json({ message: "No admins found" }, { status: 404 });
    }

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error: unknown) {
    console.error("Detailed error in GET request:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Failed to fetch admins", error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "An unknown error occurred" },
      { status: 500 },
    );
  }
}

// DELETE: Remove a user from the admin collection
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { adminId } = await request.json();
    if (!adminId) {
      return NextResponse.json(
        { message: "Admin ID is required" },
        { status: 400 },
      );
    }

    const admin = await findAdminById(adminId);
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    const removed = await removeAdmin(adminId);

    if (!removed) {
      return NextResponse.json(
        { message: "Failed to remove admin" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Admin removed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in DELETE request:", error);
    return NextResponse.json(
      { message: "Failed to remove admin" },
      { status: 500 },
    );
  }
}
