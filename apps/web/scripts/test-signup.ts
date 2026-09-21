// scripts/test-signup.ts
import { db } from "../db/connection";
import { users, admins, securityQuestions, userSettings } from "../db/schema";
import { count } from "drizzle-orm";

async function testSignupFlow() {
  console.log("\n🧪 Testing Signup Flow\n");

  try {
    // 1. Check current user count
    const [{ count: userCount }] = await db.select({ count: count() }).from(users);
    console.log(`📊 Current user count: ${userCount}`);

    // 2. Check current admin count
    const [{ count: adminCount }] = await db.select({ count: count() }).from(admins);
    console.log(`👑 Current admin count: ${adminCount}`);

    // 3. Check if first user logic would work
    const isFirstUser = userCount === 0;
    console.log(`\n🔍 First user check: ${isFirstUser ? "✅ YES" : "❌ NO"}`);

    if (isFirstUser) {
      console.log("   → First user will be automatically granted admin privileges");
    } else {
      console.log("   → New users will require manual authorization");
    }

    // 4. List all users
    if (userCount > 0) {
      console.log("\n👥 Existing users:");
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          accountType: true,
          authorized: true,
          createdAt: true,
        },
        with: {
          admin: {
            columns: {
              id: true,
              adminStartDate: true,
            },
          },
        },
      });

      allUsers.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Type: ${user.accountType}`);
        console.log(`      Authorized: ${user.authorized ? "✅ Yes" : "❌ No"}`);
        console.log(`      Is Admin: ${user.admin ? "👑 Yes" : "No"}`);
        console.log(`      Created: ${user.createdAt?.toLocaleString()}`);
      });
    }

    // 5. Check database schema
    console.log("\n\n📋 Database Tables:");
    const tables = ["users", "admins", "security_questions", "user_settings"];
    for (const table of tables) {
      let tableCount = 0;
      switch (table) {
        case "users":
          [{ count: tableCount }] = await db.select({ count: count() }).from(users);
          break;
        case "admins":
          [{ count: tableCount }] = await db.select({ count: count() }).from(admins);
          break;
        case "security_questions":
          [{ count: tableCount }] = await db.select({ count: count() }).from(securityQuestions);
          break;
        case "user_settings":
          [{ count: tableCount }] = await db.select({ count: count() }).from(userSettings);
          break;
      }
      console.log(`   ${table.padEnd(25)} ${tableCount} records`);
    }

    console.log("\n\n✅ Test completed successfully!\n");

    // Recommendations
    if (userCount === 0) {
      console.log("💡 Next steps:");
      console.log("   1. Start your Next.js app: pnpm devWeb");
      console.log("   2. Navigate to the signup page");
      console.log("   3. Create your first user account");
      console.log("   4. The first user will automatically become an admin\n");
    } else {
      console.log("💡 System status:");
      console.log(`   • You have ${userCount} user(s) in the system`);
      console.log(`   • You have ${adminCount} admin(s)`);
      console.log("   • New signups will require admin authorization\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error testing signup flow:", error);
    process.exit(1);
  }
}

testSignupFlow();
