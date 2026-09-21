// scripts/debug-notifications.ts
import { db } from "@/db/connection";
import { users, admins, notifications, userNotifications, notificationRecipients } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notifyAdminsOfNewSignup } from "@/lib/notification-helpers";

async function debugNotifications() {
  console.log("🔍 DEBUG: NOTIFICATION SYSTEM");
  console.log("===============================\n");

  try {
    // 1. Check for admins
    console.log("1️⃣ Checking for admins...");
    const adminRecords = await db
      .select({
        id: admins.id,
        userId: admins.userId,
        email: admins.email,
        firstName: admins.firstName,
        lastName: admins.lastName,
      })
      .from(admins);

    console.log(`   Found ${adminRecords.length} admin(s):`);
    if (adminRecords.length === 0) {
      console.log("   ❌ NO ADMINS FOUND - This is the problem!");
      console.log("   💡 Solution: Create an admin first or ensure first user signup creates admin record\n");

      // Show first user
      const firstUser = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt)
        .limit(1);

      if (firstUser.length > 0) {
        console.log("   First user in database:");
        console.log(`      ${firstUser[0].firstName} ${firstUser[0].lastName} (${firstUser[0].email})`);
        console.log(`      User ID: ${firstUser[0].id}`);
        console.log(`      Created: ${firstUser[0].createdAt}\n`);
        console.log("   💡 To make this user an admin, run:");
        console.log(`      INSERT INTO admins (user_id, first_name, last_name, email, admin_start_date, created_at)`);
        console.log(`      VALUES ('${firstUser[0].id}', '${firstUser[0].firstName}', '${firstUser[0].lastName}', '${firstUser[0].email}', NOW(), NOW());\n`);
      }
      return;
    }

    adminRecords.forEach((admin) => {
      console.log(`      - ${admin.firstName} ${admin.lastName} (${admin.email})`);
      console.log(`        User ID: ${admin.userId}\n`);
    });

    // 2. Check for recent users (potential new signups)
    console.log("2️⃣ Checking recent user signups...");
    const recentUsers = await db
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
      .orderBy(desc(users.createdAt))
      .limit(5);

    console.log(`   Last 5 users created:`);
    recentUsers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`         Type: ${user.accountType} | Authorized: ${user.authorized === null ? 'Pending' : user.authorized ? 'Yes' : 'No'}`);
      console.log(`         Created: ${user.createdAt}\n`);
    });

    // 3. Check for notifications
    console.log("3️⃣ Checking signup notifications...");
    const signupNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, "new_user_signup"))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    console.log(`   Found ${signupNotifications.length} signup notification(s)`);
    if (signupNotifications.length === 0) {
      console.log("   ❌ NO SIGNUP NOTIFICATIONS FOUND\n");
    } else {
      console.log("   Recent signup notifications:");
      signupNotifications.forEach((notif, index) => {
        console.log(`      ${index + 1}. ${notif.message}`);
        console.log(`         ID: ${notif.id}`);
        console.log(`         Source User ID: ${notif.sourceId}`);
        console.log(`         Redirect: ${notif.redirectTo}`);
        console.log(`         Created: ${notif.createdAt}\n`);
      });
    }

    // 4. Check admin notification assignments
    console.log("4️⃣ Checking admin notification assignments...");
    for (const admin of adminRecords) {
      const adminNotifs = await db
        .select({
          id: userNotifications.id,
          notificationId: userNotifications.notificationId,
          read: userNotifications.read,
          dismissed: userNotifications.dismissed,
          createdAt: userNotifications.createdAt,
        })
        .from(userNotifications)
        .where(eq(userNotifications.userId, admin.userId))
        .orderBy(desc(userNotifications.createdAt))
        .limit(5);

      console.log(`   ${admin.firstName} ${admin.lastName}:`);
      console.log(`      Total notifications: ${adminNotifs.length}`);

      if (adminNotifs.length > 0) {
        const unreadCount = adminNotifs.filter((n) => !n.read).length;
        console.log(`      Unread: ${unreadCount}`);
        console.log(`      Recent notifications:`);

        for (const notif of adminNotifs.slice(0, 3)) {
          // Get the actual notification details
          const notifDetails = await db
            .select()
            .from(notifications)
            .where(eq(notifications.id, notif.notificationId))
            .limit(1);

          if (notifDetails.length > 0) {
            const detail = notifDetails[0];
            const status = notif.read ? "📖" : "🔔";
            console.log(`         ${status} ${detail.type}: ${detail.message.substring(0, 50)}...`);
            console.log(`            Created: ${notif.createdAt}`);
          }
        }
      } else {
        console.log(`      ❌ No notifications assigned to this admin!`);
      }
      console.log();
    }

    // 5. Test notification creation with most recent non-admin user
    console.log("5️⃣ Testing manual notification creation...");
    const testUser = recentUsers.find(
      (u) => !adminRecords.some((a) => a.userId === u.id)
    );

    if (!testUser) {
      console.log("   ⚠️  No non-admin users found to test with\n");
    } else {
      console.log(`   Testing with user: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);

      try {
        console.log("   Calling notifyAdminsOfNewSignup()...");
        const result = await notifyAdminsOfNewSignup({
          userId: testUser.id,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          accountType: testUser.accountType,
        });

        console.log(`   ✅ Notification created successfully!`);
        console.log(`      Notification ID: ${result.notification.id}`);
        console.log(`      Admins notified: ${result.totalCount}`);
        console.log(`      Message: ${result.notification.message}\n`);

        // Verify the notification was created
        const verifyNotif = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, result.notification.id))
          .limit(1);

        if (verifyNotif.length > 0) {
          console.log("   ✅ Notification verified in database");
        }

        // Verify admin assignments
        const verifyAssignments = await db
          .select()
          .from(userNotifications)
          .where(eq(userNotifications.notificationId, result.notification.id));

        console.log(`   ✅ Admin assignments verified: ${verifyAssignments.length} record(s)`);
        verifyAssignments.forEach((assignment) => {
          const admin = adminRecords.find((a) => a.userId === assignment.userId);
          if (admin) {
            console.log(`      - ${admin.firstName} ${admin.lastName}`);
          }
        });
        console.log();

      } catch (error) {
        console.log(`   ❌ Error creating notification: ${error}`);
        if (error instanceof Error) {
          console.log(`      Message: ${error.message}`);
          console.log(`      Stack: ${error.stack}\n`);
        }
      }
    }

    // 6. Summary and recommendations
    console.log("📊 SUMMARY & RECOMMENDATIONS");
    console.log("============================");

    if (adminRecords.length === 0) {
      console.log("❌ CRITICAL: No admins found in the system");
      console.log("   → First user signup should auto-create admin record");
      console.log("   → Check the signup route transaction logic\n");
    } else if (signupNotifications.length === 0) {
      console.log("⚠️  WARNING: Admins exist but no signup notifications found");
      console.log("   → This could be normal if no one has signed up after the first user");
      console.log("   → Or notifyAdminsOfNewSignup() is not being called in signup route\n");
    } else {
      const allAdminsHaveNotifications = adminRecords.every((admin) =>
        signupNotifications.some((notif) =>
          userNotifications
        )
      );

      console.log("✅ System appears to be configured correctly");
      console.log(`   → ${adminRecords.length} admin(s) in system`);
      console.log(`   → ${signupNotifications.length} signup notification(s) created`);
      console.log("   → Notifications are being assigned to admins\n");
    }

    console.log("Next Steps:");
    console.log("1. Ensure dev server is running: npm run dev");
    console.log("2. Run signup test: npm run test:signup-notifications");
    console.log("3. Check server logs for errors during signup");
    console.log("4. Verify notifications appear at: http://localhost:3000/notifications\n");

  } catch (error) {
    console.error("❌ Debug script failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

// Run the debug
debugNotifications()
  .then(() => {
    console.log("✅ Debug completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
