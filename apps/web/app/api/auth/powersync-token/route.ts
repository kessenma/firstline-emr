import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "@/lib/jwt-config";

// JWT_SECRET is not base64-encoded
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate PowerSync JWT token with kid header
  const token = jwt.sign(
    {
      sub: session.user.email,
      aud: JWT_CONFIG.AUDIENCE, // PowerSync requires 'aud' claim
      user_id: session.user.email,
      email: session.user.email,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
      header: {
        kid: JWT_CONFIG.KID,
        alg: JWT_CONFIG.ALG,
      },
    },
  );

  return NextResponse.json({ token });
}
