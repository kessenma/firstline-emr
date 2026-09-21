// scripts/test-email-check.ts
import { db } from "../db/connection";
import { users } from "../db/schema";

async function testEmailCheck() {
  console.log("\n🧪 Testing Email Check Endpoint\n");

  try {
    // Get base URL (assuming localhost:3000 for dev)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Test 1: Check email that doesn't exist
    console.log("📧 Test 1: Checking non-existent email...");
    const testEmail1 = "test-new-user@example.com";
    const response1 = await fetch(
      `${baseUrl}/api/auth/signup/email-check?email=${encodeURIComponent(testEmail1)}`
    );
    const data1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response:`, data1);
    console.log(`   Expected: 200, exists: false`);
    console.log(
      `   Result: ${response1.status === 200 && data1.exists === false ? "✅ PASS" : "❌ FAIL"}\n`
    );

    // Test 2: Check if any existing users
    const allUsers = await db.query.users.findMany({
      columns: {
        email: true,
      },
      limit: 1,
    });

    if (allUsers.length > 0) {
      console.log("📧 Test 2: Checking existing email...");
      const existingEmail = allUsers[0].email;
      const response2 = await fetch(
        `${baseUrl}/api/auth/signup/email-check?email=${encodeURIComponent(existingEmail)}`
      );
      const data2 = await response2.json();
      console.log(`   Email: ${existingEmail}`);
      console.log(`   Status: ${response2.status}`);
      console.log(`   Response:`, data2);
      console.log(`   Expected: 409, exists: true`);
      console.log(
        `   Result: ${response2.status === 409 && data2.exists === true ? "✅ PASS" : "❌ FAIL"}\n`
      );
    } else {
      console.log("📧 Test 2: Skipped (no existing users)\n");
    }

    // Test 3: Invalid email format
    console.log("📧 Test 3: Checking invalid email format...");
    const testEmail3 = "invalid-email";
    const response3 = await fetch(
      `${baseUrl}/api/auth/signup/email-check?email=${encodeURIComponent(testEmail3)}`
    );
    const data3 = await response3.json();
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response:`, data3);
    console.log(`   Expected: 400`);
    console.log(`   Result: ${response3.status === 400 ? "✅ PASS" : "❌ FAIL"}\n`);

    // Test 4: Missing email parameter
    console.log("📧 Test 4: Missing email parameter...");
    const response4 = await fetch(`${baseUrl}/api/auth/signup/email-check`);
    const data4 = await response4.json();
    console.log(`   Status: ${response4.status}`);
    console.log(`   Response:`, data4);
    console.log(`   Expected: 400`);
    console.log(`   Result: ${response4.status === 400 ? "✅ PASS" : "❌ FAIL"}\n`);

    console.log("✅ Email check endpoint tests completed!\n");

    console.log("💡 Note: These tests assume the Next.js server is running.");
    console.log("   If tests fail, make sure to run 'pnpm dev' first.\n");

    process.exit(0);
  } catch (error: any) {
    if (error.cause?.code === "ECONNREFUSED") {
      console.error("\n❌ Error: Cannot connect to server");
      console.error("   Make sure the Next.js server is running:");
      console.error("   Run: pnpm dev\n");
    } else {
      console.error("\n❌ Error testing email check:", error.message);
    }
    process.exit(1);
  }
}

testEmailCheck();
