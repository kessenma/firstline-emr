// apps/web/app/api/notifications/specialty-no-doctors/route.ts
import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients } from "@/db/schema/patients";
import { eq } from "drizzle-orm";
import { notificationService } from "@/lib/NotificationService";

export async function POST(req: Request) {
  try {
    // Verify session
    const session = await verifySessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientId, specialty, patientName } = await req.json();

    // Validate required fields
    if (!patientId || !specialty) {
      return NextResponse.json(
        { error: "Patient ID and specialty are required" },
        { status: 400 },
      );
    }

    // Update patient to mark they have a specialty without doctors
    await db
      .update(patients)
      .set({
        hasSpecialtyWithoutDoctors: true,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId));

    // Create the notification message
    const message = `Patient ${patientName || patientId} has been assigned the specialty "${specialty}" which currently has no doctors available in the system. Please review and assign a doctor when one becomes available.`;

    // Use unified notification service (handles in-app + push notifications)
    const result = await notificationService.sendToAccountType({
      type: "specialty_no_doctors",
      category: "patient_action",
      message,
      accountType: "Triage",
      title: "Specialty Alert",
      subject: `Specialty Without Doctors: ${specialty}`,
      sourceId: session.userId,
      patientId,
      redirectTo: `/patient/${patientId}`,
      authorizedOnly: true,
    });

    if (result.totalCount === 0) {
      return NextResponse.json(
        { error: "No triage users found to notify" },
        { status: 404 },
      );
    }

    console.log(
      `Created specialty-no-doctors notification for ${result.totalCount} triage users (${result.pushSentCount} push)`,
    );

    return NextResponse.json({
      success: true,
      notificationId: result.notification.id,
      recipientCount: result.totalCount,
      pushSentCount: result.pushSentCount,
    });
  } catch (error) {
    console.error("Error creating specialty-no-doctors notification:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
