// apps/web/utils/user-model-utils.ts
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { userSettings } from "@/db/schema/userSettings";
import { userNotifications } from "@/db/schema/notifications";
import { userMessages } from "@/db/schema/userMessages";
import { eq } from "drizzle-orm";

/**
 * NOTE: This function needs to be redesigned for the new SQL schema.
 * In SQL/Drizzle, relations are managed differently - users don't store references to settings/notifications.
 * Instead, settings/notifications/messages have foreign keys to users.
 *
 * TODO: Reimplement this to:
 * 1. Check if user exists
 * 2. Check if settings exist for user, create if not
 * 3. Check if other related records exist, create if not
 * 4. No need to update user record with references
 */
export async function ensureUserModels(userId: string) {
  try {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    // Check and create user settings if needed
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!existingSettings) {
      // Create new settings with defaults based on account type
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          userId,
          // Preferences only — identity/professional fields live on `users`.
          lastView: "/",
        })
        .returning();

      console.log(`Created settings for ${user.accountType} user`);
    }

    // Check and create user messages if needed
    const [existingMessages] = await db
      .select()
      .from(userMessages)
      .where(eq(userMessages.userId, userId))
      .limit(1);

    if (!existingMessages) {
      await db.insert(userMessages).values({
        userId,
        lastReadAt: new Date(),
        unreadCount: 0,
      });

      console.log(`Created messages for user ${userId}`);
    }

    return {
      success: true,
      message: "User models ensured",
    };
  } catch (error) {
    console.error("Error ensuring user models:", error);
    throw error;
  }
}

export async function getUserWithSettings(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return { user, settings };
}

export async function getUserNotificationsCount(userId: string) {
  const unreadNotifications = await db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId));

  return unreadNotifications.filter((n) => !n.read).length;
}
