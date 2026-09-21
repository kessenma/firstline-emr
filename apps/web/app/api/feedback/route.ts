// app/api/feedback/route.ts
// Submit and list user feedback with optional file attachments

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { db } from "@/db";
import { userFeedback, users } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { FeedbackAttachment } from "@/db/schema/userFeedback";
import { notificationService } from "@/lib/NotificationService";

const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const VALID_CATEGORIES = [
  "feature_request",
  "bug",
  "question",
  "admin_assistance",
  "ui_improvement",
  "praise",
  "other",
  "offline_access",
] as const;

const VALID_PLATFORMS = ["mobile", "web", "both"] as const;
const VALID_MOBILE_PLATFORMS = ["android", "ios"] as const;

/**
 * POST /api/feedback
 * Submit new feedback with optional file attachments (FormData).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const category = formData.get("category") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const platform = formData.get("platform") as string;
    const mobilePlatform = formData.get("mobilePlatform") as string | null;
    const appSectionsRaw = formData.get("appSections") as string | null;
    const syncDiagnosticsRaw = formData.get("syncDiagnostics") as string | null;
    const appVersion = formData.get("appVersion") as string | null;

    // Validate required fields
    if (!category || !title || !description || !platform) {
      return NextResponse.json(
        { error: "category, title, description, and platform are required" },
        { status: 400 },
      );
    }

    if (!VALID_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: "Title must be 255 characters or less" },
        { status: 400 },
      );
    }

    if (!VALID_PLATFORMS.includes(platform as any)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate mobilePlatform when platform includes mobile
    const includesMobile = platform === "mobile" || platform === "both";
    if (includesMobile && mobilePlatform && !VALID_MOBILE_PLATFORMS.includes(mobilePlatform as any)) {
      return NextResponse.json(
        { error: `Invalid mobilePlatform. Must be one of: ${VALID_MOBILE_PLATFORMS.join(", ")}` },
        { status: 400 },
      );
    }

    // Parse app sections (optional multi-select)
    let appSections: string[] = [];
    if (appSectionsRaw) {
      try {
        appSections = JSON.parse(appSectionsRaw);
        if (!Array.isArray(appSections)) appSections = [];
      } catch {
        appSections = [];
      }
    }

    // Parse sync diagnostics (optional, for offline_access feedback)
    let syncDiagnostics = null;
    if (syncDiagnosticsRaw) {
      try {
        syncDiagnostics = JSON.parse(syncDiagnosticsRaw);
      } catch {
        syncDiagnostics = null;
      }
    }

    // Collect file attachments from FormData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "file" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} attachments allowed` },
        { status: 400 },
      );
    }

    // Validate file sizes
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds ${isVideo ? "50MB" : "10MB"} limit`,
          },
          { status: 400 },
        );
      }
    }

    // Upload attachments to object storage
    const attachments: FeedbackAttachment[] = [];
    const basePath = `feedback/${session.userId}`;

    for (const file of files) {
      const result = await storageService.upload({
        file,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        basePath,
        metadata: {
          userId: session.userId,
          feedbackCategory: category,
          uploadedAt: new Date().toISOString(),
        },
      });

      attachments.push({
        filePath: result.filePath,
        fileName: result.fileName,
        fileSize: result.fileSize,
        contentType: result.contentType,
      });
    }

    // Insert feedback record
    const [created] = await db
      .insert(userFeedback)
      .values({
        userId: session.userId,
        category: category as (typeof VALID_CATEGORIES)[number],
        title,
        description,
        platform: platform as (typeof VALID_PLATFORMS)[number],
        mobilePlatform: includesMobile && mobilePlatform
          ? (mobilePlatform as (typeof VALID_MOBILE_PLATFORMS)[number])
          : null,
        attachments,
        appSections,
        syncDiagnostics,
        appVersion: appVersion || null,
      })
      .returning();

    console.log(
      `[feedback] New feedback from ${session.email}: "${title}" (${category}) with ${attachments.length} attachment(s)`,
    );

    // Notify admins about new feedback
    try {
      const categoryLabel = category.replace(/_/g, " ");
      await notificationService.sendToAdmins({
        type: "alert",
        message: `New ${categoryLabel} from ${session.email}: "${title}"`,
        title: "New User Feedback",
        sourceId: created.id,
        redirectTo: "/admin/user-feedback",
      });
    } catch (notifError) {
      console.error("[feedback] Failed to send admin notification:", notifError);
    }

    return NextResponse.json({ success: true, feedback: created }, { status: 201 });
  } catch (error) {
    console.error("[feedback POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/feedback
 * List feedback. Regular users see their own; admins see all.
 * Query params: ?status=open&category=bug&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const isAdmin = session.isAdmin;

    // Build conditions
    const conditions = [];
    if (!isAdmin) {
      conditions.push(eq(userFeedback.userId, session.userId));
    }
    if (status) {
      conditions.push(eq(userFeedback.status, status as any));
    }
    if (category) {
      conditions.push(eq(userFeedback.category, category as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const feedbackItems = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        userName: isAdmin
          ? sql<string>`${users.firstName} || ' ' || ${users.lastName}`
          : sql<string>`''`,
        userEmail: isAdmin ? users.email : sql<string>`''`,
        category: userFeedback.category,
        title: userFeedback.title,
        description: userFeedback.description,
        attachments: userFeedback.attachments,
        appSections: userFeedback.appSections,
        platform: userFeedback.platform,
        mobilePlatform: userFeedback.mobilePlatform,
        status: userFeedback.status,
        adminNotes: userFeedback.adminNotes,
        syncDiagnostics: userFeedback.syncDiagnostics,
        appVersion: userFeedback.appVersion,
        threadId: userFeedback.threadId,
        reviewedBy: userFeedback.reviewedBy,
        reviewedAt: userFeedback.reviewedAt,
        createdAt: userFeedback.createdAt,
        updatedAt: userFeedback.updatedAt,
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .where(where)
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ feedback: feedbackItems });
  } catch (error) {
    console.error("[feedback GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}
