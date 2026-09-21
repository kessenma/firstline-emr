// scripts/test-admin-notifications.ts
import { db } from "@/db/connection";
import { admins, users, notifications, userNotifications } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

async function testAdminNotifications() {
  console.log("🔍 Testing Admin Notification System...\n");

  try {
    // 1. Check if there are any admins in the system
    console.log("1️⃣ Checking for admins in the system...");
    const adminRecords = await db
      .select({
        id: admins.id,
        userId: admins.userId,
        email: admins.email,
        firstName: admins.firstName,
        lastName: admins.lastName,
      })
      .from(admins);

    if (adminRecords.length === 0) {
      console.log("❌ No admins found in the database!");
      console.log("   First user should automatically become an admin.");
      return;
    }

    console.log(`✅ Found ${adminRecords.length} admin(s):`);
    adminRecords.forEach((admin) => {
      console.log(`   - ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });
    console.log();

    // 2. Check for new_user_signup notifications
    console.log("2️⃣ Checking for new user signup notifications...");
    const signupNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, "new_user_signup"));

    console.log(
      `✅ Found ${signupNotifications.length} signup notification(s)`,
    );
    if (signupNotifications.length > 0) {
      signupNotifications.slice(0, 3).forEach((notif) => {
        console.log(
          `   - [${notif.createdAt?.toISOString()}] ${notif.message}`,
        );
      });
      if (signupNotifications.length > 3) {
        console.log(`   ... and ${signupNotifications.length - 3} more`);
      }
    }
    console.log();

    // 3. Check if admins have notifications assigned to them
    console.log("3️⃣ Checking admin notification assignments...");
    for (const admin of adminRecords) {
      const adminNotifs = await db
        .select({
          id: userNotifications.id,
          read: userNotifications.read,
          notificationId: userNotifications.notificationId,
          createdAt: userNotifications.createdAt,
        })
        .from(userNotifications)
        .where(eq(userNotifications.userId, admin.userId));

      const unreadCount = adminNotifs.filter((n) => !n.read).length;

      console.log(
        `   ${admin.firstName} ${admin.lastName}: ${adminNotifs.length} total, ${unreadCount} unread`,
      );
    }
    console.log();

    // 4. Get detailed view of recent signup notifications for first admin
    if (adminRecords.length > 0 && signupNotifications.length > 0) {
      const firstAdmin = adminRecords[0];
      console.log(
        `4️⃣ Recent signup notifications for ${firstAdmin.firstName} ${firstAdmin.lastName}:`,
      );

      const adminSignupNotifs = await db
        .select({
          id: userNotifications.id,
          read: userNotifications.read,
          createdAt: userNotifications.createdAt,
          message: notifications.message,
          type: notifications.type,
          redirectTo: notifications.redirectTo,
        })
        .from(userNotifications)
        .innerJoin(
          notifications,
          eq(userNotifications.notificationId, notifications.id),
        )
        .where(eq(userNotifications.userId, firstAdmin.userId))
        .orderBy(userNotifications.createdAt)
        .limit(5);

      if (adminSignupNotifs.length === 0) {
        console.log("   ❌ No notifications found for this admin!");
        console.log("   This indicates a problem with notification creation.");
      } else {
        adminSignupNotifs.forEach((notif) => {
          const status = notif.read ? "📖 Read" : "🔔 Unread";
          console.log(`   ${status} [${notif.createdAt?.toISOString()}]`);
          console.log(`      ${notif.message}`);
          console.log(`      Redirect: ${notif.redirectTo || "none"}`);
        });
      }
      console.log();
    }

    // 5. Check for all users (to see pending signups)
    console.log("5️⃣ Checking for pending user signups...");
    const pendingUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
        authorized: users.authorized,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.authorized));

    console.log(`✅ Found ${pendingUsers.length} pending user(s)`);
    if (pendingUsers.length > 0) {
      pendingUsers.slice(0, 5).forEach((user) => {
        console.log(
          `   - ${user.firstName} ${user.lastName} (${user.email}) - ${user.accountType}`,
        );
      });
      if (pendingUsers.length > 5) {
        console.log(`   ... and ${pendingUsers.length - 5} more`);
      }
    }
    console.log();

    // Summary
    console.log("📊 SUMMARY:");
    console.log(`   Total Admins: ${adminRecords.length}`);
    console.log(`   Total Signup Notifications: ${signupNotifications.length}`);
    console.log(`   Pending User Signups: ${pendingUsers.length}`);
    console.log();

    if (adminRecords.length > 0 && signupNotifications.length === 0) {
      console.log(
        "⚠️  WARNING: Admins exist but no signup notifications found!",
      );
      console.log(
        "   This is expected if no new users have signed up since the first user.",
      );
    }

    if (
      adminRecords.length > 0 &&
      pendingUsers.length > signupNotifications.length
    ) {
      console.log("⚠️  WARNING: More pending users than signup notifications!");
      console.log(
        "   Some signups may have occurred before notification system was set up.",
      );
    }

    if (adminRecords.length > 0 && signupNotifications.length > 0) {
      console.log(
        "✅ Admin notification system appears to be working correctly!",
      );
      console.log("   Admins can view notifications at: /notifications");
    }
  } catch (error) {
    console.error("❌ Error testing admin notifications:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
      console.error("   Stack trace:", error.stack);
    }
  }
}

// Run the test
testAdminNotifications()
  .then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
