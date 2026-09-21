// scripts/verify-telegram-schema.ts
/**
 * Verification script to ensure all Telegram-related tables and columns exist
 * Run this before starting the migration to verify schema is ready
 *
 * Usage: npx tsx scripts/verify-telegram-schema.ts
 */

import { db, pool } from "../db/connection";
import { sql } from "drizzle-orm";

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function checkTableExists(
  tableName: string,
): Promise<VerificationResult> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `);

    const exists = result.rows[0]?.exists as boolean;

    return {
      passed: !!exists,
      message: exists
        ? `✅ Table '${tableName}' exists`
        : `❌ Table '${tableName}' is missing`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ Error checking table '${tableName}'`,
      details: error,
    };
  }
}

async function checkColumnExists(
  tableName: string,
  columnName: string,
  expectedType?: string,
): Promise<VerificationResult> {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName};
    `);

    if (result.rows.length === 0) {
      return {
        passed: false,
        message: `❌ Column '${tableName}.${columnName}' is missing`,
      };
    }

    const column = result.rows[0];
    const typeMatch = !expectedType || column.data_type === expectedType;

    if (!typeMatch) {
      return {
        passed: false,
        message: `⚠️  Column '${tableName}.${columnName}' exists but type is '${column.data_type}' (expected '${expectedType}')`,
        details: column,
      };
    }

    return {
      passed: true,
      message: `✅ Column '${tableName}.${columnName}' exists (${column.data_type})`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ Error checking column '${tableName}.${columnName}'`,
      details: error,
    };
  }
}

async function checkIndexExists(
  indexName: string,
): Promise<VerificationResult> {
  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = ${indexName};
    `);

    const exists = result.rows.length > 0;

    return {
      passed: exists,
      message: exists
        ? `✅ Index '${indexName}' exists`
        : `⚠️  Index '${indexName}' is missing (may affect performance)`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ Error checking index '${indexName}'`,
      details: error,
    };
  }
}

async function checkForeignKey(
  constraintName: string,
): Promise<VerificationResult> {
  try {
    const result = await db.execute(sql`
      SELECT constraint_name, delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_schema = 'public'
      AND constraint_name = ${constraintName};
    `);

    const exists = result.rows.length > 0;

    if (!exists) {
      return {
        passed: false,
        message: `❌ Foreign key '${constraintName}' is missing`,
      };
    }

    const fk = result.rows[0];
    return {
      passed: true,
      message: `✅ Foreign key '${constraintName}' exists (ON DELETE ${fk.delete_rule})`,
      details: fk,
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ Error checking foreign key '${constraintName}'`,
      details: error,
    };
  }
}

async function runVerification() {
  console.log("\n🔍 Telegram Schema Verification\n");
  console.log("=".repeat(70));

  const results: VerificationResult[] = [];

  // ===== CHECK TABLES =====
  console.log("\n📋 Checking Tables...\n");

  const tables = [
    "telegram_threads",
    "telegram_thread_participants",
    "patient_follow_ups",
    "telegram_intake_tokens",
  ];

  for (const table of tables) {
    const result = await checkTableExists(table);
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK telegram_threads COLUMNS =====
  console.log("\n📊 Checking telegram_threads columns...\n");

  const threadColumns = [
    { name: "id", type: "uuid" },
    { name: "chat_id", type: "character varying" },
    { name: "patient_id", type: "uuid" },
    { name: "participants", type: "ARRAY" },
    { name: "unread_count", type: "integer" },
    { name: "status", type: "USER-DEFINED" }, // enum
    { name: "messages", type: "jsonb" },
    { name: "created_at", type: "timestamp without time zone" },
    { name: "updated_at", type: "timestamp without time zone" },
  ];

  for (const col of threadColumns) {
    const result = await checkColumnExists("telegram_threads", col.name);
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK telegram_thread_participants COLUMNS =====
  console.log("\n👥 Checking telegram_thread_participants columns...\n");

  const participantColumns = [
    { name: "id", type: "uuid" },
    { name: "thread_id", type: "uuid" },
    { name: "user_id", type: "uuid" },
    { name: "joined_at", type: "timestamp without time zone" },
  ];

  for (const col of participantColumns) {
    const result = await checkColumnExists(
      "telegram_thread_participants",
      col.name,
    );
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK patient_follow_ups COLUMNS =====
  console.log("\n📅 Checking patient_follow_ups columns...\n");

  const followUpColumns = [
    { name: "id", type: "uuid" },
    { name: "chat_id", type: "character varying" },
    { name: "telegram_thread_id", type: "uuid" },
    { name: "message", type: "text" },
    { name: "follow_up_sent_at", type: "timestamp without time zone" },
    { name: "created_at", type: "timestamp without time zone" },
    { name: "updated_at", type: "timestamp without time zone" },
  ];

  for (const col of followUpColumns) {
    const result = await checkColumnExists("patient_follow_ups", col.name);
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK telegram_intake_tokens COLUMNS =====
  console.log("\n🎫 Checking telegram_intake_tokens columns...\n");

  const tokenColumns = [
    { name: "id", type: "uuid" },
    { name: "token", type: "character varying" },
    { name: "patient_id", type: "uuid" },
    { name: "telegram_chat_id", type: "character varying" },
    { name: "created_at", type: "timestamp without time zone" },
    { name: "expires_at", type: "timestamp without time zone" },
    { name: "is_valid", type: "boolean" },
    { name: "submitted", type: "boolean" },
    { name: "submitted_at", type: "timestamp without time zone" },
  ];

  for (const col of tokenColumns) {
    const result = await checkColumnExists("telegram_intake_tokens", col.name);
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK INDEXES =====
  console.log("\n🔍 Checking Indexes...\n");

  const indexes = [
    "telegram_threads_chat_id_idx",
    "telegram_threads_patient_id_idx",
    "telegram_threads_status_idx",
    "telegram_thread_participants_thread_id_idx",
    "telegram_thread_participants_user_id_idx",
    "patient_follow_ups_chat_id_idx",
    "patient_follow_ups_telegram_thread_id_idx",
    "telegram_intake_tokens_token_idx",
    "telegram_intake_tokens_patient_id_idx",
    "telegram_intake_tokens_is_valid_idx",
  ];

  for (const index of indexes) {
    const result = await checkIndexExists(index);
    results.push(result);
    console.log(result.message);
  }

  // ===== CHECK FOREIGN KEYS =====
  console.log("\n🔗 Checking Foreign Keys...\n");

  const foreignKeys = [
    "telegram_threads_patient_id_patients_id_fk",
    "telegram_thread_participants_thread_id_telegram_threads_id_fk",
    "telegram_thread_participants_user_id_users_id_fk",
    "patient_follow_ups_telegram_thread_id_telegram_threads_id_fk",
    "telegram_intake_tokens_patient_id_patients_id_fk",
  ];

  for (const fk of foreignKeys) {
    const result = await checkForeignKey(fk);
    results.push(result);
    console.log(result.message);
  }

  // ===== SUMMARY =====
  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Verification Summary\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total checks: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  const percentage = Math.round((passed / total) * 100);
  console.log(`\nSuccess rate: ${percentage}%`);

  if (failed === 0) {
    console.log("\n🎉 All checks passed! Schema is ready for migration.\n");
  } else {
    console.log(
      "\n⚠️  Some checks failed. Please review and fix before migrating.\n",
    );
    console.log("💡 Tips:");
    console.log("   1. Run: npx drizzle-kit push:pg");
    console.log("   2. Or run migrations: npx drizzle-kit migrate");
    console.log("   3. Check your .env DATABASE_URL is correct\n");
  }

  console.log("=".repeat(70) + "\n");

  return failed === 0;
}

// Main execution
(async () => {
  try {
    const success = await runVerification();
    await pool.end();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Verification failed with error:");
    console.error(error);
    await pool.end();
    process.exit(1);
  }
})();
