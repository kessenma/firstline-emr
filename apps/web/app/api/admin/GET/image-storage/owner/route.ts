// app/api/admin/GET/image-storage/owner/route.ts
// Resolve who a stored object belongs to, for the Media Storage owner popover.
//
// The storage key only carries a category prefix and a scope segment; what
// that segment MEANS differs per category (patient uuid, telegram chat id,
// `{userId}_{lastName}`, specialty name, mission id...). This route owns that
// mapping so the client can stay dumb: it always receives a display-ready
// { kind, title, lines } and never interprets scope ids itself.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users, missions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import type {
  StorageCategoryId,
  StorageOwnerDetails,
} from "@fajr/shared/admin";

function unknownOwner(note: string, scopeId?: string): StorageOwnerDetails {
  return {
    kind: "unknown",
    title: "Owner not found",
    lines: [
      ...(scopeId ? [{ label: "Scope id", value: scopeId }] : []),
      { label: "Note", value: note },
    ],
  };
}

function patientDetails(p: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  telegramChatId: string | null;
}): StorageOwnerDetails {
  const name =
    [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unnamed patient";
  return {
    kind: "patient",
    title: name,
    lines: [
      { label: "Patient ID", value: p.id },
      {
        label: "Telegram",
        value: p.telegramChatId
          ? `Chat ${p.telegramChatId}`
          : "Not linked",
      },
    ],
  };
}

function staffDetails(u: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
}): StorageOwnerDetails {
  return {
    kind: "staff",
    title: `${u.firstName} ${u.lastName}`,
    lines: [
      { label: "Role", value: u.accountType },
      { label: "Email", value: u.email },
      { label: "User ID", value: u.id },
    ],
  };
}

async function findPatientById(id: string) {
  // Invalid uuids make Postgres throw on the cast — treat as not found.
  try {
    const rows = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        telegramChatId: patients.telegramChatId,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function findPatientByChatId(chatId: string) {
  try {
    const rows = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        telegramChatId: patients.telegramChatId,
      })
      .from(patients)
      .where(eq(patients.telegramChatId, chatId))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function findUserById(id: string) {
  try {
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Reverse lookup: which user's license records reference this storage key?
 * users.medicalLicenses stores each license's full file path (licenseUrl), so
 * this resolves LEGACY keys (`medical_license/{specialty}/...`) that carry no
 * user id of their own. Also returns the matching entry's specialty.
 */
async function findUserByLicenseKey(key: string) {
  try {
    // Escape LIKE wildcards; keys legitimately contain underscores.
    const pattern = `%${key.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
        medicalLicenses: users.medicalLicenses,
      })
      .from(users)
      .where(
        or(
          sql`${users.medicalLicenses}::text LIKE ${pattern}`,
          sql`${users.medicalLicense} LIKE ${pattern}`,
        ),
      )
      .limit(1);

    const u = rows[0];
    if (!u) return null;

    const entries = Array.isArray(u.medicalLicenses) ? u.medicalLicenses : [];
    const entry = entries.find(
      (l) =>
        typeof (l as { licenseUrl?: unknown }).licenseUrl === "string" &&
        (l as { licenseUrl: string }).licenseUrl.includes(key),
    ) as { specialty?: string } | undefined;

    return { user: u, specialty: entry?.specialty };
  } catch {
    return null;
  }
}

async function resolveOwner(
  category: StorageCategoryId,
  scopeId: string | null,
  key: string | null,
): Promise<StorageOwnerDetails> {
  switch (category) {
    case "patient-media": {
      if (!scopeId) return unknownOwner("Key has no patient segment");
      const p = await findPatientById(scopeId);
      return p
        ? patientDetails(p)
        : unknownOwner("Patient record may have been deleted", scopeId);
    }

    case "telegram-photos":
    case "telegram-audio": {
      if (!scopeId) return unknownOwner("Key has no chat segment");
      const p = await findPatientByChatId(scopeId);
      if (p) return patientDetails(p);
      return {
        kind: "unknown",
        title: "Unlinked Telegram chat",
        lines: [
          { label: "Chat ID", value: scopeId },
          { label: "Note", value: "No patient record references this chat" },
        ],
      };
    }

    case "profile-pictures": {
      // Keys are `user_pictures/{userId}_{lastName}/...` — id ends at the
      // first underscore (uuids contain hyphens, never underscores).
      const userId = scopeId?.split("_")[0];
      if (!userId) return unknownOwner("Key has no user segment");
      const u = await findUserById(userId);
      return u
        ? staffDetails(u)
        : unknownOwner("User record may have been deleted", scopeId ?? undefined);
    }

    case "feedback": {
      if (!scopeId) return unknownOwner("Key has no user segment");
      const u = await findUserById(scopeId);
      return u
        ? staffDetails(u)
        : unknownOwner("User record may have been deleted", scopeId);
    }

    case "medical-licenses": {
      // New keys are `medical_license/{userId}/{specialty}/...`; legacy keys
      // are `medical_license/{specialty}/...`. Resolve in order of cost:
      // scope-as-userId, then reverse lookup in users.medicalLicenses (covers
      // all legacy files), then the userId stamped in S3 object metadata.
      if (scopeId) {
        const u = await findUserById(scopeId);
        if (u) return staffDetails(u);
      }

      if (key) {
        const match = await findUserByLicenseKey(key);
        if (match) {
          const details = staffDetails(match.user);
          if (match.specialty) {
            details.lines.unshift({
              label: "Specialty",
              value: match.specialty,
            });
          }
          return details;
        }

        const head = await storageService.objectExists(key);
        const metaUserId = head.metadata?.userid;
        if (metaUserId) {
          const u = await findUserById(metaUserId);
          if (u) return staffDetails(u);
        }
      }

      return {
        kind: "staff",
        title: "Medical license upload",
        lines: [
          // Legacy keys scope by specialty; new keys by user id — either way
          // this is what the key says when no user record matches.
          { label: "Scope", value: scopeId ?? "Unknown" },
          { label: "Note", value: "Uploader could not be resolved" },
        ],
      };
    }

    case "internal-messages":
      return {
        kind: "staff",
        title: "Staff message attachment",
        lines: [{ label: "Thread ID", value: scopeId ?? "Unknown" }],
      };

    case "missions": {
      let missionName: string | null = null;
      if (scopeId) {
        try {
          const rows = await db
            .select({ name: missions.name })
            .from(missions)
            .where(eq(missions.id, scopeId))
            .limit(1);
          missionName = rows[0]?.name ?? null;
        } catch {
          missionName = null;
        }
      }
      return {
        kind: "system",
        title: "Mission attachment",
        lines: [
          { label: "Mission", value: missionName ?? scopeId ?? "Unknown" },
          { label: "Source", value: "System data" },
        ],
      };
    }

    case "admin-notifications":
      return {
        kind: "system",
        title: "Admin broadcast",
        lines: [{ label: "Source", value: "System data" }],
      };

    default:
      return unknownOwner("Unrecognized storage category");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as StorageCategoryId | null;
    const scopeId = searchParams.get("scopeId");
    const key = searchParams.get("key");

    if (!category) {
      return NextResponse.json(
        { message: "category query parameter is required" },
        { status: 400 },
      );
    }

    const details = await resolveOwner(category, scopeId, key);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Resolve storage owner error:", error);
    return NextResponse.json(
      { message: "Failed to resolve owner" },
      { status: 500 },
    );
  }
}
