// app/api/auth/forgot-password/validate-code/route.ts

import { NextResponse } from "next/server";
import { validateResetLink } from "@/lib/auth-db-helpers";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const dynamic = "force-dynamic"; // Mark this route as dynamic

export async function GET(request: Request) {
  console.log("Validate code API called");

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("Received code:", code);

  if (!code) {
    console.log("No code provided");
    return NextResponse.json({ message: "Code is required" }, { status: 400 });
  }

  try {
    const resetLink = `${BASE_URL}/reset-password?code=${code}`;
    console.log("Searching for reset link:", resetLink);

    const isValid = await validateResetLink(resetLink);

    console.log("Reset link valid:", isValid);

    if (!isValid) {
      console.log("Invalid or expired reset link");
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 404 },
      );
    }

    console.log("Reset link is valid");
    return NextResponse.json(
      { message: "Reset link is valid" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in validate-code API:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
