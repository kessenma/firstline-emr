// db/migrate.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from monorepo root
// When running from apps/web, go up two directories to reach the root
const rootDir = resolve(process.cwd(), "../..");
config({ path: resolve(rootDir, ".env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

async function runMigrations() {
  console.log("🔄 Starting database migration...");

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
