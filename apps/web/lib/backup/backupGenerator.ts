// apps/web/lib/backup/backupGenerator.ts
// Server-side backup generator: queries PostgreSQL tables and packages as backup JSON.

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getReversedColumnMap, TABLE_COLUMN_MAPS } from "./columnMaps";
import type { BackupTableManifest, BackupMode } from "@fajr/shared/admin";

interface GenerateBackupResult {
  buffer: Buffer;
  manifest: BackupTableManifest[];
  totalRecords: number;
}

/**
 * Convert a Drizzle row (camelCase) to snake_case format matching mobile backups.
 * JSON columns are stringified so the format matches PowerSync text storage.
 */
function convertRowToSnakeCase(
  row: Record<string, any>,
  tableName: string,
): Record<string, any> | null {
  const reverseMap = getReversedColumnMap(tableName);
  if (!reverseMap) return null;

  const converted: Record<string, any> = {};
  for (const [camelCol, value] of Object.entries(row)) {
    const snakeCol = reverseMap.columns[camelCol];
    if (!snakeCol) continue;

    let finalValue = value;

    // Stringify JSON columns to match PowerSync text storage
    if (
      reverseMap.jsonColumns.includes(camelCol) &&
      value !== null &&
      typeof value === "object"
    ) {
      finalValue = JSON.stringify(value);
    }

    // Convert booleans to 0/1 to match PowerSync integer storage
    if (typeof value === "boolean") {
      finalValue = value ? 1 : 0;
    }

    // Convert dates to ISO strings
    if (value instanceof Date) {
      finalValue = value.toISOString();
    }

    converted[snakeCol] = finalValue;
  }

  return converted;
}

/**
 * Query the given tables and return their data in the shared snake_case backup
 * format, plus a manifest and total record count. Shared by the normal server
 * backup and the encrypted auth-credential bundle (passkeys/TOTP).
 */
export async function collectTablesData(selectedTables: string[]): Promise<{
  tablesData: Record<
    string,
    { columns: string[]; records: Record<string, any>[] }
  >;
  manifest: BackupTableManifest[];
  totalRecords: number;
}> {
  const tablesData: Record<
    string,
    { columns: string[]; records: Record<string, any>[] }
  > = {};
  const manifest: BackupTableManifest[] = [];
  let totalRecords = 0;

  for (const tableName of selectedTables) {
    const tableMap = TABLE_COLUMN_MAPS[tableName];
    if (!tableMap) {
      manifest.push({ tableName, recordCount: 0, columns: [] });
      continue;
    }

    try {
      // Query all rows from the table
      const rows = await db.execute(
        sql.raw(`SELECT * FROM "${tableName}"`),
      );

      const records: Record<string, any>[] = [];
      const rowArray = Array.isArray(rows) ? rows : (rows as any).rows || [];

      for (const row of rowArray) {
        const converted = convertRowToSnakeCase(
          row as Record<string, any>,
          tableName,
        );
        if (converted) {
          records.push(converted);
        }
      }

      // Get snake_case column names from the mapping
      const columns = Object.keys(tableMap.columns);

      tablesData[tableName] = { columns, records };
      manifest.push({ tableName, recordCount: records.length, columns });
      totalRecords += records.length;
    } catch (error: any) {
      console.error(`Failed to backup table ${tableName}:`, error.message);
      manifest.push({ tableName, recordCount: 0, columns: [] });
    }
  }

  return { tablesData, manifest, totalRecords };
}

/**
 * Generate a backup from the server's PostgreSQL database.
 * Output format matches mobile PowerSync backups exactly.
 */
export async function generateServerBackup(options: {
  selectedTables: string[];
  backupMode: BackupMode;
}): Promise<GenerateBackupResult> {
  const { tablesData, manifest, totalRecords } = await collectTablesData(
    options.selectedTables,
  );

  const payload = {
    version: 1,
    backupMode: options.backupMode,
    createdAt: new Date().toISOString(),
    deviceInfo: {
      platform: "server" as const,
      appVersion: "web",
    },
    tables: tablesData,
  };

  const buffer = Buffer.from(JSON.stringify(payload), "utf-8");

  return { buffer, manifest, totalRecords };
}
