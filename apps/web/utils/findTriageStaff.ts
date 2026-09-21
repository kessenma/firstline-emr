import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, inArray, and } from "drizzle-orm";

// Function to find all triage staff user IDs
export async function findTriageStaffIds() {
  try {
    // Find users with accountType of 'Triage' or 'Doctor'
    const triageStaff = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.accountType, ["Triage", "Doctor"]),
          eq(users.authorized, true),
        ),
      );

    return triageStaff.map((user) => user.id);
  } catch (error) {
    console.error("Error finding triage staff:", error);
    return [];
  }
}

// Function to find only Triage account type staff
export async function findOnlyTriageStaffIds() {
  try {
    const triageStaff = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.accountType, "Triage"), eq(users.authorized, true)));

    return triageStaff.map((user) => user.id);
  } catch (error) {
    console.error("Error finding triage staff:", error);
    return [];
  }
}

export async function findTriageStaff() {
  return await db.select().from(users).where(eq(users.accountType, "Triage"));
}
