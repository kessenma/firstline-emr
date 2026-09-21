import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/db";

// Tables that are included in PowerSync sync rules
const SYNCED_TABLES = [
  "patients",
  "notes",
  "internal_message_threads",
  "internal_messages",
  "internal_message_thread_participants",
  "telegram_threads",
  "telegram_messages",
  "telegram_thread_participants",
  "user_messages",
  "patient_follow_ups",
  "med_orders",
  "rx_orders",
  "patient_media",
  "missions",
  "users",
  "admins",
  "user_settings",
  "admin_notifications",
  "user_profile_logs",
  "user_profile_update_requests",
  "patient_care_team",
  "care_team_conflicts",
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Query pg_stat_user_tables for estimated row counts and pg_total_relation_size for disk usage
      const placeholders = SYNCED_TABLES.map((_, i) => `$${i + 1}`).join(",");
      const result = await client.query(
        `SELECT
           s.relname AS name,
           s.n_live_tup AS row_count,
           pg_total_relation_size(quote_ident(s.relname)::regclass) AS disk_size_bytes,
           (SELECT COUNT(*) FROM information_schema.columns c
            WHERE c.table_name = s.relname AND c.table_schema = 'public') AS total_columns
         FROM pg_stat_user_tables s
         WHERE s.relname IN (${placeholders})
         ORDER BY pg_total_relation_size(quote_ident(s.relname)::regclass) DESC`,
        SYNCED_TABLES,
      );

      const tables = result.rows.map((row) => ({
        name: row.name,
        rowCount: Number(row.row_count),
        diskSizeBytes: Number(row.disk_size_bytes),
        totalColumns: Number(row.total_columns),
      }));

      const totalDiskBytes = tables.reduce((sum, t) => sum + t.diskSizeBytes, 0);
      const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);

      return NextResponse.json({
        tables,
        totalDiskBytes,
        totalRows,
        tableCount: tables.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Sync stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync stats" },
      { status: 500 },
    );
  }
}
