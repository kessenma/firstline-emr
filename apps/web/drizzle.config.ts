// drizzle.config.ts
import type { Config } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from monorepo root
// When running from apps/web, go up two directories to reach the root
const rootDir = resolve(process.cwd(), "../..");
config({ path: resolve(rootDir, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

export default {
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
