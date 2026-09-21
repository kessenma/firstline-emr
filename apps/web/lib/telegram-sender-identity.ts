// apps/web/lib/telegram-sender-identity.ts
//
// Who a patient-facing message is signed as.
//
// Resolved from the server's `users` row rather than from anything the client
// sends, so the name on the signature is the name on the account. Both the
// generic send-text route and the prescription send route go through this, and
// so sign identically.

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SenderIdentity {
  senderName: string;
  senderId: string | null;
}

export async function resolveSenderIdentity(session: {
  userId?: string | null;
  email?: string | null;
}): Promise<SenderIdentity> {
  if (!session?.userId) {
    return { senderName: "System", senderId: null };
  }

  try {
    const [userRecord] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (userRecord) {
      const { firstName, lastName, email } = userRecord;
      return {
        senderName:
          `${firstName || ""} ${lastName || ""}`.trim() || email || "System",
        senderId: session.userId,
      };
    }
  } catch (error) {
    console.warn(
      "[telegram-sender-identity] Could not fetch user details, using email:",
      error,
    );
  }

  return { senderName: session.email || "System", senderId: session.userId };
}
