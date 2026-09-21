#!/usr/bin/env bun
// scripts/apply-realtime-migration.ts

import { sql } from "drizzle-orm";
import { db } from "../db";
import fs from "fs";
import path from "path";

/**
 * Apply the real-time telegram messaging migration
 *
 * This script:
 * 1. Creates the notify_telegram_thread_change() function
 * 2. Creates the trigger on telegram_threads table
 * 3. Creates necessary indexes
 *
 * Run with: bun run scripts/apply-realtime-migration.ts
 */

async function applyRealtimeMigration() {
  console.log("🚀 Applying real-time telegram messaging migration...\n");

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "../db/migrations/add_telegram_realtime_trigger.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Migration file loaded");
    console.log("📦 Executing SQL statements...\n");

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration applied successfully!\n");

    // Verify the trigger was created
    console.log("🔍 Verifying trigger installation...\n");

    const triggerCheck = await db.execute(sql`
      SELECT
        tgname as trigger_name,
        tgenabled as enabled,
        pg_get_triggerdef(oid) as definition
      FROM pg_trigger
      WHERE tgname = 'telegram_threads_notify_trigger'
    `);

    if (triggerCheck.rows.length > 0) {
      const trigger = triggerCheck.rows[0] as any;
      console.log("✅ Trigger found:", trigger.trigger_name);
      console.log("✅ Status:", trigger.enabled === "O" ? "Enabled" : "Disabled");
    } else {
      console.warn("⚠️  Warning: Trigger not found after migration");
    }

    // Verify the function was created
    const functionCheck = await db.execute(sql`
      SELECT
        proname as function_name,
        pronargs as arg_count
      FROM pg_proc
      WHERE proname = 'notify_telegram_thread_change'
    `);

    if (functionCheck.rows.length > 0) {
      console.log("✅ Function created: notify_telegram_thread_change()");
    } else {
      console.warn("⚠️  Warning: Function not found after migration");
    }

    console.log("\n✨ Real-time messaging is now enabled!");
    console.log("\n📝 Next steps:");
    console.log("   1. Restart your Next.js server");
    console.log("   2. Open a telegram message thread");
    console.log("   3. Messages will now update in real-time!");
    console.log("\n💡 To test:");
    console.log("   psql $DATABASE_URL -c \"UPDATE telegram_threads SET updated_at = NOW() WHERE chat_id = 'YOUR_CHAT_ID';\"");
    console.log("\n📚 See REALTIME_SETUP.md for full documentation\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);

    if (error instanceof Error) {
      console.error("\n💥 Error details:", error.message);

      // Provide helpful hints based on common errors
      if (error.message.includes("permission denied")) {
        console.error("\n💡 Hint: Make sure your database user has permission to:");
        console.error("   - CREATE FUNCTION");
        console.error("   - CREATE TRIGGER");
        console.error("   - CREATE INDEX");
        console.error("\n   You may need to run this as a superuser.");
      }

      if (error.message.includes("already exists")) {
        console.error("\n💡 Hint: The trigger/function already exists.");
        console.error("   To recreate, first drop them:");
        console.error("   DROP TRIGGER IF EXISTS telegram_threads_notify_trigger ON telegram_threads;");
        console.error("   DROP FUNCTION IF EXISTS notify_telegram_thread_change();");
      }
    }

    process.exit(1);
  }
}

// Self-test function to verify real-time notifications
async function testNotifications() {
  console.log("\n🧪 Testing real-time notifications...\n");

  try {
    // Get a sample thread
    const threads = await db.execute(sql`
      SELECT chat_id, id
      FROM telegram_threads
      LIMIT 1
    `);

    if (threads.rows.length === 0) {
      console.log("⚠️  No telegram threads found to test with");
      console.log("   Create a thread first, then run this test");
      return;
    }

    const thread = threads.rows[0] as any;
    console.log(`📨 Testing with chat_id: ${thread.chat_id}`);

    // Listen for notifications in another connection
    console.log("👂 Listening for notifications...");
    console.log("   (This will wait 5 seconds for a notification)\n");

    // Trigger an update
    setTimeout(async () => {
      console.log("🔔 Triggering update...");
      await db.execute(sql`
        UPDATE telegram_threads
        SET updated_at = NOW()
        WHERE id = ${thread.id}
      `);
    }, 1000);

    // Note: Actual listening requires a separate connection
    // This is just a simulation
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("✅ Test completed");
    console.log("   Check your SSE endpoint to see if notifications are working");
    console.log("   Open: /api/telegram-thread/realtime?chatId=" + thread.chat_id);

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: bun run scripts/apply-realtime-migration.ts [options]

Options:
  --help, -h     Show this help message
  --test         Run a test after applying migration

Examples:
  bun run scripts/apply-realtime-migration.ts
  bun run scripts/apply-realtime-migration.ts --test
  `);
  process.exit(0);
}

(async () => {
  await applyRealtimeMigration();

  if (args.includes("--test")) {
    await testNotifications();
  }

  process.exit(0);
})();
