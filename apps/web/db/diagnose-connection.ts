// db/diagnose-connection.ts
// Database connection diagnostic script

import { Pool } from 'pg';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color: keyof typeof COLORS, message: string) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testConnection(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  sslMode: string
) {
  const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;

  log('blue', `\n🔍 Testing: ${host}:${port} (SSL: ${sslMode})`);
  console.log(`   Database: ${database}`);
  console.log(`   User: ${user}`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000, // 5 second timeout
    max: 1,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');
    client.release();
    await pool.end();

    log('green', '✅ CONNECTION SUCCESSFUL!');
    console.log('\n📊 Database Info:');
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);

    return true;
  } catch (error: any) {
    await pool.end();
    log('red', '❌ Connection failed');
    console.log(`   Error: ${error.message}`);

    // Provide helpful hints based on error
    if (error.message.includes('timeout')) {
      console.log('   💡 Hint: Server not responding - check if:');
      console.log('      - Server is running');
      console.log('      - Port is correct');
      console.log('      - Firewall allows connections');
    } else if (error.message.includes('password')) {
      console.log('   💡 Hint: Authentication failed - check credentials');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   💡 Hint: Host not found - check hostname/IP');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Hint: Connection refused - check if PostgreSQL is running');
    }

    return false;
  }
}

async function testNetworkConnectivity(host: string, port: number) {
  log('blue', `\n🌐 Testing network connectivity to ${host}:${port}...`);

  try {
    const net = await import('net');

    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        log('red', '❌ Port is not reachable (timeout after 5s)');
        console.log('   💡 This usually means:');
        console.log('      - Port is blocked by firewall');
        console.log('      - Server is not listening on this port');
        console.log('      - Host is unreachable');
        resolve(false);
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        log('green', '✅ Port is reachable!');
        resolve(true);
      });

      socket.on('error', (error: any) => {
        clearTimeout(timeout);
        log('red', `❌ Network error: ${error.message}`);
        resolve(false);
      });

      socket.connect(port, host);
    });
  } catch (error: any) {
    log('red', `❌ Network test failed: ${error.message}`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('\n========================================');
  log('blue', '🔧 PostgreSQL Connection Diagnostics');
  console.log('========================================\n');

  // Credentials come from the environment — never hardcode them here.
  //   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=... pnpm tsx apps/web/db/diagnose-connection.ts
  const credentials = {
    host: process.env.PGHOST ?? 'localhost',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? '',
    database: process.env.PGDATABASE ?? 'postgres',
  };

  if (!credentials.password) {
    log('red', '❌ PGPASSWORD is not set. Export it before running diagnostics.');
    process.exit(1);
  }

  const testCases = [
    // Common PostgreSQL ports
    { port: 5432, sslMode: 'prefer', label: 'Standard PostgreSQL port with SSL' },
    { port: 5432, sslMode: 'disable', label: 'Standard PostgreSQL port without SSL' },
    { port: 1234, sslMode: 'allow', label: 'Custom port 1234 with SSL' },
    { port: 1234, sslMode: 'disable', label: 'Custom port 1234 without SSL' },
    { port: 5433, sslMode: 'prefer', label: 'Alternate port 5433' },
  ];

  // First, test network connectivity
  log('yellow', '\n📡 Phase 1: Network Connectivity Tests');
  log('yellow', '=====================================\n');

  await testNetworkConnectivity(credentials.host, 5432);
  await testNetworkConnectivity(credentials.host, 1234);
  await testNetworkConnectivity(credentials.host, 5433);

  // Then test database connections
  log('yellow', '\n📡 Phase 2: Database Connection Tests');
  log('yellow', '=====================================\n');

  let successfulConnection = false;

  for (const testCase of testCases) {
    const success = await testConnection(
      credentials.host,
      testCase.port,
      credentials.user,
      credentials.password,
      credentials.database,
      testCase.sslMode
    );

    if (success && !successfulConnection) {
      successfulConnection = true;
      log('green', '\n🎉 WORKING CONNECTION FOUND!');
      log('green', `   Use this in your .env.local:`);
      console.log(
        `   DATABASE_URL=postgres://${credentials.user}:${credentials.password}@${credentials.host}:${testCase.port}/${credentials.database}?sslmode=${testCase.sslMode}\n`
      );
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n========================================');
  if (successfulConnection) {
    log('green', '✅ Diagnostics Complete - Connection Working!');
  } else {
    log('red', '❌ Diagnostics Complete - No Working Connection Found');
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('   1. Verify the server IP address is correct');
    console.log('   2. Check if PostgreSQL is running on the server');
    console.log('   3. Verify firewall rules allow connections');
    console.log('   4. Check if the database requires VPN/SSH tunnel');
    console.log('   5. Confirm credentials are correct');
    console.log('   6. Check if database is on a managed service (Supabase, AWS RDS, etc.)');
    console.log('\n💡 Common Solutions:');
    console.log('   • If on cloud provider, check security groups/firewall rules');
    console.log('   • If behind VPN, connect to VPN first');
    console.log('   • If using SSH tunnel: ssh -L 5432:localhost:5432 user@server');
    console.log('   • Contact database administrator for correct connection details');
  }
  console.log('========================================\n');
}

// Run diagnostics
runDiagnostics().catch((error) => {
  log('red', `\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
