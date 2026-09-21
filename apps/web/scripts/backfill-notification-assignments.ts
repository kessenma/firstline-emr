// scripts/backfill-notification-assignments.ts
import { db } from "@/db/connection";
import { notifications, userNotifications, admins } from "@/db/schema";
import { eq, notInArray, and } from "drizzle-orm";

async function backfillNotificationAssignments() {
  console.log("🔄 Backfilling Notification Assignments");
  console.log("========================================\n");

  try {
    // 1. Get all admins
    console.log("1️⃣ Fetching all admins...");
    const adminRecords = await db
      .select({
        userId: admins.userId,
        email: admins.email,
        firstName: admins.firstName,
        lastName: admins.lastName,
      })
      .from(admins);

    if (adminRecords.length === 0) {
      console.log("❌ No admins found. Nothing to backfill.");
      return;
    }

    console.log(`✅ Found ${adminRecords.length} admin(s):`);
    adminRecords.forEach((admin) => {
      console.log(`   - ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });
    console.log();

    // 2. Get all new_user_signup notifications
    console.log("2️⃣ Fetching all signup notifications...");
    const signupNotifications = await db
      .select({
        id: notifications.id,
        message: notifications.message,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.type, "new_user_signup"));

    console.log(`✅ Found ${signupNotifications.length} signup notification(s)\n`);

    if (signupNotifications.length === 0) {
      console.log("✅ No signup notifications to backfill.");
      return;
    }

    // 3. For each notification, check if all admins have assignments
    console.log("3️⃣ Checking for missing assignments...");
    let totalMissing = 0;
    const missingAssignments: Array<{
      notificationId: string;
      userId: string;
      adminName: string;
      notificationMessage: string;
    }> = [];

    for (const notif of signupNotifications) {
      for (const admin of adminRecords) {
        // Check if this admin has this notification assigned
        const existing = await db
          .select()
          .from(userNotifications)
          .where(
            and(
              eq(userNotifications.notificationId, notif.id),
              eq(userNotifications.userId, admin.userId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          totalMissing++;
          missingAssignments.push({
            notificationId: notif.id,
            userId: admin.userId,
            adminName: `${admin.firstName} ${admin.lastName}`,
            notificationMessage: notif.message,
          });
        }
      }
    }

    console.log(`   Found ${totalMissing} missing assignment(s)\n`);

    if (totalMissing === 0) {
      console.log("✅ All notifications are properly assigned. No backfill needed.");
      return;
    }

    // 4. Create missing assignments
    console.log("4️⃣ Creating missing assignments...");

    for (const missing of missingAssignments) {
      try {
        await db.insert(userNotifications).values({
          userId: missing.userId,
          notificationId: missing.notificationId,
          read: false,
          dismissed: false,
          createdAt: new Date(),
        });

        console.log(`   ✅ Assigned to ${missing.adminName}`);
        console.log(`      Notification: ${missing.notificationMessage.substring(0, 60)}...`);
      } catch (error) {
        console.log(`   ❌ Failed to assign to ${missing.adminName}:`);
        console.log(`      ${error}`);
      }
    }

    console.log();

    // 5. Verify the backfill
    console.log("5️⃣ Verifying backfill...");
    for (const admin of adminRecords) {
      const adminNotifs = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, admin.userId));

      console.log(
        `   ${admin.firstName} ${admin.lastName}: ${adminNotifs.length} notification(s)`
      );
    }

    console.log();
    console.log("✅ Backfill completed successfully!");
    console.log(`   Total assignments created: ${totalMissing}`);
    console.log();
    console.log("💡 Next steps:");
    console.log("   1. Refresh the /notifications page");
    console.log("   2. Notifications should now appear for admins");
    console.log("   3. Test with a new signup to verify future notifications work");

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    throw error;
  }
}

// Run the backfill
backfillNotificationAssignments()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
