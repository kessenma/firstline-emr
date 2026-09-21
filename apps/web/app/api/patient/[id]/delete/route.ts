// app/api/patient/[id]/delete/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, telegramThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPatientDeletionMessage } from "@/utils/telegram/sendPatientDeletionMessage";
import { storageService } from "@/lib/storage";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    if (!id) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    console.log("[Debug] Attempting to delete patient with ID:", id);

    // Find the patient first
    const patient = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        telegramChatId: patients.telegramChatId,
        language: patients.language,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient || patient.length === 0) {
      console.log("[Debug] Patient not found:", id);
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patientData = patient[0];

    // Send Telegram deletion message if chatId exists
    if (patientData.telegramChatId) {
      console.log(
        "[Debug] Sending Telegram deletion message to:",
        patientData.telegramChatId,
      );
      try {
        await sendPatientDeletionMessage(
          patientData.telegramChatId,
          `${patientData.firstName} ${patientData.lastName}`,
          patientData.language || "english", // Default to English
        );
      } catch (telegramError) {
        console.error(
          "[Warning] Failed to send Telegram deletion message:",
          telegramError,
        );
        // Continue with deletion even if Telegram notification fails
      }
    }

    // Delete media files from object storage
    if (patientData.telegramChatId) {
      const env = storageService.getEnvironmentPrefix();
      const chatId = patientData.telegramChatId;

      console.log(
        "[Debug] Deleting media files for telegram chat:",
        chatId,
      );

      // Delete telegram photos, audio, and any other media
      const mediaDeletePromises = [
        storageService.deleteByPrefix(`${env}/telegram/photos/${chatId}`),
        storageService.deleteByPrefix(`${env}/telegram/audio/${chatId}`),
      ];

      try {
        const results = await Promise.all(mediaDeletePromises);
        const totalDeleted = results.reduce((sum, count) => sum + count, 0);
        console.log(
          `[Debug] Deleted ${totalDeleted} media files for chat ${chatId}`,
        );
      } catch (mediaError) {
        console.error(
          "[Warning] Failed to delete some media files:",
          mediaError,
        );
        // Continue with deletion even if media cleanup fails
      }

      // Delete the telegram thread explicitly (otherwise it gets orphaned)
      console.log("[Debug] Deleting telegram thread for chat:", chatId);
      await db
        .delete(telegramThreads)
        .where(eq(telegramThreads.chatId, chatId));
    }

    // Delete patient media from storage
    const env = storageService.getEnvironmentPrefix();
    try {
      const deletedCount = await storageService.deleteByPrefix(
        `${env}/patient-media/${id}`,
      );
      // Also clean up legacy patient-photos path
      const legacyCount = await storageService.deleteByPrefix(
        `${env}/patient-photos/${id}`,
      );
      console.log(`[Debug] Deleted ${deletedCount + legacyCount} patient media files for ${id}`);
    } catch (mediaError) {
      console.error("[Warning] Failed to delete patient media:", mediaError);
    }

    // Delete the patient (cascade delete will handle remaining related records)
    await db.delete(patients).where(eq(patients.id, id));

    console.log(
      "[Debug] Patient deleted successfully:",
      patientData.firstName,
      patientData.lastName,
    );

    return NextResponse.json({
      message: `Patient ${patientData.firstName} ${patientData.lastName} deleted successfully`,
    });
  } catch (error) {
    console.error("[Error] Error deleting patient:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 },
    );
  }
}
