import { db } from "@/db";
import { users, type User } from "@/db/schema/users";
import { eq } from "drizzle-orm";

// Note: You'll need to create a userProfileLogs schema if you want to track profile changes
// For now, using the users table directly

export async function logProfileUpdate(userId: string, changes: Record<string, any>) {
  // This would need a proper profile logs table
  // For now, just updating the updatedAt timestamp
  await db
    .update(users)
    .set({ updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

