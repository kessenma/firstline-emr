// apps/mobile/src/hooks/powersync/useSyncDataSummary.ts
// Reactive hook that queries local PowerSync DB for record counts of key clinical tables.
// Doctors can compare counts with colleagues to verify they have the same data.

import { useMemo } from 'react';
import { usePowerSyncQuery } from './usePowerSyncQuery';

export interface SyncDataCounts {
  patients: number;
  notes: number;
  rx_orders: number;
  med_orders: number;
  patient_media: number;
  missions: number;
  internal_messages: number;
  internal_message_threads: number;
  telegram_messages: number;
  telegram_threads: number;
  patient_care_team: number;
  users: number;
}

export interface SyncDataSummaryResult {
  counts: SyncDataCounts;
  isLoading: boolean;
}

// UNION ALL query to get all counts in a single reactive query.
// db.watch() will re-run this whenever any of the underlying tables change.
const COUNTS_SQL = `
  SELECT 'patients' as tbl, COUNT(*) as cnt FROM patients
  UNION ALL SELECT 'notes', COUNT(*) FROM notes
  UNION ALL SELECT 'rx_orders', COUNT(*) FROM rx_orders
  UNION ALL SELECT 'med_orders', COUNT(*) FROM med_orders
  UNION ALL SELECT 'patient_media', COUNT(*) FROM patient_media
  UNION ALL SELECT 'missions', COUNT(*) FROM missions
  UNION ALL SELECT 'internal_messages', COUNT(*) FROM internal_messages
  UNION ALL SELECT 'internal_message_threads', COUNT(*) FROM internal_message_threads
  UNION ALL SELECT 'telegram_messages', COUNT(*) FROM telegram_messages
  UNION ALL SELECT 'telegram_threads', COUNT(*) FROM telegram_threads
  UNION ALL SELECT 'patient_care_team', COUNT(*) FROM patient_care_team
  UNION ALL SELECT 'users', COUNT(*) FROM users
`;

const EMPTY_COUNTS: SyncDataCounts = {
  patients: 0,
  notes: 0,
  rx_orders: 0,
  med_orders: 0,
  patient_media: 0,
  missions: 0,
  internal_messages: 0,
  internal_message_threads: 0,
  telegram_messages: 0,
  telegram_threads: 0,
  patient_care_team: 0,
  users: 0,
};

export function useSyncDataSummary(): SyncDataSummaryResult {
  const { data, isLoading } = usePowerSyncQuery<{ tbl: string; cnt: number }>(COUNTS_SQL);

  const counts = useMemo(() => {
    if (!data || data.length === 0) return EMPTY_COUNTS;

    const result = { ...EMPTY_COUNTS };
    for (const row of data) {
      if (row.tbl in result) {
        (result as any)[row.tbl] = row.cnt;
      }
    }
    return result;
  }, [data]);

  return { counts, isLoading };
}
