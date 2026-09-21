
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

const rootDir = resolve(process.cwd(), "../..");
config({ path: resolve(rootDir, ".env") });

const connectionString = process.env.DATABASE_URL;

async function runManualMigration() {
  if (!connectionString) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }
  const pool = new Pool({ connectionString });

  try {
    console.log("Running manual migration to remove Google columns...");
    await pool.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"');
    console.log("Dropped google_id");
    await pool.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "google_email"');
    console.log("Dropped google_email");
    await pool.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "google_image"');
    console.log("Dropped google_image");
    console.log("Manual migration completed.");
  } catch (error) {
    console.error("Error running migration:", error);
  } finally {
    await pool.end();
  }
}

runManualMigration();
