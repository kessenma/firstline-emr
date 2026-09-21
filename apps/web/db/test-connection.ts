// db/test-connection.ts
import { config } from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";

// Load .env.local explicitly
const envPath = resolve(process.cwd(), ".env.local");
console.log(`📁 Loading environment from: ${envPath}\n`);
config({ path: envPath });

// Get connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables!");
  console.error("   Make sure .env.local exists in apps/web/");
  process.exit(1);
}

// Parse connection string for debugging
function parseConnectionString(connStr: string) {
  try {
    const url = new URL(connStr);
    return {
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.slice(1),
      user: url.username,
      ssl: url.searchParams.get("sslmode"),
    };
  } catch {
    return null;
  }
}

// Log connection details (without password)
const connDetails = parseConnectionString(connectionString);
if (connDetails) {
  console.log("🔍 Connection Details:");
  console.log(`   Host: ${connDetails.host}`);
  console.log(`   Port: ${connDetails.port}`);
  console.log(`   Database: ${connDetails.database}`);
  console.log(`   User: ${connDetails.user}`);
  console.log(`   SSL Mode: ${connDetails.ssl || "not specified"}`);
  console.log(
    `   Full URL: ${connectionString.replace(/:[^:@]+@/, ":****@")}\n`,
  );
}

// Create connection pool
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10000,
});

// Test connection
async function testConnection() {
  console.log("🔌 Testing PostgreSQL connection...\n");

  try {
    console.log("⏳ Attempting to connect...");
    const client = await pool.connect();
    console.log("✅ Connected! Running test query...");

    const result = await client.query(
      "SELECT NOW(), version(), current_database(), current_user",
    );
    client.release();

    console.log("\n✅ PostgreSQL connection successful!");
    console.log("\n📊 Server Info:");
    console.log(`   Current Time: ${result.rows[0].now}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Version: ${result.rows[0].version.split(",")[0]}`);
    console.log("\n🎉 Connection test passed!\n");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ PostgreSQL connection failed!\n");
    console.error("Error details:");
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);

    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    console.log("\n💡 Troubleshooting:");

    if (error.message.includes("timeout")) {
      console.log("   • Connection timeout - possible causes:");
      console.log("     - Firewall blocking the port");
      console.log("     - Server not accessible from your network");
      console.log("     - Wrong host or port");
      console.log("     - Database not running");
      console.log("\n   🔧 Try these:");
      console.log(`     nc -zv ${connDetails?.host} ${connDetails?.port}`);
      console.log(`     telnet ${connDetails?.host} ${connDetails?.port}`);
    } else if (error.message.includes("password")) {
      console.log("   • Authentication failed - check username/password");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("   • Host not found - check hostname/IP address");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("   • Connection refused - database may not be running");
    } else if (error.message.includes("ECONNRESET")) {
      console.log("   • Connection reset - possible SSL/TLS issue");
      console.log("   • Try changing sslmode to: disable, allow, prefer, or require");
    }

    console.log("\n🔧 Firewall check on server:");
    console.log("   sudo ufw status");
    console.log(`   sudo ufw allow ${connDetails?.port}/tcp`);
    console.log("   sudo ufw reload\n");

    await pool.end();
    process.exit(1);
  }
}

// Run test
testConnection();
