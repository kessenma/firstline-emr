// apps/web/app/api/admin/patients/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { patients, admins, patientMedia, telegramThreads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { storageService } from "@/lib/storage";
import { sendPatientDeletionMessage } from "@/utils/telegram/sendPatientDeletionMessage";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use this endpoint - check if user exists in admins table
    const adminUser = await db
      .select()
      .from(admins)
      .where(eq(admins.userId, session.user.id))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("id");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID required" },
        { status: 400 },
      );
    }

    let deletedPatientId: string | null = null;
    let deletedTelegramChatId: string | null = null;
    let deletedMediaCount = 0;

    {
      // Get patient data before deletion (including info for Telegram message)
      const patientData = await db
        .select({
          telegramChatId: patients.telegramChatId,
          firstName: patients.firstName,
          lastName: patients.lastName,
          language: patients.language,
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (patientData.length === 0) {
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 },
        );
      }

      deletedTelegramChatId = patientData[0].telegramChatId || null;

      // Send Telegram deletion message BEFORE deleting data
      if (deletedTelegramChatId) {
        const patientName = `${patientData[0].firstName || ""} ${patientData[0].lastName || ""}`.trim() || "Patient";
        try {
          await sendPatientDeletionMessage(
            deletedTelegramChatId,
            patientName,
            patientData[0].language || "english",
          );
          console.log(`[Admin Delete] Sent Telegram deletion message to chat ${deletedTelegramChatId}`);
        } catch (telegramError) {
          console.error("[Admin Delete] Failed to send Telegram deletion message:", telegramError);
          // Continue with deletion even if message fails
        }
      }

      // Delete media files from storage before deleting database records
      const environment = storageService.getEnvironmentPrefix();

      // Delete patient media
      const patientMediaCount = await storageService.deleteByPrefix(
        `${environment}/patient-media/${patientId}`,
      );
      // Also clean up legacy patient-photos path
      const legacyMediaCount = await storageService.deleteByPrefix(
        `${environment}/patient-photos/${patientId}`,
      );
      deletedMediaCount += patientMediaCount + legacyMediaCount;

      // Delete telegram media if exists
      if (deletedTelegramChatId) {
        const telegramPhotosCount = await storageService.deleteByPrefix(
          `${environment}/telegram/photos/${deletedTelegramChatId}`,
        );
        const telegramAudioCount = await storageService.deleteByPrefix(
          `${environment}/telegram/audio/${deletedTelegramChatId}`,
        );
        deletedMediaCount += telegramPhotosCount + telegramAudioCount;
      }

      // Delete patient (cascading will handle related data)
      await db.delete(patients).where(eq(patients.id, patientId));

      deletedPatientId = patientId;
    }

    // Delete Telegram thread directly from database
    if (deletedTelegramChatId) {
      try {
        await db
          .delete(telegramThreads)
          .where(eq(telegramThreads.chatId, deletedTelegramChatId));
        console.log(`[Admin Delete] Deleted telegram thread for chat ${deletedTelegramChatId}`);
      } catch (error) {
        console.error("[Admin Delete] Error deleting Telegram thread:", error);
        // Continue even if telegram deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Patient deleted successfully",
      deletedPatientId,
      deletedTelegramChatId,
      deletedMediaCount,
    });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 },
    );
  }
}
