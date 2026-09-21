// apps/web/app/api/patient/[id]/generate-telegram-link-code/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateLinkCode,
  getActiveLinkCode,
} from "@/lib/telegram-db-helpers";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/patient/[id]/generate-telegram-link-code
 *
 * Generates a 6-character link code for connecting a manually-created
 * patient to their Telegram account. Returns existing active code if
 * one exists.
 *
 * Also checks for pending link attempts — if a patient already sent
 * this code to the bot before the doctor synced, auto-resolves the link.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract patientId from URL
    const pathParts = req.nextUrl.pathname.split("/");
    const patientIdIndex = pathParts.indexOf("patient") + 1;
    const patientId = pathParts[patientIdIndex];

    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Parse optional language override from body
    let languageOverride: string | null = null;
    try {
      const body = await req.json();
      if (body?.language) {
        languageOverride = body.language;
      }
    } catch {
      // No body or invalid JSON — that's fine, use patient's default language
    }

    // Verify patient exists and check if already linked
    const [patient] = await db
      .select({
        id: patients.id,
        telegramChatId: patients.telegramChatId,
        language: patients.language,
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 },
      );
    }

    if (patient.telegramChatId) {
      return NextResponse.json(
        { error: "Patient already has a Telegram connection" },
        { status: 400 },
      );
    }

    // Use language override if provided, otherwise patient's language
    const codeLanguage = languageOverride || patient.language;

    // Generate code (returns existing active code if one exists)
    const result = await generateLinkCode(patientId, session.userId, codeLanguage);

    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt.toISOString(),
      isExisting: result.isExisting,
    });
  } catch (error: any) {
    console.error(
      "[generate-telegram-link-code] Error:",
      error.message || error,
    );
    return NextResponse.json(
      { error: "Failed to generate link code" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/patient/[id]/generate-telegram-link-code
 *
 * Returns the active link code for a patient, if one exists.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pathParts = req.nextUrl.pathname.split("/");
    const patientIdIndex = pathParts.indexOf("patient") + 1;
    const patientId = pathParts[patientIdIndex];

    if (!patientId || !UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    const existing = await getActiveLinkCode(patientId);

    if (!existing) {
      return NextResponse.json({ code: null });
    }

    return NextResponse.json({
      code: existing.code,
      expiresAt: existing.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error(
      "[generate-telegram-link-code GET] Error:",
      error.message || error,
    );
    return NextResponse.json(
      { error: "Failed to get link code" },
      { status: 500 },
    );
  }
}
