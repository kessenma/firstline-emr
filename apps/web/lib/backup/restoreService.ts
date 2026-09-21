// apps/web/lib/backup/restoreService.ts
// Core logic for restoring backup data into PostgreSQL.

import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { TABLE_COLUMN_MAPS, TABLE_RESTORE_ORDER } from "./columnMaps";
import type { ConflictStrategy, RestoreTableResult } from "@fajr/shared/admin";

const BATCH_SIZE = 100;

interface BackupData {
  version: number;
  tables: Record<
    string,
    {
      columns: string[];
      records: Record<string, any>[];
    }
  >;
}

interface RestoreOptions {
  backupData: BackupData;
  selectedTables: string[];
  conflictStrategy: ConflictStrategy;
  /** If true, TRUNCATE selected tables (reverse FK order) before inserting. */
  destructive?: boolean;
}

/**
 * Map a single record from PowerSync snake_case → Drizzle camelCase,
 * parsing JSON columns as needed.
 */
function mapRecord(
  record: Record<string, any>,
  tableName: string,
): Record<string, any> | null {
  const tableMap = TABLE_COLUMN_MAPS[tableName];
  if (!tableMap) return null;

  const mapped: Record<string, any> = {};

  for (const [psCol, value] of Object.entries(record)) {
    const drizzleCol = tableMap.columns[psCol];
    if (!drizzleCol) continue; // Column not in mapping — skip

    let finalValue = value;

    // Parse JSON text → object for json() columns
    if (
      tableMap.jsonColumns.includes(drizzleCol) &&
      typeof value === "string"
    ) {
      try {
        finalValue = JSON.parse(value);
      } catch {
        // Keep as-is if it's not valid JSON (might already be parsed or null)
      }
    }

    // Convert PowerSync integer booleans (0/1) to actual booleans
    if (typeof value === "number" && (value === 0 || value === 1)) {
      // Check if this looks like a boolean field
      const booleanPrefixes = [
        "is_",
        "has_",
        "draft",
        "submitted",
        "authorized",
        "read",
        "is_translated",
        "skip_edit_record",
        "email_sent",
        "credential_backed_up",
      ];
      const lowerPsCol = psCol.toLowerCase();
      if (booleanPrefixes.some((p) => lowerPsCol.startsWith(p) || lowerPsCol === p)) {
        finalValue = value === 1;
      }
    }

    // Handle null/undefined
    if (finalValue === undefined) {
      finalValue = null;
    }

    mapped[drizzleCol] = finalValue;
  }

  // Must have an id
  if (!mapped.id) return null;

  return mapped;
}

/**
 * Build the raw SQL for a batch upsert with the given conflict strategy.
 */
function buildUpsertSQL(
  tableName: string,
  records: Record<string, any>[],
  conflictStrategy: ConflictStrategy,
): { query: string; values: any[] } | null {
  if (records.length === 0) return null;

  // Use the actual DB table name (snake_case)
  const columns = Object.keys(records[0]);
  const colList = columns.map((c) => `"${camelToSnake(c)}"`).join(", ");

  // Build values placeholders
  const values: any[] = [];
  const rowPlaceholders: string[] = [];

  for (const record of records) {
    const placeholders: string[] = [];
    for (const col of columns) {
      values.push(record[col]);
      placeholders.push(`$${values.length}`);
    }
    rowPlaceholders.push(`(${placeholders.join(", ")})`);
  }

  let onConflict: string;
  switch (conflictStrategy) {
    case "skip":
      onConflict = "ON CONFLICT (id) DO NOTHING";
      break;
    case "overwrite": {
      const updateCols = columns
        .filter((c) => c !== "id")
        .map((c) => `"${camelToSnake(c)}" = EXCLUDED."${camelToSnake(c)}"`)
        .join(", ");
      onConflict = updateCols
        ? `ON CONFLICT (id) DO UPDATE SET ${updateCols}`
        : "ON CONFLICT (id) DO NOTHING";
      break;
    }
    case "newer_wins": {
      const updateCols = columns
        .filter((c) => c !== "id")
        .map((c) => `"${camelToSnake(c)}" = EXCLUDED."${camelToSnake(c)}"`)
        .join(", ");
      // Only update if backup record is newer (based on updated_at or created_at)
      const timeCol = columns.includes("updatedAt")
        ? "updated_at"
        : columns.includes("createdAt")
          ? "created_at"
          : null;
      if (updateCols && timeCol) {
        onConflict = `ON CONFLICT (id) DO UPDATE SET ${updateCols} WHERE EXCLUDED."${timeCol}" > "${tableName}"."${timeCol}"`;
      } else {
        onConflict = updateCols
          ? `ON CONFLICT (id) DO UPDATE SET ${updateCols}`
          : "ON CONFLICT (id) DO NOTHING";
      }
      break;
    }
  }

  const query = `INSERT INTO "${tableName}" (${colList}) VALUES ${rowPlaceholders.join(", ")} ${onConflict}`;

  return { query, values };
}

/** Convert camelCase to snake_case */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Restore a single table from backup data.
 */
async function restoreTable(
  tableName: string,
  tableData: { columns: string[]; records: Record<string, any>[] },
  conflictStrategy: ConflictStrategy,
): Promise<RestoreTableResult> {
  const result: RestoreTableResult = {
    tableName,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!tableData.records || tableData.records.length === 0) {
    return result;
  }

  // Map all records
  const mappedRecords: Record<string, any>[] = [];
  for (const record of tableData.records) {
    const mapped = mapRecord(record, tableName);
    if (mapped) {
      mappedRecords.push(mapped);
    } else {
      result.failed++;
      result.errors!.push(`Failed to map record (missing id or unknown table)`);
    }
  }

  // Process in batches
  for (let i = 0; i < mappedRecords.length; i += BATCH_SIZE) {
    const batch = mappedRecords.slice(i, i + BATCH_SIZE);

    try {
      const upsert = buildUpsertSQL(tableName, batch, conflictStrategy);
      if (!upsert) continue;

      // Parameterized: the query carries $1..$n placeholders, so it must go
      // through the pg driver directly — sql.raw() takes no bind values.
      const pgResult = await pool.query(upsert.query, upsert.values);

      // Approximate counts based on strategy
      // PostgreSQL doesn't easily distinguish inserts vs updates in ON CONFLICT
      const affected = pgResult.rowCount ?? 0;

      if (conflictStrategy === "skip") {
        result.inserted += affected;
        result.skipped += batch.length - affected;
      } else {
        // For overwrite/newer_wins, we count all affected as "updated" since we can't distinguish
        result.inserted += affected;
      }
    } catch (error: any) {
      // Per-batch failure — try individual records
      for (const record of batch) {
        try {
          const singleUpsert = buildUpsertSQL(
            tableName,
            [record],
            conflictStrategy,
          );
          if (singleUpsert) {
            await pool.query(singleUpsert.query, singleUpsert.values);
            result.inserted++;
          }
        } catch (recordError: any) {
          result.failed++;
          result.errors!.push(
            `Record ${record.id}: ${recordError.message?.slice(0, 200)}`,
          );
        }
      }
    }
  }

  return result;
}

/**
 * Restore selected tables from a backup, respecting FK dependency order.
 */
export async function executeRestore(
  options: RestoreOptions,
): Promise<RestoreTableResult[]> {
  const { backupData, selectedTables, conflictStrategy, destructive } = options;

  // If destructive mode, TRUNCATE selected tables in reverse FK order first
  if (destructive) {
    const reversedTables = [...TABLE_RESTORE_ORDER]
      .reverse()
      .filter((t) => selectedTables.includes(t));
    // Add any selected tables not in the order list
    for (const t of selectedTables) {
      if (!reversedTables.includes(t)) {
        reversedTables.unshift(t); // Truncate unknown tables first
      }
    }

    for (const tableName of reversedTables) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`));
      } catch (err: any) {
        console.warn(`Failed to truncate ${tableName}:`, err.message);
        // Continue — table might not exist or have other issues
      }
    }
  }

  // Sort selected tables by dependency order
  const orderedTables = TABLE_RESTORE_ORDER.filter((t) =>
    selectedTables.includes(t),
  );
  // Add any selected tables not in the order list (shouldn't happen, but safety)
  for (const t of selectedTables) {
    if (!orderedTables.includes(t)) {
      orderedTables.push(t);
    }
  }

  const results: RestoreTableResult[] = [];

  for (const tableName of orderedTables) {
    const tableData = backupData.tables[tableName];
    if (!tableData) {
      results.push({
        tableName,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: ["Table not found in backup data"],
      });
      continue;
    }

    try {
      const tableResult = await restoreTable(
        tableName,
        tableData,
        conflictStrategy,
      );
      results.push(tableResult);
    } catch (error: any) {
      results.push({
        tableName,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: tableData.records?.length || 0,
        errors: [`Table restore failed: ${error.message?.slice(0, 500)}`],
      });
    }
  }

  return results;
}
