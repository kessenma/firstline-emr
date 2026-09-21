// app/api/auth/forgot-password/verify-security-answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySecurityAnswer } from "@/lib/auth-db-helpers";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const {
    email,
    securityAnswer,
    securityQuestion,
  }: { email: string; securityAnswer: string; securityQuestion: string } =
    await request.json();

  if (!email || !securityAnswer || !securityQuestion) {
    console.error(
      "Missing email, security answer, or security question in request",
    );
    return NextResponse.json(
      {
        success: false,
        error: "Email, security answer, and security question are required",
      },
      { status: 400 },
    );
  }

  try {
    const isValid = await verifySecurityAnswer(
      email,
      securityQuestion,
      securityAnswer,
    );

    if (!isValid) {
      console.error("Incorrect security answer or question not found");
      return NextResponse.json(
        { success: false, error: "Incorrect security answer" },
        { status: 400 },
      );
    }

    // Generate a JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });

    console.log("Security answer verified successfully");
    return NextResponse.json({ success: true, token }, { status: 200 });
  } catch (error) {
    console.error("Error verifying security answer:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
