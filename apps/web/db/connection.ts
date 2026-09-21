// db/connection.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from monorepo root
// When running from apps/web, go up two directories to reach the root
const rootDir = resolve(process.cwd(), "../..");
config({ path: resolve(rootDir, ".env"), debug: false, quiet: true });

// Lazy-initialized connection pool and Drizzle instance.
// This avoids crashing at module-evaluation time during Next.js builds
// where DATABASE_URL is intentionally not provided (it's a runtime secret).
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During Next.js build, runtime secrets aren't available.
    // Return a dummy URL — pg.Pool won't actually connect until a query is made.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return 'postgresql://build:build@localhost:5432/build';
    }
    throw new Error(
      "DATABASE_URL is not defined in environment variables. " +
      "Make sure you have DATABASE_URL set in the root .env file"
    );
  }
  return connectionString;
}

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: getConnectionString(),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _pool;
}

// Backward-compatible exports — accessed at runtime, not build time
export const pool: Pool = new Proxy({} as Pool, {
  get(_, prop) { return (getPool() as any)[prop]; },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!_db) {
      _db = drizzle(getPool(), { schema });
    }
    return (_db as any)[prop];
  },
});

// Helper function to test connection
export async function testConnection() {
  console.log("\n🔌 Testing PostgreSQL connection...\n");

  try {
    console.log("⏳ Attempting to connect...");
    const client = await pool.connect();

    const result = await client.query(
      "SELECT NOW() as now, version(), current_database()",
    );

    client.release();

    console.log("✅ PostgreSQL connection successful:", result.rows[0]);
    console.log("\n📊 Server Info:");
    console.log(`   Current Time: ${result.rows[0].now}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   Version: ${result.rows[0].version.split(",")[0]}`);
    console.log("\n🎉 Connection test passed!\n");

    return true;
  } catch (error: any) {
    console.error("\n❌ PostgreSQL connection failed!\n");
    console.error("Error details:");
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);

    console.log("\n💡 Troubleshooting:");
    if (error.message.includes("timeout")) {
      console.log(
        "   • Connection timeout – check firewall, host, port, DB running.",
      );
    } else if (error.message.includes("password")) {
      console.log("   • Authentication failed – check username/password.");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("   • Host not found – check hostname/IP address.");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("   • Connection refused – DB may not be running.");
    }

    console.log("\n🔧 Next steps:");
    console.log("   1. Check if port is reachable: nc -zv <host> <port>");
    console.log(
      '   2. Verify Coolify "Make publicly available" is ON (if using public IP).',
    );
    console.log(
      '   3. Confirm "Port Mappings" (host:container) match what you use.',
    );
    console.log(
      "   4. From the server: docker exec -it <postgres-container> psql -U postgres\n",
    );

    return false;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
