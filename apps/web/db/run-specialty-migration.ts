// db/run-specialty-migration.ts
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./index";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: join(__dirname, "../../../.env") });

async function runSpecialtyMigration() {
  console.log("🔄 Running specialty migration...");

  try {
    // Read the migration file
    const migrationPath = join(__dirname, "migrations/0004_specialty_no_doctors.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split("-- statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 100)}...`);
      await db.execute(sql.raw(statement));
    }

    console.log("✅ Specialty migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSpecialtyMigration();
