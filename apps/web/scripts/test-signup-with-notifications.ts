// scripts/test-signup-with-notifications.ts
import { db } from "@/db/connection";
import { users, admins, notifications, userNotifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

interface TestUser {
  email: string;
  password: string;
  accountType: "Doctor" | "Triage" | "Evac";
  firstName: string;
  lastName: string;
  doctorSpecialty?: string[];
  languages?: string[];
  countries?: string[];
  gender?: "Male" | "Female";
}

const testUsers: TestUser[] = [
  {
    email: "test.doctor@example.com",
    password: "TestPassword123!",
    accountType: "Doctor",
    firstName: "Dr. Jane",
    lastName: "Smith",
    doctorSpecialty: ["Cardiology", "Internal Medicine"],
    languages: ["English", "Spanish"],
    countries: ["United States"],
    gender: "Female",
  },
  {
    email: "test.triage@example.com",
    password: "TestPassword123!",
    accountType: "Triage",
    firstName: "John",
    lastName: "Triage",
    languages: ["English"],
    countries: ["United States"],
    gender: "Male",
  },
  {
    email: "test.evac@example.com",
    password: "TestPassword123!",
    accountType: "Evac",
    firstName: "Bob",
    lastName: "Evacuator",
    languages: ["English", "French"],
    countries: ["Canada"],
    gender: "Male",
  },
];

async function checkAdmins() {
  console.log("\n🔍 Checking for admins in the system...");
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
    console.log("❌ No admins found! First user signup will become admin.");
    return [];
  }

  console.log(`✅ Found ${adminRecords.length} admin(s):`);
  adminRecords.forEach((admin) => {
    console.log(`   - ${admin.firstName} ${admin.lastName} (${admin.email})`);
  });

  return adminRecords;
}

async function checkNotificationsBefore() {
  console.log("\n📊 Checking notifications before signup...");
  const notificationsBefore = await db
    .select()
    .from(notifications)
    .where(eq(notifications.type, "new_user_signup"))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  console.log(`   Found ${notificationsBefore.length} existing signup notifications`);
  return notificationsBefore.length;
}

async function signupUser(testUser: TestUser): Promise<string | null> {
  console.log(`\n🚀 Attempting to sign up: ${testUser.email}`);

  try {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        accountType: testUser.accountType,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        doctorSpecialty: testUser.doctorSpecialty,
        languages: testUser.languages,
        countries: testUser.countries,
        gender: testUser.gender,
        securityQuestions: [
          { question: "What is your favorite color?", answer: "Blue" },
          { question: "What is your pet's name?", answer: "Fluffy" },
          { question: "What city were you born in?", answer: "New York" },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`   ❌ Signup failed: ${data.message}`);
      return null;
    }

    console.log(`   ✅ Signup successful!`);
    console.log(`      User ID: ${data.userId}`);
    console.log(`      Is First User: ${data.isFirstUser}`);
    console.log(`      Authorized: ${data.authorized}`);

    return data.userId;
  } catch (error) {
    console.log(`   ❌ Error during signup: ${error}`);
    return null;
  }
}

async function checkNotificationsAfter(
  beforeCount: number,
  newUserId: string,
  adminRecords: any[],
) {
  console.log("\n📬 Checking notifications after signup...");

  // Wait a bit for async notification creation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const notificationsAfter = await db
    .select()
    .from(notifications)
    .where(eq(notifications.type, "new_user_signup"))
    .orderBy(desc(notifications.createdAt));

  const newNotificationCount = notificationsAfter.length - beforeCount;

  if (newNotificationCount > 0) {
    console.log(`   ✅ Created ${newNotificationCount} new notification(s)`);

    // Get the most recent notification
    const latestNotification = notificationsAfter[0];
    console.log(`\n   📝 Latest Notification Details:`);
    console.log(`      ID: ${latestNotification.id}`);
    console.log(`      Message: ${latestNotification.message}`);
    console.log(`      Type: ${latestNotification.type}`);
    console.log(`      Source ID: ${latestNotification.sourceId}`);
    console.log(`      Redirect To: ${latestNotification.redirectTo}`);
    console.log(`      Created At: ${latestNotification.createdAt}`);

    // Check if admins received the notification
    console.log(`\n   👥 Checking admin notification assignments...`);
    for (const admin of adminRecords) {
      const adminNotif = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, admin.userId))
        .orderBy(desc(userNotifications.createdAt))
        .limit(1);

      if (adminNotif.length > 0) {
        const isLatest = adminNotif[0].notificationId === latestNotification.id;
        console.log(
          `      ${admin.firstName} ${admin.lastName}: ${isLatest ? "✅ Received" : "⚠️ Has notifications but not the latest one"}`,
        );

        if (isLatest) {
          console.log(
            `         - Read: ${adminNotif[0].read ? "Yes" : "No"}`,
          );
          console.log(
            `         - Dismissed: ${adminNotif[0].dismissed ? "Yes" : "No"}`,
          );
        }
      } else {
        console.log(
          `      ${admin.firstName} ${admin.lastName}: ❌ No notifications found`,
        );
      }
    }
  } else {
    console.log(`   ❌ No new notifications created!`);
    console.log(`\n   🔍 Troubleshooting:`);
    console.log(`      1. Check if notifyAdminsOfNewSignup() was called`);
    console.log(`      2. Check server logs for errors`);
    console.log(`      3. Verify admins exist in the database`);
    console.log(`      4. Check if this was the first user (no notification for first user)`);
  }

  return newNotificationCount;
}

async function cleanupTestUsers() {
  console.log("\n🧹 Cleaning up test users...");

  for (const testUser of testUsers) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, testUser.email),
      });

      if (user) {
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`   ✅ Deleted: ${testUser.email}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Failed to delete ${testUser.email}: ${error}`);
    }
  }
}

async function runTest() {
  console.log("🧪 TESTING USER SIGNUP WITH NOTIFICATIONS");
  console.log("==========================================\n");

  try {
    // Step 1: Check for existing admins
    const adminRecords = await checkAdmins();

    if (adminRecords.length === 0) {
      console.log("\n⚠️  WARNING: No admins found!");
      console.log("   The first test user will become an admin and won't trigger notifications.");
      console.log("   Subsequent signups will trigger notifications.\n");
    }

    // Step 2: Clean up any existing test users first
    await cleanupTestUsers();

    // Step 3: Get notification count before
    const notificationsBefore = await checkNotificationsBefore();

    // Step 4: Sign up test users
    let successCount = 0;
    let notificationCount = 0;

    for (const testUser of testUsers) {
      const userId = await signupUser(testUser);

      if (userId) {
        successCount++;

        // Check notifications after each signup
        const newNotifications = await checkNotificationsAfter(
          notificationsBefore + notificationCount,
          userId,
          adminRecords,
        );

        notificationCount += newNotifications;

        // Wait a bit between signups
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final Summary
    console.log("\n\n📊 FINAL SUMMARY");
    console.log("=================");
    console.log(`   Test Users Attempted: ${testUsers.length}`);
    console.log(`   Successful Signups: ${successCount}`);
    console.log(`   Notifications Created: ${notificationCount}`);
    console.log(`   Admins in System: ${adminRecords.length}`);

    if (successCount > 0 && notificationCount === 0 && adminRecords.length > 0) {
      console.log("\n❌ ISSUE DETECTED: Signups succeeded but no notifications created!");
      console.log("\n🔍 Possible Causes:");
      console.log("   1. notifyAdminsOfNewSignup() is not being called");
      console.log("   2. Function is throwing an error (check server logs)");
      console.log("   3. Transaction is failing silently");
      console.log("   4. Admin table is not being queried correctly");
    } else if (successCount > 0 && notificationCount > 0) {
      console.log("\n✅ SUCCESS: Notifications are working correctly!");
      console.log(`\n   Admins can view notifications at: http://localhost:3000/notifications`);
    }

    // Step 5: Optional - Clean up test users
    console.log("\n❓ Clean up test users? (They will remain in the database)");
    console.log(
      "   To clean up manually, run: await cleanupTestUsers() in the script\n",
    );
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

// Run the test
console.log("⏳ Starting in 2 seconds... Make sure your dev server is running!");
console.log("   Server should be at: http://localhost:3000\n");

setTimeout(() => {
  runTest()
    .then(() => {
      console.log("\n✅ Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test failed:", error);
      process.exit(1);
    });
}, 2000);
