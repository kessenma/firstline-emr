// scripts/test-login.ts
import { db } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function testLogin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log("\n❌ Please provide email and password");
    console.log("Usage: pnpm test:login <email> <password>\n");
    process.exit(1);
  }

  console.log(`\n🔐 Testing login credentials...\n`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${"*".repeat(password.length)}\n`);

  try {
    // Find user by email (case-insensitive)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: {
        admin: true,
        settings: true,
      },
    });

    if (!user) {
      console.log("❌ Login Failed: User not found");
      console.log(`   Email: ${email} does not exist in database\n`);
      process.exit(1);
    }

    console.log("✅ User found!");
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Account Type: ${user.accountType}\n`);

    // Check if authorized
    if (!user.authorized) {
      console.log("❌ Login Failed: Account not authorized");
      console.log("   Your account has not been approved yet.\n");
      process.exit(1);
    }

    console.log("✅ Account is authorized");

    // Check if password exists
    if (!user.password) {
      console.log("❌ Login Failed: No password set");
      console.log("   This account may use Google sign-in only.\n");
      process.exit(1);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ Login Failed: Invalid password");
      console.log("   The password you entered is incorrect.\n");
      process.exit(1);
    }

    console.log("✅ Password is correct");

    // Check admin status
    const isAdmin = !!user.admin;
    if (isAdmin) {
      console.log("👑 User is an admin");
      console.log(`   Admin since: ${user.admin.adminStartDate?.toLocaleString()}`);
    } else {
      console.log("👤 User is not an admin");
    }

    // Identity and professional fields live on `users`
    if (user.doctorSpecialty && user.doctorSpecialty.length > 0) {
      console.log(`🩺 Specialties: ${user.doctorSpecialty.join(", ")}`);
    }
    if (user.languages && user.languages.length > 0) {
      console.log(`🗣️  Languages: ${user.languages.join(", ")}`);
    }
    if (user.countries && user.countries.length > 0) {
      console.log(`🌍 Countries: ${user.countries.join(", ")}`);
    }

    // user_settings is preferences-only
    if (user.settings) {
      console.log("\n⚙️  User Settings (preferences):");
      console.log(`   Last view: ${user.settings.lastView ?? "/"}`);
    }

    console.log("\n✅ LOGIN TEST PASSED!");
    console.log("   All checks completed successfully.");
    console.log("   This user can log in to the application.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error testing login:", error);
    process.exit(1);
  }
}

testLogin();
