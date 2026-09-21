#!/usr/bin/env bun
// scripts/monitor-realtime-connections.ts

import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Monitor real-time SSE connections and PostgreSQL LISTEN/NOTIFY activity
 *
 * This script helps you:
 * - See how many active SSE connections exist
 * - Monitor PostgreSQL notification activity
 * - Check trigger status
 * - View recent telegram thread updates
 *
 * Run with: bun run scripts/monitor-realtime-connections.ts
 */

interface ConnectionStats {
  activeConnections: number;
  listeningConnections: number;
  idleConnections: number;
  totalConnections: number;
}

interface TriggerStatus {
  triggerName: string;
  enabled: boolean;
  tableName: string;
}

interface RecentUpdate {
  chatId: string;
  patientId: string | null;
  updatedAt: Date;
  unreadCount: number;
  messageCount: number;
}

async function getConnectionStats(): Promise<ConnectionStats> {
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE query LIKE '%LISTEN telegram_threads_changes%') as listening_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) as total_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND application_name NOT LIKE '%pgAdmin%'
        AND pid != pg_backend_pid()
    `);

    const row = result.rows[0] as any;
    return {
      activeConnections: Number(row.active_connections) || 0,
      listeningConnections: Number(row.listening_connections) || 0,
      idleConnections: Number(row.idle_connections) || 0,
      totalConnections: Number(row.total_connections) || 0,
    };
  } catch (error) {
    console.error("Error getting connection stats:", error);
    return {
      activeConnections: 0,
      listeningConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
    };
  }
}

async function getTriggerStatus(): Promise<TriggerStatus[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        t.tgname as trigger_name,
        t.tgenabled = 'O' as enabled,
        c.relname as table_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgname LIKE '%telegram%'
        OR c.relname = 'telegram_threads'
      ORDER BY c.relname, t.tgname
    `);

    return result.rows.map((row: any) => ({
      triggerName: row.trigger_name,
      enabled: row.enabled === true,
      tableName: row.table_name,
    }));
  } catch (error) {
    console.error("Error getting trigger status:", error);
    return [];
  }
}

async function getRecentUpdates(limit: number = 10): Promise<RecentUpdate[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        chat_id,
        patient_id,
        updated_at,
        unread_count,
        jsonb_array_length(COALESCE(messages::jsonb, '[]'::jsonb)) as message_count
      FROM telegram_threads
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `);

    return result.rows.map((row: any) => ({
      chatId: row.chat_id,
      patientId: row.patient_id,
      updatedAt: new Date(row.updated_at),
      unreadCount: Number(row.unread_count) || 0,
      messageCount: Number(row.message_count) || 0,
    }));
  } catch (error) {
    console.error("Error getting recent updates:", error);
    return [];
  }
}

async function getActiveQueries(): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        pid,
        state,
        LEFT(query, 80) as query,
        now() - query_start as duration
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
        AND pid != pg_backend_pid()
        AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY query_start DESC
      LIMIT 5
    `);

    return result.rows.map((row: any) => {
      const duration = row.duration
        ? `${Math.floor(row.duration / 1000)}s`
        : "0s";
      return `[PID ${row.pid}] ${row.state} (${duration}): ${row.query}`;
    });
  } catch (error) {
    console.error("Error getting active queries:", error);
    return [];
  }
}

async function displayStats() {
  console.clear();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("    Real-Time Telegram Messaging - Connection Monitor");
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  // Connection Stats
  console.log("📊 DATABASE CONNECTION STATS");
  console.log("─────────────────────────────────────────────────────────");
  const stats = await getConnectionStats();
  console.log(`  Total Connections:     ${stats.totalConnections}`);
  console.log(`  Active Connections:    ${stats.activeConnections}`);
  console.log(`  🎧 SSE Listeners:      ${stats.listeningConnections} (LISTENING)`);
  console.log(`  Idle Connections:      ${stats.idleConnections}`);
  console.log();

  // Connection Health
  if (stats.listeningConnections > 0) {
    console.log(`  ✅ Real-time enabled: ${stats.listeningConnections} active listener(s)`);
  } else {
    console.log("  ⚠️  No active SSE listeners detected");
    console.log("     → No users currently viewing telegram messages");
  }
  console.log();

  // Trigger Status
  console.log("🔔 TRIGGER STATUS");
  console.log("─────────────────────────────────────────────────────────");
  const triggers = await getTriggerStatus();
  if (triggers.length > 0) {
    triggers.forEach((trigger) => {
      const status = trigger.enabled ? "✅ ENABLED " : "❌ DISABLED";
      console.log(`  ${status} - ${trigger.triggerName} on ${trigger.tableName}`);
    });
  } else {
    console.log("  ⚠️  No triggers found");
    console.log("     → Run: bun run db:realtime");
  }
  console.log();

  // Recent Updates
  console.log("📨 RECENT TELEGRAM THREAD UPDATES (Last 10)");
  console.log("─────────────────────────────────────────────────────────");
  const updates = await getRecentUpdates(10);
  if (updates.length > 0) {
    updates.forEach((update) => {
      const timeAgo = getTimeAgo(update.updatedAt);
      const patientInfo = update.patientId
        ? update.patientId.substring(0, 8)
        : "no patient";
      console.log(
        `  ${update.chatId} | ${patientInfo}... | ${update.messageCount} msgs | ${update.unreadCount} unread | ${timeAgo}`
      );
    });
  } else {
    console.log("  No telegram threads found");
  }
  console.log();

  // Active Queries
  console.log("⚡ ACTIVE DATABASE QUERIES");
  console.log("─────────────────────────────────────────────────────────");
  const queries = await getActiveQueries();
  if (queries.length > 0) {
    queries.forEach((query) => {
      console.log(`  ${query}`);
    });
  } else {
    console.log("  No active queries");
  }
  console.log();

  // Instructions
  console.log("─────────────────────────────────────────────────────────");
  console.log("💡 Tips:");
  console.log("  • SSE Listeners = Users viewing telegram messages");
  console.log("  • Each browser tab creates 1 connection");
  console.log("  • Connections auto-cleanup after 30s of inactivity");
  console.log();
  console.log("🧪 Test real-time updates:");
  console.log("  psql $DATABASE_URL -c \"UPDATE telegram_threads SET updated_at = NOW() WHERE chat_id = 'CHAT_ID';\"");
  console.log();
  console.log("Press Ctrl+C to exit");
  console.log("═══════════════════════════════════════════════════════════");
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function testNotification() {
  console.log("\n🧪 Testing LISTEN/NOTIFY...\n");

  try {
    // Get first thread
    const result = await db.execute(sql`
      SELECT id, chat_id FROM telegram_threads LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log("❌ No telegram threads found to test with");
      return;
    }

    const thread = result.rows[0] as any;
    console.log(`📨 Triggering update for chat_id: ${thread.chat_id}`);

    // Trigger an update
    await db.execute(sql`
      UPDATE telegram_threads
      SET updated_at = NOW()
      WHERE id = ${thread.id}
    `);

    console.log("✅ Update triggered successfully");
    console.log("   Check browser console for real-time update");
    console.log("   (If user is viewing this chat)");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Real-Time Connection Monitor

Usage:
  bun run scripts/monitor-realtime-connections.ts [options]

Options:
  --help, -h       Show this help message
  --watch, -w      Continuously monitor (refresh every 5s)
  --test           Trigger a test notification
  --once           Run once and exit (default)

Examples:
  # Show current stats
  bun run scripts/monitor-realtime-connections.ts

  # Watch continuously
  bun run scripts/monitor-realtime-connections.ts --watch

  # Test notifications
  bun run scripts/monitor-realtime-connections.ts --test
  `);
  process.exit(0);
}

// Main execution
(async () => {
  if (args.includes("--test")) {
    await testNotification();
    process.exit(0);
  }

  if (args.includes("--watch") || args.includes("-w")) {
    console.log("📊 Monitoring mode - refreshing every 5 seconds...\n");
    await displayStats();

    setInterval(async () => {
      await displayStats();
    }, 5000);
  } else {
    await displayStats();
    process.exit(0);
  }
})();
