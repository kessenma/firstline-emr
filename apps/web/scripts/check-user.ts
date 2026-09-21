// scripts/check-user.ts
import { db } from "../db/connection";
import { users, admins } from "../db/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  const email = process.argv[2];

  if (!email) {
    console.log("\n❌ Please provide an email address");
    console.log("Usage: pnpm check:user <email>\n");
    process.exit(1);
  }

  console.log(`\n🔍 Checking for user: ${email}\n`);

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: {
        admin: true,
        settings: true,
        securityQuestions: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      console.log(`   Email: ${email}`);
      console.log("\n💡 This email is available for signup\n");
      process.exit(0);
    }

    console.log("✅ User found!\n");
    console.log("📋 User Details:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Account Type: ${user.accountType}`);
    console.log(`   Authorized: ${user.authorized ? "✅ Yes" : "❌ No"}`);
    console.log(`   Is Admin: ${user.admin ? "👑 Yes" : "No"}`);
    console.log(`   Created: ${user.createdAt?.toLocaleString()}`);

    if (user.doctorSpecialty && user.doctorSpecialty.length > 0) {
      console.log(`   Specialties: ${user.doctorSpecialty.join(", ")}`);
    }

    if (user.languages && user.languages.length > 0) {
      console.log(`   Languages: ${user.languages.join(", ")}`);
    }

    if (user.countries && user.countries.length > 0) {
      console.log(`   Countries: ${user.countries.join(", ")}`);
    }

    if (user.admin) {
      console.log("\n👑 Admin Details:");
      console.log(`   Admin Since: ${user.admin.adminStartDate?.toLocaleString()}`);
    }

    if (user.securityQuestions && user.securityQuestions.length > 0) {
      console.log(`\n🔒 Security Questions: ${user.securityQuestions.length} configured`);
    }

    console.log("\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error checking user:", error);
    process.exit(1);
  }
}

checkUser();
