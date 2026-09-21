// scripts/test-notifications-api.ts
import { db } from "@/db/connection";
import { users, admins } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function testNotificationsAPI() {
  console.log("🧪 Testing Notifications API");
  console.log("============================\n");

  try {
    // 1. Get the admin user
    console.log("1️⃣ Finding admin user...");
    const adminRecords = await db
      .select({
        userId: admins.userId,
        email: admins.email,
        firstName: admins.firstName,
        lastName: admins.lastName,
      })
      .from(admins)
      .limit(1);

    if (adminRecords.length === 0) {
      console.log("❌ No admin found!");
      return;
    }

    const admin = adminRecords[0];
    console.log(`✅ Found admin: ${admin.firstName} ${admin.lastName}`);
    console.log(`   User ID: ${admin.userId}`);
    console.log(`   Email: ${admin.email}\n`);

    // 2. Test the API endpoint
    console.log("2️⃣ Testing GET /api/notifications/[userId]...");
    const apiUrl = `http://localhost:3000/api/notifications/${admin.userId}`;
    console.log(`   URL: ${apiUrl}\n`);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        `   Response Status: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Error Response: ${errorText}\n`);
        return;
      }

      const data = await response.json();
      console.log(`   ✅ Response received successfully\n`);

      // 3. Display the notifications
      console.log("3️⃣ Notifications returned by API:");
      if (!data.notifications || data.notifications.length === 0) {
        console.log("   ❌ No notifications found in API response");
        console.log("   This could mean:");
        console.log("      - API is not querying correctly");
        console.log("      - Frontend is not making the right request");
        console.log("      - Session/authentication issue\n");
      } else {
        console.log(
          `   ✅ Found ${data.notifications.length} notification(s):\n`,
        );
        data.notifications.forEach((notif: any, index: number) => {
          console.log(`   ${index + 1}. ${notif.message}`);
          console.log(`      ID: ${notif._id || notif.id}`);
          console.log(`      Type: ${notif.type}`);
          console.log(`      Read: ${notif.read ? "Yes" : "No"}`);
          console.log(`      Created: ${notif.createdAt}`);
          console.log();
        });
      }

      // 4. Compare with database
      console.log("4️⃣ Comparing with database records...");
      // Verify against direct DB query
      const dbResult = await db.execute(
        sql`
          SELECT
            un.id,
            un.read,
            un.created_at as user_notif_created,
            n.id as notif_id,
            n.message,
            n.type,
            n.created_at as notif_created
          FROM user_notifications un
          JOIN notifications n ON n.id = un.notification_id
          WHERE un.user_id = ${admin.userId}
          ORDER BY n.created_at DESC
          LIMIT 20
        `,
      );

      const dbNotifications = dbResult.rows;
      console.log(`   Database has ${dbNotifications.length} notification(s)`);

      if (
        data.notifications &&
        dbNotifications.length !== data.notifications.length
      ) {
        console.log(
          `   ⚠️  MISMATCH: API returned ${data.notifications.length}, DB has ${dbNotifications.length}`,
        );
      } else if (data.notifications && data.notifications.length > 0) {
        console.log(`   ✅ Count matches!`);
      }
      console.log();

      // 5. Summary
      console.log("📊 SUMMARY:");
      console.log(`   Admin User ID: ${admin.userId}`);
      console.log(`   Database Notifications: ${dbNotifications.length}`);
      console.log(
        `   API Response Notifications: ${data.notifications ? data.notifications.length : 0}`,
      );
      console.log();

      if (!data.notifications || data.notifications.length === 0) {
        console.log("❌ ISSUE: API is not returning notifications");
        console.log("\n🔍 Troubleshooting steps:");
        console.log("   1. Check if dev server is running: npm run dev");
        console.log(
          "   2. Verify the API route at: apps/web/app/api/notifications/[id]/route.ts",
        );
        console.log(
          "   3. Check getUserNotifications() function in: apps/web/utils/notifications.ts",
        );
        console.log("   4. Look for errors in server logs");
        console.log("   5. Test with authentication headers if needed");
      } else {
        console.log("✅ API is working correctly!");
        console.log("\n💡 If notifications still don't show in the UI:");
        console.log("   1. Check browser console for errors");
        console.log(
          "   2. Verify useSession() is returning the correct user ID",
        );
        console.log(
          "   3. Check NotificationsViewModel.ts for API call issues",
        );
        console.log("   4. Ensure QueryClient is properly configured");
      }
    } catch (fetchError) {
      console.log(`   ❌ Failed to fetch from API: ${fetchError}`);
      console.log(
        `   Make sure dev server is running on http://localhost:3000\n`,
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

// Run the test
console.log("⏳ Starting test...");
console.log(
  "   Make sure your dev server is running at http://localhost:3000\n",
);

setTimeout(() => {
  testNotificationsAPI()
    .then(() => {
      console.log("\n✅ Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test failed:", error);
      process.exit(1);
    });
}, 1000);
