// apps/web/app/api/auth/totp/setup/route.ts
// Generates a TOTP secret and QR code for authenticator app enrollment
import { NextRequest, NextResponse } from "next/server";
import { generateTotpSecret } from "@/lib/totp";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Generate TOTP secret
    const { secret, otpauthUri, encrypted } = generateTotpSecret(email);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    // Create a setup token (JWT) containing encrypted secret data
    // This allows stateless verification during signup flow
    const setupToken = jwt.sign(
      {
        encryptedSecret: encrypted.encrypted,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
        rawSecret: secret, // Included for setup verification (before DB storage)
        email,
        purpose: "totp_setup",
      },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    return NextResponse.json({
      qrCodeDataUrl,
      manualEntryKey: secret, // Base32 key for manual entry in authenticator app
      setupToken,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate TOTP setup" },
      { status: 500 },
    );
  }
}
