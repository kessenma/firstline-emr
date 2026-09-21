// app/api/auth/forgot-password/send-verification-code/route.ts

import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/utils/emails/forgot-password";
import {
  findUserByEmail,
  setVerificationCode,
  checkRateLimit,
} from "@/lib/auth-db-helpers";
import CryptoJS from "crypto-js";

export async function POST(request: Request) {
  try {
    // Extract the user's IP address from the headers
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Apply custom rate limiting
    if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Too many requests, please try again later." },
        { status: 429 },
      );
    }

    const { email } = await request.json();

    if (!email) {
      console.log("Forgot password: Email not provided");
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return NextResponse.json(
        { message: "If the email exists, a verification code has been sent." },
        { status: 200 },
      );
    }

    // Generate a 6-character hex code
    const tempCode = CryptoJS.lib.WordArray.random(3)
      .toString(CryptoJS.enc.Hex)
      .toUpperCase();

    // Save the code with 30-minute expiry
    await setVerificationCode(email, tempCode, 30);

    try {
      await sendVerificationEmail(user.email, tempCode);
    } catch (error) {
      console.error(
        `Forgot password: Error sending verification email to ${email}:`,
        error,
      );
      return NextResponse.json(
        { message: "Error sending verification email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "If the email exists, a verification code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password: Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
