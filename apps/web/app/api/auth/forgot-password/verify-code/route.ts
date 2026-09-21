// app/api/auth/forgot-password/verify-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyResetCode } from "@/lib/auth-db-helpers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, tempCode } = await request.json();

  if (!email || !tempCode) {
    return NextResponse.json(
      { success: false, error: "Email and verification code are required" },
      { status: 400 },
    );
  }

  try {
    const result = await verifyResetCode(email, tempCode);

    if (!result.valid) {
      if (result.expired) {
        return NextResponse.json(
          { success: false, error: "Verification code expired" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
